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

import zmq

"""
Decorator to mark the method as "bound to a message"
These methods are automatically bound to the bus messages by the constructor
"""
def bus_handler(method, name):
	method.bound_message = name
	return method

"""
LiveQ Bus is an ZeroMQ bidirectional PubSub Node
"""
class LiveQBus:

	"""
	Initialize LiveQ Bus, using the global configuration
	"""
	def __init__(self):
		
		# Register the functions marked for registry


	"""
	Send a message on the bus and wait for the specified response message
	"""
	def request(self, msg_send, msg_recv, data, timeout=1000):
		pass

	"""
	Send a message on the bus and don't wait for any response
	"""
	def send(self, msg_send, data):
		pass

	"""
	Register a listener of the given message on the bus
	"""
	def addListener(self, message, handler):
		pass

