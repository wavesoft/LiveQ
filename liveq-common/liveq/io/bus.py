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
An error on the channel
"""
class BusChannelException(Exception):
	def __init__(self, value):
		self.value = value
	def __str__(self):
		return repr(self.value)

"""
The specified channel is missing
"""
class NoBusChannelException(Exception):
	def __init__(self, value):
		self.value = value
	def __str__(self):
		return "No channel '%s' is available on the bus" % str(self.value)

"""
A channel on a bus that the user can send messages or listen for other
"""
class BusChannel(EventDispatcher):

	"""
	Initialize event dispatcher
	"""
	def __init__(self):
		EventDispatcher.__init__(self)

	"""
	Sends a message to the bus
	"""
	def send(self, name, data):
		raise NotImplementedError("The BusChannel did not implement the send() function")


"""
A template class that should be inherited by the Bus driver
"""
class Bus:

	"""
	Open a named channel on the bus.
	This function should return a BusChannel instance
	"""
	def openChannel(self, name):
		raise NotImplementedError("The Bus did not implement the openChannel() function")
