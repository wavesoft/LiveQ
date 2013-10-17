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

"""
An endpoint on the bus
"""
class BusEndpoint:

	"""
	Create an instance of a bus endpoint
	"""
	def __init__(self,name):
		self.name = name

"""
A wrapper of the messages that are sent and received on the buses
"""
class BusMessage(dict):

	"""
	Create an instance of a message with the given name
	"""
	def __init__(self, name, *args):
		dict.__init__(self, *args)
		self['name'] = name

		# Parameters initialized by the bus
		self.bus = None
		self.sender = None
		self.recepient = None
	
	"""
	Reply to a message received
	"""
	def reply(self, message):
		
		message.sender = self.recepient
		message.recepient = self.sender
		self.bus.send( message )

"""
Abstract bus class that the child classes must implement
"""
class Bus(EventDispatcher):

	"""
	Local function to be called by the bus logic
	when a message arrives and targets our local endpoint
	"""
	def _messageArrived(self, message):

	"""
	Local function to send a message to the bus
	"""
	def _messageSend(self, message, to):
		raise NotImplementedError("Method not implemented")

	"""
	Send a message to an endpoint
	"""
	def send(self, message, to=None):

		# Update message recepient if told so
		if to:
			message.recepient = to

		# Send
		pass

	"""

	"""