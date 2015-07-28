
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
from webserver.common.forum import deleteForumReflection, banForumUser

from webserver.models import User, Lab, AnalyticsProfile, TeamMembers
from tornado.ioloop import IOLoop
import tornado.websocket

#: Ping interval (ms)
PING_INTERVAL = datetime.timedelta(0,2)

class APISocketHandler(tornado.websocket.WebSocketHandler):
	"""
	API I/O Socket handler
	"""

	#: Public access to the list of open sessions
	SESSIONS = [ ]

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
		self.pingTimer = None
		self.userevents = None
		self.cronTimer = None

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
		return True
		#return bool(re.match(r'^.*?test4theory\.cern\.ch', origin))

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

		# Register a cron job for processing periodical events
		self.cronTimer = tornado.ioloop.PeriodicCallback( self.on_cron, 5000 )
		self.cronTimer.start()

		# Open interfaces
		for i in self.interfaces:
			i.open()

		# Register on open sessions
		APISocketHandler.SESSIONS.append( self )

		# Check for cron jobs now
		self.on_cron()

	def on_pong(self, msg):
		"""
		Got a ping reply
		"""

		# Validate pong message
		if msg != "io.keepalive":
			self.logger.warn("[%s] Got invalid PONG reply!", self.remote_ip)
			return

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

		# Unregister from open sessions
		i = APISocketHandler.SESSIONS.index( self )
		if i >= 0:
			del APISocketHandler.SESSIONS[i]

		# Stop cron timer
		if not self.cronTimer is None:
			self.cronTimer.stop()
			self.cronTimer = None

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
			if (action != "account.login") and (action != "account.register") and (action != "account.passwordReset"):
				self.sendError("The user was not logged in!")
				return

		# Check for parameters
		param = { }
		if 'param' in parsed:
			param = parsed['param']

		# Handle action
		self.handleAction( action, param )

	def on_cron(self):
		"""
		Fired periodically to update various information
		"""

		# Wait until we have a user object
		if not self.user:
			return

		# Check for changes
		self.user.checkForNAckJobs()
		self.user.checkForNewPMs()

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
		except:
			pass


	def sendError(self, message, code="", domain="global"):
		"""
		Shorthand to respond with an error
		"""

		# And log the error
		self.logger.warn("[%s] %s" % (self.remote_ip, message))

		# Send the error message
		try:
			self.write_message({
					"action": "error",
					"param": {
						"message": message,
						"code": code,
						"domain": domain
					}
				})
		except tornado.websocket.WebSocketClosedError as e:
			self.logger.warn("Sending on a closed socket!")

	def sendAction(self, action, param={}):
		"""
		Send a named action, with an optional data dictionary
		"""

		self.logger.info("Sending action %s" % action)
		self.logger.debug("Sending %s (%r)" % (action, param))

		# Send text frame to websocket
		try:
			self.write_message({
					"action": action,
					"param": param
				})
		except tornado.websocket.WebSocketClosedError as e:
			self.logger.warn("Sending on a closed socket!")

	def sendBuffer(self, frameID, data):
		"""
		Send a binary payload to the socket
		"""

		self.logger.debug("Sending binary frame  #%s (%s bytes)" % (frameID, len(data)))

		# Send a binary frame to WebSocket
		try:
			self.write_message( 
				# Header MUST be 64-bit aligned
				struct.pack("<II", frameID, 0)+data, 
				binary=True
			)
		except tornado.websocket.WebSocketClosedError as e:
			self.logger.warn("Sending on a closed socket!")

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

	def handleEvent(self, event):
		"""
		Handle the specified event
		"""

		# Check invalid event format
		if not 'type' in event:
			return

		# Handle server-side events
		if event['type'] == "server":

			# Check invalid event format
			if not 'event' in event:
				return

			# Handle profile change events
			if event['event'] == "profile.changed":
				self.sendUserProfile()

		else:
			# Otherwise pass to client
			self.sendEvent( event )

	def sendEvent(self, event):
		"""
		Forward the specified event to the user
		"""

		# If we don't even have a message, that's a non-visual event
		if not 'message' in event:

			# Trigger non-visual action
			self.sendAction("ui.command", event)

		else:

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

			# Send activation e-mail on old accounts
			if user.created is None:

				# Update created timestamp
				user.created = datetime.datetime.now()
				user.save()

				# Send activation e-mail
				HLUser.sendActivationMail( user, Config.BASE_URL + self.reverse_url("account.activate") )

			# Check if account is disabled
			if (user.status & User.STATUS_DISABLED) != 0:

				# Reply denial
				self.sendAction('account.login.response', {
						'status' : 'error',
						'message': "Your account has been disabled because the e-mail was not confirmed."
					})
				return

			# Check if account is not yet activated
			if (user.status & User.STATUS_ACTIVATED) == 0:

				# Calculate time delta
				delta = (datetime.datetime.now() - user.created).days

				# After 7 days, disable account
				if delta > 7:

					# First disable forum reflection for this user
					banForumUser(user)

					# Reply denial
					self.sendAction('account.login.response', {
							'status' : 'error',
							'message': "Your account has been disabled because the e-mail was not confirmed."
						})
					return

					# After 1 day, start warning
				elif delta > 1:

					# Send notification
					self.sendNotification("Please validate your e-mail address or your account will be deleted in %i day(s)!" % (7 - delta), 'alert')

			# Success
			self.user = HLUser(user)
			self.sendAction('account.login.response', {
					'status' : 'ok'
				})
			self.sendUserProfile()

			# Listen for user events
			self.user.receiveEvents( self.handleEvent )

			# Let all interface know that we are ready
			for i in self.interfaces:
				i.ready()

		elif action == "account.register":

			# Fetch user profile
			profile = param['profile']

			# Try to register user
			try:

				# Register and return user instance
				self.user = HLUser.register( profile, Config.BASE_URL + self.reverse_url("account.activate") )

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
			self.user.receiveEvents( self.handleEvent )

			# Let all interface know that we are ready
			for i in self.interfaces:
				i.ready()

		# Reset password
		elif action == "account.passwordReset":

			# Fetch user entry
			try:
				email = str(param['email']).lower()
				user = User.get(User.email == email)
			except User.DoesNotExist:
				self.sendAction('account.passwordReset.response', {
						'status' : 'error',
						'message': "A user with this e-mail does not exist!"
					})
				return

			# If 'pin' is missing, create new pin and send e-mail
			if not 'pin' in param:

				# Create a random pin if not already set
				pin = user.getState("passwordpin", "")
				if not pin:
					for i in range(0,6):
						pin += random.choice("01234567890")

					# Store pin in state record
					user.setState("passwordpin", pin)
					user.save()

					# Send password reset e-mail
					HLUser.sendPasswordResetMail( user, pin )

				# We are good
				self.sendAction('account.passwordReset.response', {
						'status' : 'ok'
					})

			else:

				# Validate pin
				v_pin = user.getState("passwordpin")
				if v_pin != param['pin']:
					self.sendAction('account.passwordReset.response', {
							'status' : 'error',
							'message': "The password reset pin is not valid!"
						})
					return

				# Update password
				user.password = hashlib.sha1("%s:%s" % (user.salt, param['password'])).hexdigest()
				user.setState("passwordpin", "")
				user.save()

				# Success
				self.user = HLUser(user)
				self.sendAction('account.passwordReset.response', {
						'status' : 'ok'
					})
				self.sendUserProfile()

				# Listen for user events
				self.user.receiveEvents( self.handleEvent )

				# Let all interface know that we are ready
				for i in self.interfaces:
					i.ready()

		# Handle logout
		elif action == "account.logout":

			# Disconnect user
			if self.user:
				self.user.cleanup()
				self.user = None

			# Fire callback
			self.sendAction('account.logout.response', {
					'status' : 'ok'
				})

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

			except TypeError as e:

				# Forward API Errors
				traceback.print_exc()
				return self.sendError("Wrong type of argument on request (%s)" % str(e), "wrong-argument")

			except APIError as e:

				# Forward API Errors
				return self.sendError(e.value, e.code)

			except Exception as e:

				# Burry exception
				traceback.print_exc()
				return self.sendError("Error processing request (%s)" % str(e), "unhandled-exception")

