
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
        self.tuneid = None


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
        self.tuneid = None

        # Try to find a lab with the given ID
        self.lab = Lab.select().where(Lab.id == labid)
        if not self.lab:
            logging.error("Unable to locate lab with id '%s'" % labid)
            return

        # Register on the bus
        self.application.bus.registerSocket( self )

    """
    [Bus Event] Data available
    """
    def bus_data(self, data):

        # Forward event to the user socket
        self.write_message({
                "action": "data",
                "data": data.data,
                "info": data.info
            })

    """
    [Bus Event] Simulation completed
    """
    def bus_completed(self, data):

        # Forward event to the user socket
        self.write_message({
                "action": "completed",
                "result": data.result,
                "info": data.info
            })

    """
    Close socket
    """
    def on_close(self):
        logging.info("Socket closed")

        # If we have a running tune, abort it
        if self.tuneid:

            # Broadcast the request to the LiveQ bus
            self.application.bus.tune_abort( self.lab, self.tuneid )

        # Unregister from the bus
        self.application.bus.unregisterSocket( self )

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
        logging.warn("Trying to start a tune that is already running")

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

            # If we are already running a tune (tuneid is defined), send
            # an error. In principle the javascript user should take care
            # of stopping the request before
            if self.tuneid:
                return self.send_error("Trying to start a tune that is already running")

            # Make sure we have parameters when we start a tune
            if not 'parameters' in parsed:
                return self.send_error("Missing 'parameters' parameter from request")

            # Broadcast the request to the LiveQ bus and keep the tune ID
            # as a reference for future actions
            self.tuneid = self.application.bus.tune_begin( self.lab, parsed.parameters)

        elif action == "tune_abort":

            # If we don't have a running tune, raise an error
            if not self.tuneid:
                return self.send_error("Trying to abort an already completed tune")

            # Broadcast the request to the LiveQ bus
            self.application.bus.tune_abort( self.lab, self.tuneid )

            # Clear tune ID
            self.tuneid = None

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


