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

import socket
import string
import random

from sleekxmpp import ClientXMPP
from sleekxmpp.exceptions import IqError, IqTimeout

from liveq.events import GlobalEvents
from liveq.io.bus import Bus, BusChannel, NoBusChannelException, BusChannelException
from liveq.config.classes import BusConfigClass


"""
XMPP Channel between the server and a user
"""
class XMPPUserChannel(BusChannel):

	"""
	Initialize the XMPP Channel
	"""
	def __init__(self, bus, jid):
		BusChannel.__init__(self)
		self.bus = bus
		self.jid = jid

	"""
	Send a message on the bus
	"""
	def send(self, message, data):
		
		# Prepare an IQ Stanza
		iq = self.bus.make_iq_get(queryxmlns='liveq:message',
			ito=self.jid)

		# Send and wait for response
		try:
		    resp = iq.send()
		    # ... do stuff with expected Iq result

		except IqError as e:
		    err_resp = e.iq
		    # ... handle error case

		except IqTimeout:
		    # ... no response received in time
		    pass


"""
XMPP Bus
"""
class XMPPBus(Bus, ClientXMPP):
	
	"""
	Initialize the XMPP adapter with the given static and user config
	"""
	def __init__(self,config,userconfig):

		# Setup superclasses
		Bus.__init__(self)
		ClientXMPP.__init__(self, "%s@%s/%s" % (config.SERVER, config.DOMAIN, config.RESOURCE), config.PASSWORD)

		# Register event handlers
		self.add_event_handler("session_start", self.session_start)
		self.add_event_handler("message", self.message)
		self.register_handler(Callback(
    		'XMPPUserChannel Handler',
    		StanzaPath('iq/liveq:message'),
    		self.user_message))


		# Prepare variables
		self.channels = { }

	"""
	Session management
	"""
	def session_start(self, event):
		self.send_presence()
		self.get_roster()

	"""
	Handler for incoming IQ messages, to be routed
	to the appropriate user channel
	"""
	def user_message(self, iq):
		pass

	"""
	Message I/O
	"""
	def message(self, msg):
		if msg['type'] in ('chat', 'normal'):
			msg.reply("Thanks for sending\n%(body)s" % msg).send()

	"""
	Open an XMPP Channel
	"""
	def openChannel(self, name):

		# Create channel for the given user if it's not already open
		if not name in self.channels:
			self.channels[name] = XMPPUserChannel(self, name)
		
		# Return channel instance
		return self.channels[name]

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
			'random'	: ''.join(random.choice(string.ascii_uppercase + string.digits) for x in range(10))
		}

		self.SERVER = config["server"]
		self.DOMAIN = config["domain"]
		self.USERNAME = config["username"]
		self.PASSWORD = config["password"]
		self.RESOURCE = config["resource"] % macros

	"""
	Create an ZeroMQ Bus instance
	"""
	def instance(self):
		return XMPPBus(self)

