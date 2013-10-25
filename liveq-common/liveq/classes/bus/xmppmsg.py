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

"""
XMPP Messages Bus Class

This class provides an XMPP bus implementation that uses <message /> stanzas for
communication between the parties.
"""

import re
import socket
import string
import random
import logging
import threading
import time
import json

import base64
import zlib
import random

from sleekxmpp import ClientXMPP, Callback, MatchXPath, StanzaPath, Iq
from sleekxmpp.exceptions import IqError, IqTimeout
from sleekxmpp.xmlstream.stanzabase import ElementBase
from sleekxmpp.xmlstream import register_stanza_plugin

from liveq.events import GlobalEvents
from liveq.io.bus import Bus, BusChannel, NoBusChannelException, BusChannelException
from liveq.config.core import StaticConfig
from liveq.config.classes import BusConfigClass

class Config(BusConfigClass):
	"""
	Configuration endpoint for the XMPP Bus
	"""

	def __init__(self,config):
		"""
		Populate the XMPP Bus configuration
		"""

		# Prepare some template macros
		macros = {
			'hostname'	: socket.gethostname(),
			'random'	: ''.join(random.choice(string.ascii_uppercase + string.digits) for x in range(10)),
			'uuid'		: StaticConfig.UUID
		}

		self.SERVER = config["server"]
		self.DOMAIN = config["domain"]
		self.USERNAME = config["username"]
		self.PASSWORD = config["password"]
		self.RESOURCE = config["resource"] % macros

	def instance(self, runtimeConfig):
		"""
		Create an XMPP Bus instance
		"""
		return XMPPBus(self)


def parseMsg(message):
	"""
	Reusable function to parse an incoming message

	The LiveQ Message format is the following:

	 +--------------+---------------+--------- ... ---+
	 | 2 bytes: "LQ"| 1 byte: Flags | Base64-Enc Data |
	 +--------------+---------------+--------- ... ---+

	Flag is a letter between "A" and "P", representing a 4-bit
	integer number calculated as following:

	flag = ord( <char> ) - 65

	And the flags can be the following:

	 ...x : The data are encrypted
	 ..x. : The data are compressed
	 .x.. : (Unused)
	 x... : (Unused)

	"""

	# Ensure basic quality
	if not message:
		return None

	# Validate the data in the message payload
	if message[:2] != "LQ":
		logging.warn("Invalid message arrvied: Non-LiveQ message")
		return None

	# Get the flags of the message
	flags = ord(message[2]) - 65

	# Extract payload of the message (always base64-encoded)
	try:
		message = base64.b64decode(message[3:])
	except TypeError as e:
		logging.warn("Invalid message arrvied: Not base64 encoded")
		return None
	
	# Decrypt data
	if flags & 1:
		pass

	# Decompress data
	if flags & 2:
		message = zlib.decompress(message)

	# Decode the json payload
	data = json.loads(message)

	# Ensure required fields
	if not 'data' in data:
		# Data is the data I/O field - Must be present
		logging.warn("Invalid message arrvied: 'data' field was not found")
		return None

	if not 'id' in data:
		# ID is optional, used for replying - Should be present
		data['id'] = None


	# Return data map
	return data

def createMsg(message, compress=True, encrypt=False):
	"""
	Reusable function to convert a data hash to a LiveQ message

	This function is the reverse of :func:`parseMsg`. Check that for more details
	"""

	# Convert message to JSON Notation
	message = json.dumps(message)

	# Apply encryption if asked to
	if encrypt:
		pass

	# Apply compression if asked to
	if compress:
		message = zlib.compress(message)

	# Prepare the flags
	flags = 0
	if compress:
		flags |= 2
	if encrypt:
		flags |= 1

	# Base64-encode data
	message = base64.b64encode(message)

	# Build and return final message
	return "LQ" + chr(65 + flags) + message


