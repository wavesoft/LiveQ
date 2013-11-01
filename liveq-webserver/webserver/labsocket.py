
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

#from ??? import LabDatabase
import uuid
import logging

from liveq.models import Lab
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


    """
    Hack for iOS 5.0 Safari
    """
    def allow_draft76(self):
        return True

    """
    Open socket

    After oppening the socket, we will try to find a lab tha matches the
    specified labID and then register on the message bus in order to receive
    the messages regarding this lab.
    """
    def open(self, labid):
        logging.info( "Lab socket '%s' requested" % labid )

        # Reset local variables
        self.job = None
        self.jobid = None
        self.dataChannel = None

        # Try to find a lab with the given ID
        try:
            self.lab = Lab.get(Lab.uuid == labid)
        except Lab.DoesNotExist:
            logging.error("Unable to locate lab with id '%s'" % labid)
            return self.send_error("Unable to find a lab with the given ID")

        # Open required bus channels
        self.jobChannel = Config.IBUS.openChannel("jobs")
        self.dataChannel = Config.IBUS.openChannel("data-%s" % uuid.uuid4().hex, serve=True)

        # Bind events
        self.dataChannel.on('job_data', self.onBusData)
        self.dataChannel.on('job_completed', self.onBusCompleted)

    """
    [Bus Event] Data available
    """
    def onBusData(self, data):
        logging.debug("Got DATA!")

        # Forward event to the user socket
        self.write_message({
                "action": "data",
                "data": data['data'],
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

    """
    Close socket
    """
    def on_close(self):
        logging.info("Socket closed")

        # If we have a running tune, cancel it
        if self.jobid:

            # Ask job manager to cancel the job
            ans = self.jobChannel.send('job_cancel', {
                'jid': self.jobid
            })

        # Unregister from the bus
        if self.dataChannel:
            self.dataChannel.off('job_data', self.onBusData)
            self.dataChannel.off('job_completed', self.onBusCompleted)
            self.dataChannel.close()
            self.jobChannel.close()
            self.jobChannel = None
            self.dataChannel = None

    """
    Shorthand to respond with an error
    """
    def send_error(self, error):

        # Send the error message
        msg = {
            "action": "error",
            "error": error
        }
        self.write_message(msg)

        # Also log the error
        logging.warn(error)

    """
    Message arrived
    """
    def on_message(self, message):

        # If socket is in invalid state, always respond with an error
        if not self.lab:
            return self.send_error("Unable to find a lab with the given ID")

        # Process input parameters
        logging.info("got message %r", message)
        parsed = tornado.escape.json_decode(message)

        # Check for valid message
        if not 'action' in parsed:
            return self.send_error("Missing 'action' parameter from request")
        action = parsed['action']


        # Process actions
        if action == "tune_begin":

            # If we are already running a tune (jobid is defined), send
            # an error. In principle the javascript user should take care
            # of stopping the request before
            if self.jobid:
                return self.send_error("Trying to start a tune that is already running")

            # Make sure we have parameters when we start a tune
            if not 'parameters' in parsed:
                return self.send_error("Missing 'parameters' parameter from request")

            # TODO: First ask interpolator

            # Ask job manager to schedule a new job
            ans = self.jobChannel.send('job_start', {
                'lab': self.lab.uuid,
                'group': 'c678c82dd5c74f00b95be0fb6174c01b',
                'dataChannel': self.dataChannel.name,
                'parameters': {
                    # Only the tune is interesting for the user
                    "tune": parsed['parameters']
                }
            }, waitReply=True, timeout=5)

            # Check for I/O failure on the bus
            if not ans:
                return self.send_error("Unable to contact the job manager")

            # Check for error response
            if ans['result'] == 'error':
                return self.send_error("Unable to place a job request: %s" % ans['error'])

            # The job started, save the tune job ID
            self.jobid = ans['jid']

        elif action == "tune_cancel":

            # If we don't have a running tune, raise an error
            if not self.jobid:
                return self.send_error("Trying to cancel an already completed tune")

            # Ask job manager to cancel a job
            ans = self.jobChannel.send('job_cancel', {
                'jid': self.jobid
            }, waitReply=True)

            # Check for I/O failure on the bus
            if not ans:
                return self.send_error("Unable to contact the job manager")

            # Check for error response
            if ans['result'] == 'error':
                return self.send_error("Unable to cancel job: %s" % ans['error'])

            # Clear tune ID
            self.jobid = None

        elif action == "configuration":

            # Dummy message handler
            self.write_message({
                    "action": "configuration",
                    "histograms": [
                        {
                            "histogram": {
                                "name": "Test"
                            },
                            "reference": [ ]
                        }
                    ],
                    "layout": { }
                })

        else:

            # Unknown request
            self.send_error("Unknown action '%s' specified" % action )


