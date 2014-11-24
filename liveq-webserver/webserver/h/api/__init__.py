
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

class APIInterface:

	def __init__(self, socket, domain):
		"""
		Initialize the API Base class
		"""
		self.socket = socket
		self.domain = domain

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

	def action(self, action, param):
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

	######################################
	#          EGRESS COMMANDS           #
	######################################

	def sendAction(self, action, param):
		"""
		Send action, automatically prefixing it with the appropriate
		API domain suffix.
		"""
		# Send action
		self.socket.sendAction("%s.%s" % (self.domain, action), param)

	def sendError(self, message ):
		"""
		Send action, automatically prefixing it with the appropriate
		API domain suffix.
		"""
		# Send error
		self.socket.sendError("[%s] %s" % (self.domain, message))
