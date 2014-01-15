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
import tornado.websocket

from dashboard.config import Config

"""
I/O Socket handler
"""
class DashboardSocket(tornado.websocket.WebSocketHandler):

    """
    Override constructor in order to initialize local variables
    """
    def __init__(self, application, request, **kwargs):
        tornado.websocket.WebSocketHandler.__init__(self, application, request, **kwargs)

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
    def open(self):
        logging.info( "Socket oppened" )

    """
    Close socket
    """
    def on_close(self):
        logging.info( "Socket closed" )

    """
    Message arrived
    """
    def on_message(self, message):
        logging.info("got message %r", message)


