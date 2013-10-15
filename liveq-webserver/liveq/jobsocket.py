
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

import tornado.websocket

"""
I/O Socket handler
"""
class IOSocketHandler(tornado.websocket.WebSocketHandler):

    # Connection to a job that is running on the infrastructure
    job = None

    """
    Hack for iOS 5.0 Safari
    """
    def allow_draft76(self):
        return True

    """
    Open socket
    """
    def open(self):
        logging.info("New person entered")
        IOSocketHandler.waiters.add(self)

    """
    Close socket
    """
    def on_close(self):
        logging.info("Person left")
        IOSocketHandler.waiters.remove(self)

    """
    Output functions
    """
    def send_error(self, error):
        msg = {
            "result": "error",
            "error": error
        }
        self.write_message(msg)

    """
    Message arrived
    """
    def on_message(self, message):
        logging.info("got message %r", message)
        parsed = tornado.escape.json_decode(message)

        # Check for valid message
        if not 'action' in parsed:
            logging.warn("Missing action from request message")
            return self.send_error("Missing action parameters from request")
        action = parsed['action']

        # If we don't have a job binding do nothing until we get a job
        # link request
        if (self.job == None):
            if action != "join":
                return self.send_error("Expecting join request")

            # We have a join request

        chat = {
            "id": str(uuid.uuid4()),
            "body": parsed["body"],
            }
        chat["html"] = tornado.escape.to_basestring(
            self.render_string("message.html", message=chat))

        IOSocketHandler.update_cache(chat)
        IOSocketHandler.send_updates(chat)

    @classmethod
    def update_cache(cls, chat):
        cls.cache.append(chat)
        if len(cls.cache) > cls.cache_size:
            cls.cache = cls.cache[-cls.cache_size:]

    @classmethod
    def send_updates(cls, chat):
        logging.info("sending message to %d waiters", len(cls.waiters))
        for waiter in cls.waiters:
            try:
                waiter.write_message(chat)
            except:
                logging.error("Error sending message", exc_info=True)


