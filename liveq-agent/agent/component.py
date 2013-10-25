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
from liveq.utils.fsm import FSM

class AgentComponent(Component, FSM):
	"""
	Core agent
	"""

	# Agent core version
	VERSION = "1.0"

	def __init__(self):
		"""
		Initialize AgentComponent component
		"""
		Component.__init__(self)
		FSM.__init__(self)

		# Setup logger
		self.logger = logging.getLogger("agent")
		self.logger.debug("Agent component started")

		# Open a communication channel with the server on the external bus
		# (Currently that's the XMPP channel - but we prefer to be abstract)
		self.serverChannel = Config.EBUS.openChannel( Config.SERVER_CHANNEL )

		# TODO: Uhnack this
		# This establishes a presence relationship with the given entity.
		if isinstance(Config.EBUS, XMPPBus):
			self.logger.debug("Subscribing %s to my roster" % Config.SERVER_CHANNEL)
			Config.EBUS.send_presence(pto=Config.SERVER_CHANNEL, ptype='subscribe')

		# Bind incoming message handlers
		self.serverChannel.on('job_start', self.onJobStart)
		self.serverChannel.on('job_cancel', self.onJobCancel)
		self.serverChannel.on('close', self.onDisconnect)

		# Start with the handshake
		self.schedule(self.stateHandshake)

	def stateHandshake(self):
		"""
		[State] Establish server handshake
		"""
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
				return

			# Handshake complete
			# (Everything else is asynchronous)
			self.logger.info("Handhake with server completed: %s" % str(ans))

		except BusChannelException as e:

			# There was an error, switch to retry state
			self.schedule(self.stateRetry)
			self.logger.warn("No reply from job manager")

	def stateRetry(self):
		"""
		[State] Retry connection
		"""
		self.logger.debug("Entering state: RETRY")
		
		# Wait some time and re-try handshake
		time.sleep(5)
		self.schedule(self.stateHandshake)

	def onDisconnect(self):
		"""
		Bus connection lost
		"""
		self.logger.info("Server channel connection lost")

		# We lost the interaction with the server.
		# Try to do handshake again and if it failed, 
		# follow the retry protocol from there
		self.schedule(self.stateHandshake)

	def onJobStart(self, message):
		"""
		Bus message arrived to start job
		"""
		pass

	def onJobCancel(self, message):
		"""
		Bus message arrived to cancel a running job
		"""
		pass

	def step(self):
		"""
		Run the next cycle of the FSM
		"""
		self.continueFSM()
		time.sleep(0.5)
