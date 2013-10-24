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

import logging
import threading
import tornado.escape
import tornado.web
import tornado.websocket
import os.path
import uuid

from beta.internal.bus import bus_handler, LiveQBus

from webserver.labsocket import LabSocketHandler
from webserver.config import Config

"""
LiveQ Bus connector
"""
class ServerBus():

	"""
	Setup server bus by binding on the expected
	incoming bus messages
	"""
	def __init__(self):

		# Open the data channel on the internal bus
		self.dataChannel = Config.IBUS.openChannel("data")

		# Open the job request channel on the internal bus
		self.jobChannel = Config.IBUS.openChannel("job")

		# Open the interpolation channel on the internal bus
		self.interpolateChannel = Config.IBUS.openChannel("interpolate")

		# 
	
	"""
	The user requested a tune with the given parameter set

	This function returns a inuqie tune ID that can be used to manage
	the started tune at a later time.
	"""
	def tune_begin(self, lab, parameters):

		# Try to contact the tune server 
		ans = self.request("tune_get", "tune_get_data", { "parameters": parameters, "lab": lab.id })

		# Try to contact interpolator
		result = self.interpolateChannel.send("interpolate", {
				"parameters": parameters,
				"lab": lab.id
			}, waitReply=True)

		# Check for errors
		if not ans:

			# We don't have a results database on the LiveQ bus
			# perform dry-run by contacting directly the job manager

	
	"""
	The user aborted a tune running on the given lab
	"""
	def tune_begin(self, lab, tuneid):
		pass

	"""
	Register a labSocket on the message bus
	"""
	def unregisterSocket(self, socket):
		pass

	"""
	Unregister a labSocket from the message bus
	"""
	def registerSocket(self, socket):
		pass

	@bus_handler("tune_data")
	def zmq_tuneData(self, data):
		pass

"""
Tornado Application class of the LiveQ Server
"""
class LiveQServer(tornado.web.Application):
	def __init__(self):

		# Create a global instance of the internal
		# message bus handler
		self.bus = ServerBus()

		# Setup handlers
		handlers = [
			(r"/", MainHandler),
			(r"/labsocket/(.*)", LabSocketHandler),
		]

		# Setup tornado settings
		settings = dict(
			cookie_secret="ckjbe3n3809713g7baf13n8vapjtd64xfkjgd",
			template_path=os.path.join(os.path.dirname(__file__), "templates"),
			static_path=os.path.join(os.path.dirname(__file__), "static"),
			xsrf_cookies=True,
		)

		# Setup tornado application
		tornado.web.Application.__init__(self, handlers, **settings)

"""
Root page handler
"""
class MainHandler(tornado.web.RequestHandler):
	def get(self):
		self.render("index.html")

