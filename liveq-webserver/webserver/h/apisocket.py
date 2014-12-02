
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

import json
import datetime
import time
import struct
import uuid
import logging
import base64

from webserver.h.api.chat import ChatInterface
from webserver.h.api.course import CourseInterface
from webserver.h.api.account import AccountInterface
from webserver.h.api.labsocket import LabSocketInterface
from webserver.h.api.labtrain import LabTrainInterface

from liveq.models import User
from webserver.config import Config
from tornado.ioloop import IOLoop
import tornado.websocket

#: Ping interval (ms)
PING_INTERVAL = datetime.timedelta(0,2)

#: Ping timeout (ms)
PING_TIMEOUT = datetime.timedelta(0,1)

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
		self.remote_ip = ""
		self.user = None
		self.connected = False
		self.pingTimeout = None
		self.pingTimer = None

		# Multiple API interfaces
		self.interfaces = [
			ChatInterface(self),
			CourseInterface(self),
			AccountInterface(self),
			LabSocketInterface(self),
			LabTrainInterface(self),
		]

		# Open logger
		self.logger = logging.getLogger("api.socket")

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
		Real-Time API socket open
		"""

		# Get user ID
		self.remote_ip = self.request.remote_ip
		self.logger.info("[%s] Socket open", self.remote_ip)

		# We are connected
		self.connected = True

		# Start ping timer
		self.pingTimer = IOLoop.instance().add_timeout(PING_INTERVAL, self.scheduledPing)

		# Open interfaces
		for i in self.interfaces:
			i.open()

	def on_pong(self, msg):
		"""
		Got a ping reply
		"""

		# Validate pong message
		if msg != "io.keepalive":
			self.logger.warn("[%s] Got invalid PONG reply!", self.remote_ip)
			return

		# Remove the timeout timer
		if self.pingTimeout:
			IOLoop.instance().remove_timeout(self.pingTimeout)

		# Schedule next ping
		self.pingTimer = IOLoop.instance().add_timeout(PING_INTERVAL, self.scheduledPing)        

	def on_close(self):
		"""
		Real-Time API Socket closed
		"""

		# Remove the scheduledPing timer
		if self.pingTimer:
			IOLoop.instance().remove_timeout(self.pingTimer)

		# Close interfaces
		for i in self.interfaces:
			i.isOpen = False
			i.close()

		# We are no longer connected
		self.connected = False
		self.logger.info("[%s] Socket closed", self.remote_ip)

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

		# Handle keepalive messages
		if action == "io.keepalive":
			self.sendAction("io.keepalive", {})
			return

		# If the action is not 'login' and we don't have a user, 
		# conider this invalid
		if not self.user:
			if (action != "account.login") and (action != "account.register"):
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
	#                                 HELPER FUNCTIONS
	# --------------------------------------------------------------------------------
	####################################################################################

	def scheduledPing(self):
		"""
		Send a ping and schedule a timeout
		"""

		# If we are not connected, exit
		if not self.connected:
			return

		# Send a ping request
		try:
			self.ping("io.keepalive")

			# Schedule a timeout timer
			self.pingTimeout = IOLoop.instance().add_timeout(PING_TIMEOUT, self.pingTimeoutCallback)
			self.pingTimer = None

		except:
			pass


	def pingTimeoutCallback(self):
		"""
		The socket timed out
		"""

		# Timeout while waiting for pong
		self.logger.warn("[%s] Socket connection timeout", self.remote_ip)

		# Close
		self.close()

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
		self.logger.warn("[%s] %s" % (self.remote_ip, error))

	def sendAction(self, action, param={}):
		"""
		Send a named action, with an optional data dictionary
		"""

		self.logger.info("Sending %s (%r)" % (action, param))

		# Send text frame to websocket
		self.write_message({
				"action": action,
				"param": param
			})

	def sendBuffer(self, frameID, data):
		"""
		Send a binary payload to the socket
		"""

		self.logger.info("Sending binary frame  #%s (%s bytes)" % (frameID, len(data)))

		# Send a binary frame to WebSocket
		self.write_message( 
			# Header MUST be 64-bit aligned
			struct.pack("<II", frameID, 0)+data, 
			binary=True
		)

	def sendUserProfile(self):
		"""
		Send user profile information
		"""

		# Shorthand to user
		user = self.user
		if not user:
			return

		# Send user profile
		self.sendAction('account.profile', {
				'username' 		: user.username,
				'gender' 		: user.gender,
				'birthdate'		: user.birthdate,
				'email' 		: user.email,
				'collectStats'	: user.collectStats,
				'displayName' 	: user.displayName,
				'avatar' 		: user.avatar,
				'credits'		: user.credits,
				'vars' 			: json.loads(user.variables)
			})

	def handleAction(self, action, param):
		"""
		Handle the specified incoming action from the javascript interface
		"""

		self.logger.info("Got action '%s' from user '%s'" % (action, str(self.user)))

		# Handle login
		if action == "account.login":

			# Fetch user entry
			try:
				userName = str(param['username']).lower()
				user = User.get(User.username == userName)
			except User.DoesNotExist:
				self.sendAction('account.login.response', {
						'status' : 'error',
						'message': "User does not exist"
					})
				return

			# Validate user password
			if user.password != param['password']:
				self.sendAction('account.login.response', {
						'status' : 'error',
						'message': "Password mismatch"
					})
				return

			# Success
			self.user = user
			self.sendAction('account.login.response', {
					'status' : 'ok'
				})
			self.sendUserProfile()

			# Let all interface know that we are ready
			for i in self.interfaces:
				i.ready()

		elif action == "account.register":

			# Fetch user profile
			profile = param['profile']
			userName = str(profile['username']).lower()

			# Check if such user exist
			try:
				user = User.get(User.username == userName)
				self.sendAction('account.register.response', {
						'status' : 'error',
						'message': "A user with this name already exists!"
					})
				return
			except User.DoesNotExist:
				pass

			# Create new user
			user = User.create(
				username=userName,
				password=profile['password'],
				gender=profile['gender'],
				email=profile['email'],
				birthdate=profile['birthdate'],
				avatar=profile['avatar'],
				collectStats=profile['research'],
				displayName=profile['displayName'],
				variables="{}"
				)
			user.save()

			# Success
			self.user = user
			self.sendAction('account.register.response', {
					'status' : 'ok'
				})
			self.sendUserProfile()

			# Let all interface know that we are ready
			for i in self.interfaces:
				i.ready()

		else:

			# Forward to API interfaces
			handled = False
			for i in self.interfaces:
				# Check if this action can be handled by this action domain
				if action[0:len(i.domain)+1] == "%s." % i.domain:
					# Handle action
					i.handleAction(action[len(i.domain)+1:], param)
					handled = True
					break

			# Not implemented
			if not handled:
				return self.sendError("Action '%s' is not implemented" % action)
