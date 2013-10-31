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

from liveq.events import EventDispatcher

class BusChannelException(Exception):
	"""
	An error on the channel
	"""
	def __init__(self, value):
		self.value = value
	def __str__(self):
		return repr(self.value)

class NoBusChannelException(BusChannelException):
	"""
	The specified channel is missing
	"""
	def __init__(self, value):
		self.value = value
	def __str__(self):
		return "No channel '%s' is available on the bus" % str(self.value)

class BusChannel(EventDispatcher):
	"""
	A channel on a bus that the user can send messages or listen for other

	Events dispatched on this class:
	* ``open``	: When the channel is open
	* ``close``	: When the channel is closed
	* <message>	: When a message arrives from the bus. Each message has the name specified while sending it.
	"""

	def __init__(self, name):
		"""
		Initialize event dispatcher
		"""
		EventDispatcher.__init__(self)
		self.name = name

	def send(self, name, data, waitReply=False, timeout=30):
		"""
		Sends a message to the bus
		"""
		raise NotImplementedError("The BusChannel did not implement the send() function")

	def reply(self, data):
		"""
		Reply to the last message received
		"""
		raise NotImplementedError("The BusChannel did not implement the reply() function")
	
	def close(self):
		"""
		Close the specified channel
		"""
		raise NotImplementedError("The BusChannel did not implement the close() function")

class Bus(EventDispatcher):
	"""
	A template class that should be inherited by the Bus driver

	Events dispatched on this class:
	* ``channel``	: When a channel is created by a remote request

	"""

	def __init__(self):
		"""
		Initialize event dispatcher
		"""
		EventDispatcher.__init__(self)

	def openChannel(self, name):
		"""
		Open a named channel on the bus.
		This function should return a BusChannel instance
		"""
		raise NotImplementedError("The Bus did not implement the openChannel() function")
