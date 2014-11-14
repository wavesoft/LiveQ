
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

from webserver.config import Config
import tornado.websocket

class CommunitySocketHandler(tornado.websocket.WebSocketHandler):
    """
    Community I/O Socket handler
    """

    def __init__(self, application, request, **kwargs):
        """
        Override constructor in order to initialize local variables
        """
        tornado.websocket.WebSocketHandler.__init__(self, application, request, **kwargs)

        # Initialize
        self.chatroom = None

        # Open logger
        self.logger = logging.getLogger("CommunitySocket")

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

    def open(self):
        """
        Community socket open
        """

        # Reset local variables
        self.chatroom = None

    def on_close(self):
        """
        Community Socket closed
        """
        self.logger.info("Socket closed")

    def on_message(self, message):
        """
        Message arrived on the socket
        """

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
    #                                 HELPER FUNCTIONS
    # --------------------------------------------------------------------------------
    ####################################################################################

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

    def sendAction(self, action, param={}):
        """
        Send a named action, with an optional data dictionary
        """

        # Send text frame to websocket
        self.write_message({
                "action": action,
                "param": param
            })

    def handleAction(self, action, param):
        """
        Handle the specified incoming action from the javascript interface
        """
        
        # Not implemented
        return self.sendError("Interface not implemented")