class XMPPUserChannel(BusChannel):
	"""
	XMPP Channel

	This channel uses <message /> stanzas of type *headline* for communication between
	the parties. This allows interface with multiple recepients if the resource component
	is missing from the JID.
	"""

	def __init__(self, bus, jid):
		"""
		Initialize the XMPP Channel
		"""
		BusChannel.__init__(self, jid)
		self.bus = bus
		self.jid = jid

		# Message ID tagging
		self.idPrefix = "u%i.%ix" % ( 
			zlib.adler32( self.jid ),
			random.SystemRandom().randint(0,65535) 
		)
		self.idCounter = 0

		# For replying
		self.responded = False
		self.lastMessage = None
		self.replyID = None

		# Waiting queue
		self.waitQueue = { }

		# Lockdown to prohibit I/O during shutdown
		self.lockdown = False

		# Setup logging
		self.logger = logging.getLogger("xmpp-channel")
		self.logger.debug("[%s] Channel open" % self.jid)

	def _nextID(self):
		"""
		Generate next ID for communication
		"""
		self.idCounter += 1
		return self.idPrefix + str(self.idCounter)

	def _handleError(self, message):
		"""
		Handle error messages
		"""

		# Process incoming message
		data = parseMsg(message['body'])

		# Reject invalid messages
		if not data:
			self.logger.debug("[%s] Invalid message arrived" % self.jid )
			return 

		# Check if we were waiting a response on that message
		if data['id'] in self.waitQueue:

			# Response arrived
			self.logger.debug("[%s] Error response for (#%s) %s" % (self.jid, data['id'], message['error'] ) )

			# Fetch response object
			waiting = self.waitQueue[data['id']]

			# Update data and unlock event
			waiting['data'] = None
			waiting['event'].set()

	def _shutdown(self):
		"""
		Shutdown channel
		"""

		# Release all threads waiting in queues
		for k, waiting in self.waitQueue.iteritems():
			# Update data and unlock event
			waiting['data'] = None
			waiting['event'].set()

		# Enter lockdown
		self.lockdown = True

	def _handle(self, message):
		"""
		Handle incoming message in this channel
		"""

		# Process incoming message
		data = parseMsg(message['body'])

		# Reject invalid messages
		if not data:
			self.logger.debug("[%s] Invalid message arrived" % self.jid )
			return 

		# Messages without 'name' field, are responses
		# to a message that had a 'name' field
		if not 'name' in data:

			# Check if we have to respond on a message
			if data['id'] in self.waitQueue:

				# Response arrived
				self.logger.debug("[%s] Incoming response: (#%s) %s" % (self.jid, data['id'], data['data'] ) )

				# Fetch response object
				waiting = self.waitQueue[data['id']]

				# Update data and unlock event
				waiting['data'] = data['data']
				waiting['event'].set()

			else:
				# Unknown response arrived
				self.logger.warn("[%s] Unhandled response (#%s) %s" % (self.jid, data['id'], data['data'] ) )

			# Don't do anything else
			return

		# Message arrived
		self.logger.debug("[%s] Incoming message: (%s) %s" % (self.jid, data['name'], data['data'] ) )

		# Store info for reply
		self.lastMessage = message
		self.replyID = data['id']

		# Trigger the event
		self.trigger(data['name'], data['data'])

	def reply(self, data):
		"""
		Reply to a message on the bus
		"""

		# If we are in shutdown lockdown, exit
		if self.lockdown:
			return

		# Send response
		self.lastMessage.reply(createMsg({
				'id': self.replyID,
				'data': data
			})).send()

		# Mark conversation as responded
		self.responded = True

	def send(self, message, data, waitReply=False, timeout=30):
		"""
		Send a message on the bus
		"""

		# If we are in shutdown lockdown, exit
		if self.lockdown:
			return
		
		# Prepare the message
		mid = self._nextID()
		message = createMsg({
				'name': message,
				'data': data,
				'id': mid
			})

		self.logger.debug("[%s] Sending message: (%s) %s" % (self.jid, message, str(data)) )

		# Send message
		self.bus.send_message(mto=self.jid, mbody=message, mtype='headline')

		# Check if we should wait for response
		if waitReply:
			self.logger.debug("[%s] Waiting for response on #%s" % (self.jid, mid) )

			# Prepare the waiting queue field
			event = threading.Event()
			record = { "data": None, "event": event }
			self.waitQueue[mid] = record

			# Lock on the event
			event.wait(timeout)

			# Check if we just timed out
			if not event.is_set():
				self.logger.debug("[%s] Timeout waiting response on #%s" % (self.jid, mid) )
				del self.waitQueue[mid]
				return None

			# Return data
			return record['data']

