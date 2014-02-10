
################################################################
# LiveQ - An interactive volunteering computing batch system
# Copyright (C) 2013 Ioannis Charalampidis
# 
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
# 
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
# 
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
################################################################

import struct
import uuid
import logging
import base64

import liveq.data.js as js
import liveq.data.histo.io as io

from liveq.models import Lab, Observables
from liveq.data.histo.intermediate import IntermediateHistogramCollection
from liveq.data.histo.interpolate import InterpolatableCollection

from webserver.common.minimacros import convertMiniMacros
from webserver.config import Config

import tornado.websocket

class LabSocketHandler(tornado.websocket.WebSocketHandler):
    """
    I/O Socket handler
    """

    def __init__(self, application, request, **kwargs):
        """
        Override constructor in order to initialize local variables
        """
        tornado.websocket.WebSocketHandler.__init__(self, application, request, **kwargs)

        # Setup local variables
        self.lab = None
        self.jobid = None

        # Open logger
        self.logger = logging.getLogger("LabSocket")

    ####################################################################################
    # --------------------------------------------------------------------------------
    #                             WEBSOCKET IMPLMEMENTATION
    # --------------------------------------------------------------------------------
    ####################################################################################

    def allow_draft76(self):
        """
        Hack for iOS 5.0 Safari
        """
        return True

    def open(self, labid):
        """
        Open socket

        After oppening the socket, we will try to find a lab tha matches the
        specified labID and then register on the message bus in order to receive
        the messages regarding this lab.
        """
        self.logger.info( "Lab socket '%s' requested" % labid )

        # Reset local variables
        self.job = None
        self.jobid = None
        self.dataChannel = None

        # Try to find a lab with the given ID
        try:
            self.lab = Lab.get(Lab.uuid == labid)
        except Lab.DoesNotExist:
            self.logger.error("Unable to locate lab with id '%s'" % labid)
            return self.sendError("Unable to find a lab with the given ID")

        # Create a histogram description instance for this lab
        self.histodesc = Config.HISTODESC.forLab( self.lab )

        # Open required bus channels
        self.ipolChannel = Config.IBUS.openChannel("interpolate")
        self.jobChannel = Config.IBUS.openChannel("jobs")
        self.dataChannel = Config.IBUS.openChannel("data-%s" % uuid.uuid4().hex, serve=True)

        # Bind events
        self.dataChannel.on('job_data', self.onBusData)
        self.dataChannel.on('job_status', self.onBusStatus)
        self.dataChannel.on('job_completed', self.onBusCompleted)

    def on_close(self):
        """
        Socket closed
        """
        self.logger.info("Socket closed")

        # If we have a running tune, cancel it
        if self.jobid:

            # Ask job manager to cancel the job
            ans = self.jobChannel.send('job_cancel', {
                'jid': self.jobid
            })

            # Clear job ID
            self.jobid = None

        # Unregister from the bus
        if self.dataChannel:

            # Disconnect and release data channel
            self.dataChannel.off('job_data', self.onBusData)
            self.dataChannel.off('job_completed', self.onBusCompleted)
            self.dataChannel.close()

            # Disconnect and release job channel
            self.jobChannel.close()
            self.jobChannel = None
            self.dataChannel = None

    def on_message(self, message):
        """
        Message arrived on the socket
        """

        # If socket is in invalid state, always respond with an error
        if not self.lab:
            return self.sendError("Unable to find a lab with the given ID")

        # Process input parameters
        self.logger.info("got message %r", message)
        parsed = tornado.escape.json_decode(message)

        # Check for valid message
        if not 'action' in parsed:
            return self.sendError("Missing 'action' parameter from request")
        action = parsed['action']

        # Check for parameters
        param = { }
        if 'param' in parsed:
            param = parsed['param']

        # Handle action
        self.handleAction( action, param )

    ####################################################################################
    # --------------------------------------------------------------------------------
    #                                BUS CALLBACK HANDLERS
    # --------------------------------------------------------------------------------
    ####################################################################################

    def onBusData(self, data):
        """
        [Bus Event] Data available
        """

        # If we have no job, ignore
        if not self.jobid:
            return

        # Create a histogram collection from the data buffer
        histos = IntermediateHistogramCollection.fromPack( data['data'] )

        # Keep only the subset we are interested in
        histos = histos.subset( self.lab.getHistograms() )

        # Pack them
        histoBuffers = []
        for k, h in histos.iteritems():
            # Pack buffers
            histoBuffers.append( js.packHistogram( h.toHistogram().normalize(copy=False) ) )

        # Compile buffer and send
        self.sendBuffer( 0x02, 
                struct.pack("<BBHI", 1, 0, 0, len(histoBuffers)) + ''.join(histoBuffers) # Prefix with length (64-bit aligned)
            )


    def onBusCompleted(self, data):
        """
        [Bus Event] Simulation completed
        """

        # If we have no job, ignore
        if not self.jobid:
            return

        # Forward event to the user socket
        self.sendAction( "sim_completed", { 'result': data['result'] } )

        # Reset tune
        self.jobid = None

    def onBusStatus(self, data):
        """
        [Bus Status] Forward bus message 
        """

        # If we have no job, ignore
        if not self.jobid:
            return

        # Extract parameters
        pMessage = ""
        if 'message' in data:
            pMessage = data['message']
        pVars = { }
        if 'vars' in data:
            pVars = data['vars']

        # Forward the status message
        self.sendStatus(pMessage, pVars)


    ####################################################################################
    # --------------------------------------------------------------------------------
    #                                 HELPER FUNCTIONS
    # --------------------------------------------------------------------------------
    ####################################################################################

    def sendBuffer(self, frameID, data):
        """
        Send a binary data to the websocket
        """

        # Send a binary frame to WebSocket
        self.write_message( 
            # Header MUST be 64-bit aligned
            struct.pack("<II", frameID, 0)+data, 
            binary=True
        )

    def sendAction(self, action, param={}):
        """
        Send a named action, with an optional data dictionary
        """

        # Send text frame to websocket
        self.write_message({
                "action": action,
                "param": param
            })

    def sendError(self, error):
        """
        Shorthand to respond with an error
        """

        # Send the error message
        self.write_message({
                "action": "error",
                "param": {
                    "message": error
                }
            })

        # And log the error
        self.logger.warn(error)

    def sendStatus(self, message, varMetrics={}):
        """
        Send a status message to the interface.

        Optionally you can send status variables that can be processed
        by the interface in the vars dict.
        """

        # Send the status message
        self.write_message({
                "action": "status",
                "param": {
                    "message": message,
                    "vars": varMetrics
                }
            })

    def sendConfigurationFrame(self):
        """
        Send the first, configuration frame to the agent
        """

        # Fetch description for the tunables
        data = []
        tunables = self.lab.getTunables()
        for n, t in tunables.iteritems():

            data.append({
                    'name': n,
                    'title': t.title,
                    'short': t.short,
                    'desc': convertMiniMacros(t.shortdesc),
                    'url': t.urldesc,
                    'tut': t.tutorial,
                    'type': t.type,
                    'def': t.default,
                    'min': t.min,
                    'max': t.max,
                    'dec': t.dec
                })

        # Pack tunables in buffer
        tunablesBuffer = js.packString(tornado.escape.json_encode(data))

        # Fetch descriptions for the histograms
        histo_ids = self.lab.getHistograms()
        histoBuffers = []
        for hid in histo_ids:

            # Fetch histogram information from file
            descRecord = self.histodesc.describeHistogram( hid )
            if not descRecord:
                self.sendError("Could not find description for histogram %s" % hid)
                return

            # Fetch user information from database
            try:

                # Fetch the matching observable record
                observableRecord = Observables.get(
                    (Observables.name==hid) &
                    (Observables.energy==descRecord['energy']) &
                    (Observables.beam==descRecord['beam']) &
                    (Observables.process==descRecord['process'])
                    )

                # Append extra fields
                descRecord['title'] = str(observableRecord.title)
                descRecord['short'] = str(observableRecord.short)
                descRecord['shortdesc'] = str(observableRecord.shortdesc)
                descRecord['leftdesc'] = str(observableRecord.leftDesc)
                descRecord['rightdesc'] = str(observableRecord.rightDesc)

            except Observables.DoesNotExist:
                self.sendError("Could not find assisting information for histogram %s (e=%s, b=%s, p=%s)" % (hid, descRecord['energy'], descRecord['beam'], descRecord['process']))
                return

            print descRecord

            # Compile to buffer and store on histoBuffers array
            histoBuffers.append( js.packDescription(descRecord) )

        # Compile buffer and send
        self.sendBuffer( 0x01, 
                # Header must be 64-bit aligned
                struct.pack("<BBHI", 1, 0, 0, len(histoBuffers)) + tunablesBuffer + ''.join(histoBuffers)
            )


    def abortJob(self):
        """
        Abort a previously running job
        """

        # Make sure we have a job
        if not self.jobid:
            return

        # Send status
        self.sendStatus("Aborting previous job", {"JOB_STATUS": "aborting"})

        # Ask job manager to cancel a job
        ans = self.jobChannel.send('job_cancel', {
            'jid': self.jobid
        }, waitReply=True)

        # Check for I/O failure on the bus
        if not ans:
            return self.sendError("Unable to contact the job manager")

        # Check for error response
        if ans['result'] == 'error':
            return self.sendError("Unable to cancel job: %s" % ans['error'])

        # Send status
        self.sendStatus("Job aborted", {"JOB_STATUS": "aborted"})

        # Clear job ID
        self.jobid = None

    def handleAction(self, action, param):
        """
        Handle the specified incoming action from the javascript interface
        """

        # Process actions
        if action == "sim_start":

            # If we are already running a tune (jobid is defined), cancel and restart
            self.abortJob()

            # Send status
            self.sendStatus("Contacting interpolator", {"JOB_STATUS": "interpolating"})

            # Format user tunables
            tunables = self.lab.formatTunables( param )

            # First ask interpolator
            ans = self.ipolChannel.send("interpolate", {            
                    'lab': self.lab.uuid,
                    'parameters': tunables,
                    'histograms': self.lab.getHistograms()
                }, waitReply=True, timeout=5)

            # Check response
            if not ans:

                # Send status
                self.sendStatus("Could not contact interpolator", {"INTERPOLATION": "0"})
                self.logger.warn("Could not contact interpolator")

            elif ans['result'] != 'ok':

                # Send error
                self.sendStatus("Could not interpolate (%s)" % ans['error'])
                self.logger.warn("Could not interpolate (%s)" % ans['error'])

            else:

                # Send status
                self.sendStatus("Processing interpolation")

                # Fetch InterpolatableCollection from data
                print ">> Incoming ipol data: %s" % ans['data']
                histos = InterpolatableCollection.fromPack( ans['data'] )

                # Re-generate histogram from coefficients
                histos.regenHistograms()

                # Pack histograms
                histoBuffers = []
                for h in histos.values():
                    # Pack buffers
                    histoBuffers.append( js.packHistogram(h) )

                # Compile buffer and send
                self.sendBuffer( 0x02, 
                        # Set interpolate flag on the frame
                        struct.pack("<BBHI", 1, 1, 0, len(histoBuffers)) + ''.join(histoBuffers) # Prefix with length (64-bit aligned)
                    )

                # Send status message
                self.sendStatus("Got interpolated results", {"INTERPOLATION": "1"})

                # Check if we found excact match
                if ans['exact']:

                    # Let interface know that this is the real answer
                    self.sendAction( "sim_completed", { 'result': data['result'] } )

                    # Don't store any jobID
                    self.jobid = None

                    # And exit
                    return

            # Send status
            self.sendStatus("Contacting job manager", {"JOB_STATUS": "starting"})

            # Ask job manager to schedule a new job
            ans = self.jobChannel.send('job_start', {
                'lab': self.lab.uuid,
                'group': 'global',
                'dataChannel': self.dataChannel.name,
                'parameters': tunables
            }, waitReply=True, timeout=5)

            # Check for I/O failure on the bus
            if not ans:
                return self.sendError("Unable to contact the job manager")

            # Check for error response
            if ans['result'] == 'error':
                return self.sendError("Unable to place a job request: %s" % ans['error'])

            # Send status
            self.sendStatus("Job #%s started" % ans['jid'], {"JOB_STATUS": "started"})

            # The job started, save the tune job ID
            self.jobid = ans['jid']

        elif action == "sim_abort":

            # If we don't have a running tune, don't do anything
            if not self.jobid:
                return

            # Abort job
            self.abortJob()

        elif action == "handshake":

            # Get client API version
            self.cversion = "0.1a"
            if 'version' in param:
                self.cversion = param['version']

            # We have a handshake with the agent.
            # Fetch configuration and send configuration frame
            self.logger.info("Handshake with client API v%s" % self.cversion)

            # Send configuration frame
            self.sendConfigurationFrame()

        elif action == "ping":

            # Reply to ping/pong requests, using for keeping the websocket
            # connection alive through Varnish
            self.sendAction("pong")

        else:

            # Unknown request
            self.sendError("Unknown action '%s' requested" % action )
