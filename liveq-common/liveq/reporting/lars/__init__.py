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

from liveq.reporting.lars.transport import UDPTransport

#: Set an attribute
ACTION_ATTRIB = 0

#: Set a value on this key
ACTION_SET = 1

#: Append a numeric value on this key
ACTION_ADD = 2

#: Append an item on the list under the given key
ACTION_LIST_ADD = 3

#: Remove an item from the list under the given key
ACTION_LIST_REMOVE = 4

#: Start heartbeat monitor
ACTION_HB_START = 5

#: Send a heartbeat signal
ACTION_HB_SEND = 6

#: Stop heartbeat monitor
ACTION_HB_STOP = 7

#: Default LARS Heartbeat timeout
DEFAULT_HB_INTERVAL = 30

# Open a logger
_logger = logging.getLogger("lars")

class LARS:
	"""
	LiveQ Active Reporting System

	This class provides the basic interface for 
	"""

	#: The transport system of the LARS
	transport = None

	#: The aliases of the open objects
	alias = { }

	#: The aliases of the repeaters
	alias_repeater = { }

	@staticmethod
	def initialize(name="", host="127.0.0.1", port=4545, transport=None):
		"""
		Initialize the LARS module by initializing the transport

		If no transport= parameter is defined, a new UDPTransport will be instantiated
		using the parameters given on host= and port= parameters
		"""

		# Set transport
		LARS.transport = UDPTransport(host, port)

		# If we have a id, send it now as an attribute on the channel.
		if name:
			LARS.sendMessage( ACTION_ATTRIB, "id", name )

	@staticmethod
	def get(alias):
		"""
		Return an existing alias if it exists
		"""

		# If we have the alias return
		if alias in LARS.alias:
			return LARS.alias[alias]

		# Otherwise return None
		return None

	@staticmethod
	def sendMessage(action, key, value=None):
		"""
		Send a message to the transport
		"""

		# Replace value if missing
		if not value:
			value = ""
		else:
			value = "=%s" % str(value)

		# Send raw frame
		LARS.forwardMessage( "%c%s%s" % ( 64+action, key, value ) )

	@staticmethod
	def forwardMessage(payload):
		"""
		Forward a message received from other transport
		"""

		# Check if we have a transport
		if LARS.transport:

			# Build message and send it through the transport
			try:
				LARS.transport.send(payload)
			except Exception as e:
				_logger.warn("Exception %s raised while sending message to %s transport: %s" % 
					(e.__class__.__name__, LARS.transport.__class__.__name__, str(e) ))

		else:
			_logger.warn("No LARS transport was initialized")

	@staticmethod
	def root():
		"""
		Return the ROOT group of the LARS data tree
		"""
		return LARSGroup("lars")

	@staticmethod
	def openRepeater(prefixes=None, alias=None):
		"""
		Create a repeater class that can be used to forward
		the data to our transport channel.

		A repeater can be used to restrict the keys that can be
		updated.
		"""

		# Check if alias exists
		if alias and alias in LARS.alias_repeater:
			return LARS.alias_repeater[alias]

		# Create repeater instance
		repeater = LARSRepeater(prefixes)
		if alias:
			LARS.alias_repeater[alias] = repeater

		# Return a LARS Repeater restricted to the given prefixes 
		return repeater

	@staticmethod
	def openGroup(path, key, alias=None):
		"""
		Return open a group 
		"""

		# Quickly recover from alias if we have something already specified
		if alias and alias in LARS.alias:
			return LARS.alias[alias]

		# Split into path components
		parts = path.split("/")
		node = LARS.root()
		if path:
			for p in parts:
				node = node.openGroup(p)

		# Open the group on the last node
		return node.openGroup(key, alias=alias)

	@staticmethod
	def openEntity(path, key, autoKeepalive=False, alias=None, interval=DEFAULT_HB_INTERVAL):
		"""
		Open an entity
		"""

		# Quickly recover from alias if we have something already specified
		if alias and alias in LARS.alias:
			return LARS.alias[alias]

		# Split into path components
		parts = path.split("/")
		node = LARS.root()
		if path:
			for p in parts:
				node = node.openGroup(p)

		# Open an entity on the last group
		return node.openEntity(key, autoKeepalive=autoKeepalive, alias=alias, interval=interval)

# !!!!!!!!
# Load LARSGroup and LARSEntity *AFTER* LARS class is defined
from liveq.reporting.lars.entities import LARSGroup, LARSEntity
from liveq.reporting.lars.utilities import LARSRepeater
