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
import time

from agent.config import Config

from liveq.io.bus import BusChannelException
from liveq.component import Component

from liveq.classes.bus.xmppmsg import XMPPBus

"""
Core agent
"""
class AgentComponent(Component):

	# Agent core version
	VERSION = "1.0"

	"""
	Initialize AgentComponent component
	"""
	def __init__(self):
		Component.__init__(self)

		# Setup logger
		self.logger = logging.getLogger("agent")
		self.logger.debug("Agent component started")

		# Open a communication channel with the server on the external bus
		# (Currently that's the XMPP channel - but we prefer to be abstract)
		self.serverChannel = Config.EBUS.openChannel( Config.SERVER_CHANNEL )

		# TODO: Uhnack this
		# This establishes a presence relationship with the given entity.
		if isinstance(Config.EBUS, XMPPBus):
			Config.EBUS.updateRoster( Config.SERVER_CHANNEL, name="Server", subscription="both" )

		# Bind incoming message handlers
		self.serverChannel.on('job_start', self.onJobStart)
		self.serverChannel.on('job_cancel', self.onJobCancel)
		self.serverChannel.on('close', self.onDisconnect)

	"""
	[State] Establish server handshake
	"""
	def stateHandshake(self):
		self.logger.debug("Entering state: HANDSHAKE")
		try:

			# Send handshake message to the bus and retrive
			# initial acknowledgement
			ans = self.serverChannel.send('handshake', {
					'version': AgentComponent.VERSION,
					'slots': 1
				}, waitReply=True)

			# Check for errors on handshake
			if ans == None:
				self.logger.warn("No job manager was found online")
				self.schedule(self.stateRetry)

			# Handshake complete
			# (Everything else is asynchronous)
			self.logger.info("Handhake with server completed: %s" % str(ans))

		except BusChannelException as e:

			# There was an error, switch to retry state
			self.schedule(self.stateRetry)
			self.logger.warn("No reply from job manager")

	"""
	[State] Retry connection
	"""
	def stateRetry(self):
		self.logger.debug("Entering state: RETRY")
		
		# Wait some time and re-try handshake
		time.sleep(5)
		self.schedule(self.stateHandshake)

	"""
	Bus connection lost
	"""
	def onDisconnect(self):
		self.logger.info("Server channel connection lost")

		# We lost the interaction with the server.
		# Try to do handshake again and if it failed, 
		# follow the retry protocol from there
		self.schedule(self.stateHandshake)

	"""
	Bus message arrived to start job
	"""
	def onJobStart(self, message):
		pass

	"""
	Bus message arrived to cancel a running job
	"""
	def onJobCancel(self, message):
		pass

	"""
	Entry point of the agent
	"""
	def run(self):
		
		# Start with the handshake
		self.schedule(self.stateHandshake)

		# Do component's default task : Wait
		Component.run(self)





