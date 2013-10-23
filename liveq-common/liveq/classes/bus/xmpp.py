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
import socket
import string
import random
import logging
import threading
import time
import json

from sleekxmpp import ClientXMPP, Callback, MatchXPath, StanzaPath, Iq
from sleekxmpp.exceptions import IqError, IqTimeout
from sleekxmpp.xmlstream.stanzabase import ElementBase
from sleekxmpp.xmlstream import register_stanza_plugin

from liveq.events import GlobalEvents
from liveq.io.bus import Bus, BusChannel, NoBusChannelException, BusChannelException
from liveq.config.core import StaticConfig
from liveq.config.classes import BusConfigClass

"""
Configuration endpoint for the XMPP Bus
"""
class Config(BusConfigClass):

	"""
	Populate the database configuration
	"""
	def __init__(self,config):

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

	"""
	Create an ZeroMQ Bus instance
	"""
	def instance(self, runtimeConfig):
		return XMPPBus(self)

"""
Message Stanza
"""
class LiveQMessage(ElementBase):
	name = "query"
	namespace = "liveq:message"
	plugin_attrib = "liveq"
	interfaces = set(('name','body'))
	sub_interfaces = set(('body',))

# Register LiveQ Stanza
register_stanza_plugin( Iq, LiveQMessage )

"""
XMPP Channel between the server and a user
"""
class XMPPUserChannel(BusChannel):

	"""
	Initialize the XMPP Channel
	"""
	def __init__(self, bus, jid):
		BusChannel.__init__(self, jid)
		self.bus = bus
		self.jid = jid

		# For replying
		self.responded = False
		self.lastMessage = None

		# Setup logging
		self.logger = logging.getLogger("xmpp-channel")
		self.logger.debug("[%s] Channel open" % self.jid)

	"""
	Process incoming message
	"""
	def _process(self, message):

		# Process message
		msg = message['liveq']

		# If data exist, parse them
		data = {}
		if msg['body']:
			data = json.loads(msg['body'])

		return data

	"""
	Handle incoming message in this channel
	"""
	def _handle(self, message):

		# Process incoming message
		data = self._process(message)
		self.logger.debug("[%s] Incoming message: (%s) %s" % (self.jid, message['liveq']['name'], str(data)) )

		# Forward message
		self.lastMessage = message
		self.trigger(message['liveq']['name'], data)

		# If no response was send, reply with an empty message,
		# because we MUST respond to an IQ message.
		if not self.responded:
			message.reply().send()

	"""
	Reply to a message on the bus
	"""
	def reply(self, data):

		# Create response
		response = self.lastMessage.reply()

		# Store response data
		if data:
			response['body'] = json.dumps(data)

		# Send and marked as replied
		response.send()
		self.responded = True

	"""
	Send a message on the bus
	"""
	def send(self, message, data):
		
		self.logger.debug("[%s] Sending message: (%s) %s" % (self.jid, message, str(data)) )

		# Prepare an IQ Stanza
		iq = self.bus.make_iq_get(queryxmlns='liveq:message',
			ito=self.jid)

		# Populate body
		msg = LiveQMessage()
		msg['name'] = message
		msg['body'] = json.dumps(data)
		iq.setPayload( msg )

		# Send and wait for response
		try:

			# Handle and return the response
			resp = iq.send()
			return self._process(resp)

		except IqError as e:
			err_resp = e.iq
			self.logger.warn("[%s] Error response: %s" % (self.jid, str(err_resp)) )

		except IqTimeout:
			# ... no response received in time
			self.logger.warn("[%s] Timeout waiting response" % self.jid)


"""
XMPP Bus
"""
class XMPPBus(Bus, ClientXMPP):
	
	# JID validation
	JID_MATCH = re.compile(r"^(?:([^@/<>'\"]+)@)?([^@/<>'\"]+)(?:/([^<>'\"]*))?$")

	"""
	Initialize the XMPP adapter with the given config object
	"""
	def __init__(self,config):

		# Setup superclasses
		Bus.__init__(self)
		ClientXMPP.__init__(self, "%s@%s/%s" % (config.USERNAME, config.DOMAIN, config.RESOURCE), config.PASSWORD)

		# Setup logging
		self.logger = logging.getLogger("xmpp-bus")

		# Register event handlers
		self.add_event_handler("session_start", self.onSessionStart)
		self.add_event_handler("disconnected", self.onDisconnected)
		self.add_event_handler("connected", self.onConnected)
		self.add_event_handler("message", self.onMessage)
		self.add_event_handler("presence_available", self.onAvailable)
		self.add_event_handler("presence_unavailable", self.onUnavailable)

		# Register liveq:message handler
		self.registerHandler(Callback(
			'XMPPUserChannel Handler',
			#MatchXPath('{%s}iq/{liveq:message}query' % self.default_ns),
			StanzaPath('iq/liveq'),
			self.onDataMessage))

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
		jid = event['from']

		# Notify that channel (if exist) that the connection is now open
		if jid in self.channels:
			self.channels[jid].trigger('open')

	"""
	Callback when a user becomes unavailable
	"""
	def onUnavailable(self, event):

		# Get JID
		jid = event['from']

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
	def systemShutdown(self, event):

		# Mark us as under disconnection
		self.disconnecting = True

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
			parts = jid.split("/")

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
		if msg['type'] in ('chat', 'normal'):
			msg.reply("Thanks for sending\n%(body)s" % msg).send()

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


