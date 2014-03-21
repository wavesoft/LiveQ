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

class LARSTransport:
	"""
	Abstract base class for implementing a transport protocol
	"""

	def send(self, payload):
		"""
		Send data through the transport
		"""
		pass

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

	def __init__(self, channel):
		"""
		Initialize the BusTransport bu storing the channel
		"""

		# The bus channel
		self.channel = channel

	def send(self, payload):
		"""
		Send the given payload over the bus channel
		"""

		# Send message
		self.channel.send(payload)

