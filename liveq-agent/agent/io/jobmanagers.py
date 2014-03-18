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

from liveq.classes.bus.xmppmsg import XMPPBus
from agent.config import Config

import random
import logging

class JobManagers:

	def __init__(self, server):

		# The bare JID of the server
		self.SERVER_JID = server

		# The last agent used by the pickFree function.
		self.LAST_AGENT = ""


	def login(self):
		"""
		Establish connection with the job manager
		"""

		# This works only with XMPP
		if not isinstance(Config.EBUS, XMPPBus):
			raise ValueError("The External Bus *MUST* be an XMPP bus!")

		# Add/accept server in my roster, therefore keeping known the
		# state of all the servers in the network
		logging.debug("Subscribing %s to my roster" % self.SERVER_JID)
		Config.EBUS.send_presence(pto=self.SERVER_JID, ptype='subscribe')

		# Make sure we have at least one agent online
		if not self.SERVER_JID in Config.EBUS.client_roster:
			logging.warn("No online servers were found!")
			return

		# Pick a random Job Manager from the list
		online = Config.EBUS.client_roster[self.SERVER_JID].resources
		server_ids = online.keys()
		self.SERVER_JID = server_ids[  random.randint(0, len(server_ids)-1) ]

	def jid(self):
		"""
		Pick a job manager JID from the roster according to the
		current load-balancing policy.
		"""

		# Make sure we have at least one agent online
		if not self.SERVER_JID in Config.EBUS.client_roster:
			logging.warn("No online servers were found!")
			return ""

		# Get online job managers
		online = Config.EBUS.client_roster[self.SERVER_JID].resources
		server_ids = online.keys()

		# Check if the node we found is still online
		if self.LAST_AGENT in server_ids:

			# Get next element (round-robin)
			i = server_ids.index(self.LAST_AGENT)
			i += 1

			# Check for out of bounds
			if i >= len(server_ids):
				i = 0

			# Pick
			self.LAST_AGENT = server_ids[i]

		else:
			self.LAST_AGENT = server_ids[0]

		# Return the JID of the server
		return self.LAST_AGENT

	def channel(self):
		"""
		Pick a job manager from the roster, according to the 
		current load-balancing policy and open a channel to it.
		"""

		# Return a channel for the picked jid
		return Config.EBUS.openChannel( self.jid() )
