
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

import uuid
import logging

from liveq.models import Lab
from liveq.data.histo.intermediate import IntermediateHistogramCollection
from webserver.config import Config

import tornado.websocket

"""
I/O Socket handler
"""
class LabSocketHandler(tornado.websocket.WebSocketHandler):

    """
    Override constructor in order to initialize local variables
    """
    def __init__(self, application, request, **kwargs):
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

        # Open required bus channels
        self.ipolChannel = Config.IBUS.openChannel("interpolate")
        self.jobChannel = Config.IBUS.openChannel("jobs")
        self.dataChannel = Config.IBUS.openChannel("data-%s" % uuid.uuid4().hex, serve=True)

        # Bind events
        self.dataChannel.on('job_data', self.onBusData)
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

    """
    [Bus Event] Data available
    """
    def onBusData(self, data):
        self.logger.debug("Got DATA!")

        # Create a histogram collection from the data buffer
        histos = IntermediateHistogramCollection.fromPack( data['data'] )

        # Keep only the subset we are interested in
        histos = histos.subset( self.lab.getHistograms() )

        # Forward event to the user socket
        self.write_message({
                "action": "data",
                "data": histos.pack(),
                "info": { }
            })

    """
    [Bus Event] Simulation completed
    """
    def onBusCompleted(self, data):

        # Forward event to the user socket
        self.write_message({
                "action": "completed",
                "result": data['result'],
                "info": { }
            })

        # Reset tune
        self.jobid = None

    ####################################################################################
    # --------------------------------------------------------------------------------
    #                                 HELPER FUNCTIONS
    # --------------------------------------------------------------------------------
    ####################################################################################

    def sendBuffer(self, frameID, buffer):
        """
        Send a binary buffer to the websocket
        """

        # Send a binary frame to WebSocket
        self.write_message( chr(frameID) + data, binary=True)

    def sendAction(self, action, param={}):
        """
        Send a named action, with an optional data dictionary
        """

        # Send text frame to websocket
        self.write_message({
                "action": action,
                "param": data
            })

    def sendError(self, error):
        """
        Shorthand to respond with an error
        """

        # Send the error message
        self.write_message({
                "action": "error",
                "param": {
                    "error": error
                }
            })

        # And log the error
        self.logger.warn(error)

    def sendStatus(self, message):
        """
        Send a status message to the interface
        """

        # Send the status message
        self.write_message({
                "action": "status",
                "param": {
                    "message": message
                }
            })

    def abortJob(self):
        """
        Abort a previously running job
        """

        # Make sure we have a job
        if not self.jobid:
            return

        # Send status
        self.sendStatus("Aborting previous job")

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
        self.sendStatus("Job aborted")

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
            self.sendStatus("Contacting interpolator")

            # First ask interpolator
            ans = self.ipolChannel.send("interpolate", {            
                    'lab': self.lab.uuid,
                    'parameters': parsed['parameters']
                }, waitReply=True, timeout=5)

            # Check response
            if not ans:

                # Send status
                self.sendStatus("Could not contact interpolator")
                self.logger.warn("Could not contact interpolator")

            else:

                # Send status
                self.sendStatus("Processing interpolation")

                # Reply with interpolation data
                self.write_message({
                        "action": "data",
                        "data": ans['data'],
                        "info": { "interpolation": 1 }
                    })

                # Check if we found excact match
                if ans['excact']:

                    # Return data and abort further actions
                    self.write_message({
                            "action": "completed",
                            "result": 0,
                            "info": { "interpolation": 1 }
                        })

                    # Don't store any jobID
                    self.jobid = None

                    # And exit
                    return

            # Send status
            self.sendStatus("Contacting job manager")

            # Ask job manager to schedule a new job
            ans = self.jobChannel.send('job_start', {
                'lab': self.lab.uuid,
                'group': 'global',
                'dataChannel': self.dataChannel.name,
                'parameters': parsed['parameters']
            }, waitReply=True, timeout=5)

            # Check for I/O failure on the bus
            if not ans:
                return self.sendError("Unable to contact the job manager")

            # Check for error response
            if ans['result'] == 'error':
                return self.sendError("Unable to place a job request: %s" % ans['error'])

            # Send status
            self.sendStatus("Job #%s started" % ans['jid'])

            # The job started, save the tune job ID
            self.jobid = ans['jid']

        elif action == "sim_abort":

            # If we don't have a running tune, don't do anything
            if not self.jobid:
                return

            # Abort job
            self.abortJob()

        elif action == "handshake":

            # We have a handshake with the agent.
            # Fetch configuration and send configuration frame
            self.log

        else:

            # Unknown request
            self.sendError("Unknown action '%s' requested" % action )
