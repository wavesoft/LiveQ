
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

from liveq.models import User
from webserver.config import Config
import tornado.websocket

class APISocketHandler(tornado.websocket.WebSocketHandler):
    """
    API I/O Socket handler
    """

    def __init__(self, application, request, **kwargs):
        """
        Override constructor in order to initialize local variables
        """
        tornado.websocket.WebSocketHandler.__init__(self, application, request, **kwargs)

        # Initialize
        self.chatroom = None
        self.user = None

        # Open logger
        self.logger = logging.getLogger("APISocket")

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

        # Get user ID
        self.logger.info("Socket open")

        # Reset local variables
        self.chatroom = None

    def on_close(self):
        """
        Community Socket closed
        """

        self.leaveChatroom()
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

        # If the action is not 'login' and we don't have a user, 
        # conider this invalid
        if not self.user:
            if action != "user.login":
                self.sendError("The user was not logged in!")
                return

        # Check for parameters
        param = { }
        if 'param' in parsed:
            param = parsed['param']

        # Handle action
        self.handleAction( action, param )

    ####################################################################################
    # --------------------------------------------------------------------------------
    #                                 CHATROOM CALLBACKS
    # --------------------------------------------------------------------------------
    ####################################################################################

    def onChatroomEnter(self, data):
        """
        User joined the chartroom
        """

        # Validate data
        if not 'user' in data:
            return

        # Send notification for user joining the chatroom
        self.sendAction("chatroom.join", { "user": data['user'] })

    def onChatroomLeave(self, data):
        """
        User left the chartroom
        """

        # Validate data
        if not 'user' in data:
            return

        # Remove user from chatroom
        key = "chatroom.%s" % self.chatroom.name
        Config.STORE.sadd(key, data['user'])

        # Send notification for user joining the chatroom
        self.sendAction("chatroom.leave", { "user": data['user'] })

    def onChatroomChat(self, data):
        """
        User said something on the chatroom
        """

        # Validate data
        if not 'user' in data:
            return

        # Send notification for user joining the chatroom
        self.sendAction("chatroom.chat", { "user": data['user'], "message": data['message'] })

    ####################################################################################
    # --------------------------------------------------------------------------------
    #                                 HELPER FUNCTIONS
    # --------------------------------------------------------------------------------
    ####################################################################################

    def leaveChatroom(self):
        """
        Leave previous chatroom
        """

        # Leave previous chatroom
        if self.chatroom != None:
            # Leave channel
            self.chatroom.send('chatroom.leave', {'user':self.user.username})
            # Close channel
            self.chatroom.close()
            # Reset variable
            self.chatroom = None

    def selectChatroom(self, name):
        """
        Join a particular chatroom
        """

        # Leave previous chatroom
        self.leaveChatroom()

        # Join chatroom
        self.chatroom = Config.IBUS.openChannel("chatroom.%s" % name)

        # Add user in chatroom
        key = "chatroom.%s" % self.chatroom.username
        Config.STORE.sadd(key, data['user'])

        # Get users in the channel
        roomUsers = list(key, Config.STORE.smembers())

        # Bind events
        self.chatroom.on('chatroom.enter', self.onChatroomEnter)
        self.chatroom.on('chatroom.leave', self.onChatroomLeave)
        self.chatroom.on('chatroom.chat', self.onChatroomChat)

        # Send presence
        self.sendAction("chatroom.presence", { 'users': roomUsers })

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

        self.logger.info("Got action '%s' from user '%s'" % (action, str(self.user)))

        # Handle login
        if action == "user.login":
            self.user = User.get(User.username == param['user'])

        # Select the chatroom to join
        elif action == "chatroom.select":

            # Join the specified chatroom
            self.selectChatroom( param['chatroom'] )

        elif action == "chatroom.chat":
            # Send message to active chatroom
            if self.chatroom != None:
                self.chatroom.send("chatroom.chat", { 'user': self.user.username })

        # Not implemented
        return self.sendError("Interface not implemented")