class XMPPBus(Bus, ClientXMPP):
	"""
	XMPP Bus

	This bus uses <message /> stanzas that enables targeting multiple recepients.
	"""
	
	# JID validation
	JID_MATCH = re.compile(r"^(?:([^@/<>'\"]+)@)?([^@/<>'\"]+)(?:/([^<>'\"]*))?$")

	"""
	Initialize the XMPP adapter with the given config object
	"""
	def __init__(self,config):

		# Setup superclasses
		Bus.__init__(self)
		ClientXMPP.__init__(self, "%s@%s/%s" % (config.USERNAME, config.DOMAIN, config.RESOURCE), config.PASSWORD)

		# Setup auto accept
		self.auto_subscribe=True
		self.auto_authorize=True

		# Setup logging
		self.logger = logging.getLogger("xmpp-bus")

		# Register event handlers
		self.add_event_handler("session_start", self.onSessionStart)
		self.add_event_handler("disconnected", self.onDisconnected)
		self.add_event_handler("connected", self.onConnected)
		self.add_event_handler("presence_available", self.onAvailable)
		self.add_event_handler("presence_unavailable", self.onUnavailable)
		self.add_event_handler("message", self.onMessage)

		# Prepare variables
		self.channels = { }
		self.disconnecting = False

		# Connect to the XMPP client
		self.connect()

		# Start blocking processing thread in the background
		self.mainThread = threading.Thread(target=self.process, kwargs={"blocking": True})
		self.mainThread.start()

		# Bind to the system shutdown callback
		GlobalEvents.System.on('shutdown', self.systemShutdown)

	"""
	Callback when a user becomes available
	"""
	def onAvailable(self, event):

		# Get JID
		jid = str(event['from'])

		# Notify bare id (if exists) that the connection is now open
		barejid = jid.split("/")[0]
		if barejid in self.channels:
			self.channels[barejid].trigger('open')

		# Notify that channel (if exist) that the connection is now open
		if jid in self.channels:
			self.channels[jid].trigger('open')

	"""
	Callback when a user becomes unavailable
	"""
	def onUnavailable(self, event):

		# Get JID
		jid = str(event['from'])

		# Notify bare id (if exists) that the connection is now closed
		barejid = jid.split("/")[0]
		if barejid in self.channels:
			self.channels[barejid].trigger('close')

		# Notify that channel (if exist) that the connection is now closed
		if jid in self.channels:
			self.channels[jid].trigger('close')

	"""
	Callback from the XMPP when connection is up
	"""
	def onConnected(self, event):

		# Update state
		self.connected = True

	"""
	Callback from the XMPP when connection is down
	"""
	def onDisconnected(self, event):

		# Update state
		self.connected = False
		
		# If that's expected do nothing
		# Otherwise try to recover connection
		if not self.disconnecting:
			self.logger.warn("[%s] Connection lost. Will reconnect in 5 seconds" % self.jid)

			# Notify all channels that I/O is now closed
			for jid, channel in self.channels.iteritems():
				channel.trigger('close')

			# Wait 5 seconds
			time.sleep(5)

			# Reconnect, prohibiting re-triggering of the
			# onDisconnect function
			self.disconnecting = True
			self.reconnect()
			self.disconnecting = False

	"""
	Handler for the system-wide shutdown event
	"""
	def systemShutdown(self):

		# Mark us as under disconnection
		self.disconnecting = True

		# Shutdown / release wait locks on all of our children
		for jid, channel in self.channels.iteritems():
			channel._shutdown()

		# Disconnect if we are already connected
		if self.connected:
			self.disconnect()

		# Join thread
		self.mainThread.join()

	"""
	Session management
	"""
	def onSessionStart(self, event):

		# Update presence and get roster
		self.send_presence()
		self.get_roster()

	"""
	Handler for incoming IQ messages, to be routed
	to the appropriate user channel
	"""
	def onDataMessage(self, iq):

		# Get JID
		jid = iq['from']

		# Check if we can find a channel without resource
		# (for load-balancing for example)
		if not jid in self.channels:
			parts = str(jid).split("/")

			# If such channel exists, use that instead.
			# Otherwise, keep doing what we were supposed to do
			if parts[0] in self.channels:
				jid = parts[0]

		# Create a new channel if it is not already started
		if not jid in self.channels:
			c = XMPPUserChannel(self, jid)
			self.trigger('channel', c)

			# Store on database
			self.channels[jid] = c

		# Forward message on channel
		channel = self.channels[jid]
		channel._handle(iq)

	"""
	Message I/O
	"""
	def onMessage(self, msg):

		# Normal messages are non-chat messages
		# arrived for message exchange
		if msg['type'] == 'headline':

			# Get JID
			jid = str(msg['from'])

			# Check if we can find a channel without resource
			# (for load-balancing for example)
			if not jid in self.channels:
				parts = str(jid).split("/")

				# If such channel exists, use that instead.
				# Otherwise, keep doing what we were supposed to do
				if parts[0] in self.channels:
					jid = parts[0]

			# Create a new channel if it is not already started
			if not jid in self.channels:
				c = XMPPUserChannel(self, jid)
				self.trigger('channel', c)

				# Store on database
				self.channels[jid] = c

			# Forward message on channel
			channel = self.channels[jid]
			channel._handle(msg)

		# Error responses might also intereset our channels
		if msg['type'] == 'error':

			# Get JID
			jid = str(msg['from'])

			# Check if we can find a channel without resource
			# (for load-balancing for example)
			if not jid in self.channels:
				parts = str(jid).split("/")

				# If such channel exists, use that instead.
				# Otherwise, keep doing what we were supposed to do
				if parts[0] in self.channels:
					jid = parts[0]

			# We don't have to create 
			if jid in self.channels:

				# Forward error message on channel
				channel = self.channels[jid]
				channel._handleError(msg)

		# Chat messages are usually sent by a chat client
		if msg['type'] in ('chat', 'normal'):
			msg.reply("Thank you for your interest, but I am a rude bot not answering to casual chatter").send()

	"""
	Open an XMPP Channel
	"""
	def openChannel(self, name):

		# Validate channel format
		if not XMPPBus.JID_MATCH.match(name):
			raise NoBusChannelException("Invalid channel name: %s" % name)

		# Create channel for the given user if it's not already open
		if not name in self.channels:
			self.channels[name] = XMPPUserChannel(self, name)
		
		# Return channel instance
		return self.channels[name]


