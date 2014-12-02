
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

class APIInterface:

	def __init__(self, socket, domain, binaryDomain=0x00):
		"""
		Initialize the API Base class
		"""
		self.socket = socket
		self.domain = domain
		self.binaryDomain = binaryDomain << 16
		self.isOpen = True

		# Open logger
		self.logger = logging.getLogger("api.%s" % domain)

	######################################
	#           INGRESS EVENTS           #
	######################################

	def close(self):
		"""
		Cleanup logic when the channel is closed
		"""
		pass

	def open(self):
		"""
		Callback when the socket is open
		"""
		pass

	def ready(self):
		"""
		Cleanup logic when the socket is ready (handshake and user log-in completed)
		"""
		pass

	def handleAction(self, action, param):
		"""
		Handle incoming action (without domain suffix)
		"""
		pass

	######################################
	#        UTILITY FUNCTIONS           #
	######################################

	def requireParameters(self, parameters):
		"""
		"""
		pass

	######################################
	#          EGRESS COMMANDS           #
	######################################

	def sendAction(self, action, param={}):
		"""
		Send action, automatically prefixing it with the appropriate
		API domain suffix.
		"""
		# If we are not open, ignore it
		if not self.isOpen:
			return

		# Send action
		self.socket.sendAction("%s.%s" % (self.domain, action), param)

	def sendBuffer(self, frameID, data):
		"""
		Send a binary buffer
		"""
		# If we are not open, ignore it
		if not self.isOpen:
			return

		# Send buffer, prefixing the binary domain
		self.socket.sendBuffer( (frameID & 0xffff) | self.binaryDomain , data)

	def sendError(self, message ):
		"""
		Send action, automatically prefixing it with the appropriate
		API domain suffix.
		"""
		# If we are not open, ignore it
		if not self.isOpen:
			return

		# Send error
		self.socket.sendError("[%s] %s" % (self.domain, message))
