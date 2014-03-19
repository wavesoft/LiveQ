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

from agent.config import Config
from liveq.classes.bus.xmppmsg import XMPPBus

import Queue
import threading
import random
import logging
import time

class JobManagers:
	"""
	Job managers
	"""

	def __init__(self, server, defaultTTL=30):

		# This works only with XMPP
		if not isinstance(Config.EBUS, XMPPBus):
			raise ValueError("The JobManagers class can only be used with XMPP EBus!")

		# Open logger
		self.logger = logging.getLogger("job-managers")

		# The bare JID of the server
		self.serverJID = server

		# The default message life time
		# if an event stays in queue for more than the 
		# time specified, it will be considered timed out
		# and removed from it.
		self.defaultTTL = defaultTTL

		# The last agent used by the pickFree function.
		self.lastAgent = ""

		# Flag to mark if a handshake is completed
		self.handshakeCompleted = False

		# Flag to mark if the bus is online
		self.busOnline = False

		# The time the last handshake was sent
		self.handshakeTimeout = 0

		# Some callback functions for the handshake
		self.handshakeFunction = None
		self.handshakeResponseFunction = None

		# The queue for sending messages
		self.egress = Queue.Queue()

		# Open a bare JID connection with the server
		self.inputChannel = Config.EBUS.openChannel( server )
		self.inputChannel.on('close', self.onJobManagerDisconnect)
		self.inputChannel.on('handshake_ack', self.onHandshakeAck)

		# Bind to bus-wide events
		Config.EBUS.on('online', self.onOnline)
		Config.EBUS.on('offline', self.onOffline)

	#########################################################
	# Abstraction interface with the load-balanced I/O
	#########################################################

	def on(self, *args, **kwargs):
		"""
		Delegate event register requests to the inputChannel
		"""
		return self.inputChannel.on(*args, **kwargs)

	def off(self, *args, **kwargs):
		"""
		Delegate event unregister requests to the inputChannel
		"""
		return self.inputChannel.off(*args, **kwargs)

	def handshakeFn(self, fn):
		"""
		Register a function to call when we need to forward a handshake
		"""
		self.handshakeFunction = fn

	def handshakeResponseFn(self, fn):
		"""
		Register a function to call when the handshake is completed
		"""
		self.handshakeResponseFunction = fn

	def reply(self, data):
		"""
		Reply to a message received from the inputChannel
		"""
		return self.inputChannel.reply(data)

	def send(self, action, data, ttl=None):
		"""
		Schedule message for transmittion
		"""

		# Apply default TTL
		if ttl == None:
			ttl = self.defaultTTL

		# Put packet in the egress queue
		self.egress.put([action, data, time.time() + ttl])

	#########################################################
	# Load-balanced communication implementation
	#########################################################

	def getOnlineManagers(self):
		"""
		Return a list of the JIDs of all the on-line job managers
		"""

		# Make sure we have at least one agent online
		if not self.serverJID in Config.EBUS.client_roster:
			return []

		# Pick a random Job Manager from the list
		online = Config.EBUS.client_roster[self.serverJID].resources
		server_ids = online.keys()

		# Return the ID list
		return server_ids

	def onJobManagerDisconnect(self):
		"""
		Callback when any job manager goes offline
		"""

		# Check if all of the agents have gone offline
		if not self.getOnlineManagers():
			self.logger.warn("All job managers have gone offline")

			# If everything has gone offline, reset handshake flag
			self.handshakeCompleted = False

	def onOnline(self):
		"""
		Initialize connection with the server when the external bus is online.
		"""
		self.logger.info("External bus is online")

		# Add/accept server in my roster, therefore keeping known the
		# state of all the servers in the network
		self.logger.debug("Subscribing %s to my roster" % self.serverJID)
		Config.EBUS.send_presence(pto=self.serverJID, ptype='subscribe')

		# Pick a random server
		server_ids = self.getOnlineManagers()
		if server_ids:
			self.lastAgent = server_ids[  random.randint(0, len(server_ids)-1) ]
		else:
			self.logger.warn("No online job managers found in the roster")
			self.lastAgent = ""

		# Mark the bus as online
		self.busOnline = True

	def onOffline(self):
		"""
		Cleanup system when the external bus is offline.
		"""
		self.logger.warn("External bus has gone offline")

		# Reset handshake when the external bus goes offline
		self.handshakeCompleted = False

		# Mark the bus as offline
		self.busOnline = False

	def onHandshakeAck(self, message):
		"""
		Callback when we have a handshake acknowlegement from the server
		"""
		self.logger.info("Got handshake response");

		# The handshake is completed
		self.handshakeCompleted	= True

		# Fire the handshake response function
		if self.handshakeResponseFunction:
			self.handshakeResponseFunction( message )

	def jid(self):
		"""
		Pick a job manager JID from the roster according to the
		current load-balancing policy.
		"""

		# Get a list of online server IDs
		server_ids = self.getOnlineManagers()
		if not server_ids:
			return ""

		# Check if the node we found is still online
		if self.lastAgent in server_ids:

			# Get next element (round-robin)
			i = server_ids.index(self.lastAgent)
			i += 1

			# Check for out of bounds
			if i >= len(server_ids):
				i = 0

			# Pick
			self.lastAgent = server_ids[i]

		else:
			self.lastAgent = server_ids[0]

		# Return the JID of the server
		return "%s/%s" % (self.serverJID, self.lastAgent)

	def channel(self):
		"""
		Pick a job manager from the roster, according to the 
		current load-balancing policy and open a channel to it.
		"""

		# Return a channel for the picked jid
		return Config.EBUS.openChannel( self.jid() )

	def process(self, timeslice=0.5):
		"""
		Process function that handles the event routing
		"""

		# Send handshake to the job managers if there
		# are no on-line job managers.
		if self.busOnline and not self.handshakeCompleted and (self.handshakeTimeout < time.time()):

			# Calculate the timeout for the handhsake
			self.handshakeTimeout = time.time() + 30

			# Do the rest only if we have handshakeFunction defined
			if self.handshakeFunction:
				self.logger.info("Sending handshake");

				# Pick a target
				target_jid = self.jid()
				if not target_jid:
					self.logger.warn("No job mangers found to send handshake")
					return

				# Open channel and call the handshake function
				outputChannel = Config.EBUS.openChannel(target_jid)
				self.handshakeFunction( outputChannel )

			else:
				self.logger.warn("Missing handshake function");

		# Check for messages in the egress queue
		try:
			emsg = self.egress.get(True, timeslice)

			# Check for TTL
			if emsg[2] > time.time():
				self.logger.warn("Dropping timed out egress packet")
				return

			# Pick a target
			target_jid = self.jid()
			if not target_jid:
				self.logger.warn("No job mangers found to send message")
				return

			# Open channel and send data
			outputChannel = Config.EBUS.openChannel(target_jid)
			outputChannel.send(emsg[0], emsg[1])

		except Queue.Empty:
			pass
