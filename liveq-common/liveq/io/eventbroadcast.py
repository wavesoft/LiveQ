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

from liveq.io.bus import Bus
from liveq.config.internalbus import InternalBusConfig
from liveq.events import EventDispatcher

logger = logging.getLogger("eventbroadcast")

class EventBroadcastWrapper(EventDispatcher):
	"""
	A wrapper class that provides simple garbage collection
	when handling multiple instances.
	"""

	def __init__(self, channel):
		"""
		Initialize global events channel
		"""
		EventDispatcher.__init__(self)
		self.channel = channel

		# Register wrapper
		self.channel.wrappers.append( self )

	def close(self):
		"""
		Unregister wrapper upon destruction
		"""

		# Unregister wrapper
		i = self.channel.wrappers.index( self )
		if i >= 0:
			logger.info("[%s] Released wrapper" % self.channel.channelName)
			del self.channel.wrappers[i]

		# If that was the last, close channel
		if len(self.channel.wrappers) == 0:
			self.channel.close()

	def _handle(self, eventName, eventArgs):
		"""
		Receive and forward the specified event
		"""
		self.trigger(eventName, *eventArgs)

	def broadcast(self, eventName, *args):
		"""
		Broadcast the specified event
		"""

		# Fire event
		self.channel.broadcast(eventName, *args)

class EventBroadcast:
	"""
	A class that provides simple interface to send and receive
	gloval events in a many-to-many broadcast manner.
	"""

	#: Channel instances
	CHANNEL_INSTANCES = {}

	@staticmethod
	def forChannel(channelName):
		"""
		Open/resume an event broadcast for the specified channel
		"""

		# Open new channel if missing
		if not channelName in EventBroadcast.CHANNEL_INSTANCES:
			EventBroadcast.CHANNEL_INSTANCES[channelName] = EventBroadcast(channelName)

		# Open wrapper
		return EventBroadcastWrapper( EventBroadcast.CHANNEL_INSTANCES[channelName] )

	def __init__(self, channelName):
		"""
		Open and bind to the specified channel
		"""

		# Prefix
		channelName = "eventbroadcast.%s" % channelName

		# Open and bind to channel
		self.channel = InternalBusConfig.IBUS.openChannel(channelName, flags=Bus.OPEN_BROADCAST | Bus.OPEN_BIND )
		self.channelName = channelName

		# Receive events
		self.channel.on('event', self.onEventReceived)

		# Wrappers
		self.wrappers = []
		logger.info("[%s] Open and bound" % self.channelName)

	def close(self):
		"""
		Shutdown the event channel
		"""
		logger.info("[%s] Closing" % self.channelName)

		# Remove from instances & close
		if self.channelName in EventBroadcast.CHANNEL_INSTANCES:
			del EventBroadcast.CHANNEL_INSTANCES[self.channelName]
			self.channel.close()

	def broadcast(self, eventName, *eventArgs):
		"""
		Broadcast the specified event
		"""
		logger.info("[%s] Broadcasting event %s" % (self.channelName, eventName))

		# Handle from all wrappers
		for w in self.wrappers:
			w._handle(eventName, eventArgs)

		# Fire event
		self.channel.send('event', {
			'name': eventName,
			'args': eventArgs
			})

	def onEventReceived(self, event):
		"""
		Handle event
		"""
		logger.info("[%s] Received event %s" % (self.channelName, event))

		# Handle from all wrappers
		for w in self.wrappers:
			w._handle(event['name'], event['args'])

