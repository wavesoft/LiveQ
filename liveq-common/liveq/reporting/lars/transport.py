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

import time
import socket

class LARSTransport:
	"""
	Abstract base class for implementing a transport protocol
	"""

	def send(self, payload):
		"""
		Send data through the transport
		"""
		raise NotImplementedError("LARS transport send() function not implementing")

class UDPTransport(LARSTransport):
	"""
	Default UDP transport that 
	"""

	def __init__(self, host, port):
		"""
		Initialize the UDP socket
		"""

		# Create a UDP socket
		self.socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

		# Keep the address
		self.addr = (host, port)

	def send(self, payload):
		"""
		Send the given payload over the transport layer
		"""

		# Send message
		self.socket.sendto(payload, self.addr)


class BusTransport(LARSTransport):
	"""
	A transport system for LARS that uses an existing IBUS/EBUS channel
	"""

	def __init__(self, channel, action="lars", throttling=True, delay=10):
		"""
		Initialize the BusTransport bu storing the channel

		Since a bus is less real-time than direct UDPTransport, this class
		support sthrottling of the stacked messages.
		"""

		# The bus channel
		self.channel = channel
		self.action = action

		# Throttling information
		self.throttling = throttling
		self.throttling_delay = deley
		self.throttling_stack = []
		self.throttling_timer = time.time()

	def flush(self):
		"""
		Flush the throttle queue to the channel
		"""

		# Reset throttling timer
		self.throttling_timer = time.time()

		# If we have some packets, send them now
		if self.throttling_stack:

			# Send a colleted frame
			self.channel.send(self.action, {
					"frames": self.throttling_stack
				})
			self.throttling_stack = []


	def process(self):
		"""
		Process the egress queue
		"""

		# Timestamp
		timestamp = time.time()

		# Check if we reached the throttling timer and flush the queue if needed
		if timestamp >= self.throttling_timer + self.throttling_delay:
			self.flush()

	def send(self, payload):
		"""
		Send the given payload over the bus channel
		"""

		# Check if we have throttling enabled
		if self.throttling:
			ts = time.time()

			# If we are within the throttle timer, stack on the egress queue
			if ts < self.throttling_timer + self.throttling_delay:
				self.throttling_stack.append( payload )
			else:
				self.flush()

		else:

			# Otherwise send it in real-time
			self.channel.send(self.action, {
					"frames": [ payload ]
				})

