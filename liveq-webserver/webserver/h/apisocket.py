
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

import re
import json
import datetime
import time
import struct
import uuid
import logging
import base64
import hashlib
import random
import traceback

from webserver.h.api import APIError
from webserver.h.api.chat import ChatInterface
from webserver.h.api.course import CourseInterface
from webserver.h.api.account import AccountInterface
from webserver.h.api.labsocket import LabSocketInterface
from webserver.h.api.labtrain import LabTrainInterface
from webserver.h.api.db import DatabaseInterface
from webserver.config import Config
from webserver.common.users import HLUser
from webserver.common.userevents import UserEvents

from webserver.models import User, Lab, AnalyticsProfile, TeamMembers
from tornado.ioloop import IOLoop
import tornado.websocket

#: Ping interval (ms)
PING_INTERVAL = datetime.timedelta(0,2)

#: Ping timeout (ms)
PING_TIMEOUT = datetime.timedelta(0,10)

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
		self.hl_user = None
		self.connected = False
		self.pingTimeout = None
		self.pingTimer = None
		self.userevents = None

		# Multiple API interfaces
		self.interfaces = [
			ChatInterface(self),
			CourseInterface(self),
			AccountInterface(self),
			LabSocketInterface(self),
			LabTrainInterface(self),
			DatabaseInterface(self)
		]

		# Open logger
		self.logger = logging.getLogger("api.socket")

	####################################################################################
	# --------------------------------------------------------------------------------
	#                             WEBSOCKET IMPLMEMENTATION
	# --------------------------------------------------------------------------------
	####################################################################################

	def check_origin(self, origin):
		"""
		Allow test4theory.cern.ch as domain 
		"""
		return bool(re.match(r'^.*?test4theory\.cern\.ch', origin))

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

		# Disconnect user
		if self.user:
			self.user.cleanup()
			self.user = None

		# We are no longer connected
		self.connected = False
		self.logger.info("[%s] Socket closed", self.remote_ip)

	def on_message(self, message):
		"""
		Message arrived on the socket
		"""

		# Process input parameters
		self.logger.debug("got message %r", message)
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

	def sendError(self, message, code="", domain="global"):
		"""
		Shorthand to respond with an error
		"""

		# Send the error message
		self.write_message({
				"action": "error",
				"param": {
					"message": message,
					"code": code,
					"domain": domain
				}
			})

		# And log the error
		self.logger.warn("[%s] %s" % (self.remote_ip, message))

	def sendAction(self, action, param={}):
		"""
		Send a named action, with an optional data dictionary
		"""

		self.logger.debug("Sending %s (%r)" % (action, param))

		# Send text frame to websocket
		self.write_message({
				"action": action,
				"param": param
			})

	def sendBuffer(self, frameID, data):
		"""
		Send a binary payload to the socket
		"""

		self.logger.debug("Sending binary frame  #%s (%s bytes)" % (frameID, len(data)))

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

		# Validate user
		if not self.user:
			return

		# Compile and send user profile
		self.sendAction('account.profile', self.user.getProfile())


	def sendNotification(self, message, msgType="info", title="", icon=""):
		"""
		Push a notification to the user
		"""

		# Send notification action
		self.sendAction("ui.notification", {
				"type": msgType,
				"title": title,
				"icon": icon,
				"message": message
			})

	def sendEvent(self, event):
		"""
		Forward the specified event to the user
		"""

		# If we don't even have a message, that's not for us
		if not 'message' in event:
			return

		# Extract parameters from the event and fire notification
		n_message = event['message']
		n_type = "info"
		n_title = ""
		n_icon = ""
		if 'type' in event:
			n_type = event['type']
		if 'title' in event:
			n_title = event['title']
		if 'icon' in event:
			n_icon = event['icon']

		# Send notification
		self.sendNotification( n_message, n_type, n_title, n_icon )

	def handleAction(self, action, param):
		"""
		Handle the specified incoming action from the javascript interface
		"""

		self.logger.info("Got action '%s' from user '%s'" % (action, str(self.user)))

		# Handle login
		if action == "account.login":

			# Fetch user entry
			try:
				email = str(param['email']).lower()
				user = User.get(User.email == email)
			except User.DoesNotExist:
				self.sendAction('account.login.response', {
						'status' : 'error',
						'message': "A user with this e-mail does not exist!"
					})
				return

			# Validate user password, hashed with a client-generated challenge
			if user.password != hashlib.sha1("%s:%s" % (user.salt, param['password'])).hexdigest():
				self.sendAction('account.login.response', {
						'status' : 'error',
						'message': "Password mismatch"
					})
				return

			# Success
			self.user = HLUser(user)
			self.sendAction('account.login.response', {
					'status' : 'ok'
				})
			self.sendUserProfile()

			# Listen for user events
			self.user.receiveEvents( self.sendEvent )

			# Let all interface know that we are ready
			for i in self.interfaces:
				i.ready()

		elif action == "account.register":

			# Fetch user profile
			profile = param['profile']

			# Try to register user
			try:

				# Register and return user instance
				self.user = HLUser.register( profile )

			except KeyError as e:

				# Check for existing user exceptions
				self.sendAction('account.register.response', {
						'status' : 'error',
						'message': "A user with this %s already exists!" % str(e)
					})
				return

			except Lab.DoesNotExist:

				# Lab does not exist? Configuration error
				self.sendError(
					'Server not configured properly: Missing default lab for the new user!', 
					'server-error'
				)
				return

			# Success
			self.sendAction('account.register.response', {
					'status' : 'ok'
				})
			self.sendUserProfile()

			# Listen for user events
			self.user.receiveEvents( self.sendEvent )

			# Let all interface know that we are ready
			for i in self.interfaces:
				i.ready()

		else:

			# Forward to API interfaces and catch APIError
			try:
				handled = False
				for i in self.interfaces:
					# Check if this action can be handled by this action domain
					if action[0:len(i.domain)+1] == "%s." % i.domain:
						# Handle action
						i.currentAction = action[len(i.domain)+1:]
						i.handleAction(i.currentAction, param)
						handled = True
						break

				# Not implemented
				if not handled:
					return self.sendError("Action '%s' is not implemented" % action)

			except KeyError as e:
				
				# Forward API Errors
				traceback.print_exc()
				return self.sendError("Missing argument %s on request" % str(e), "missing-argument")

			except APIError as e:

				# Forward API Errors
				return self.sendError(e.value, e.code)
