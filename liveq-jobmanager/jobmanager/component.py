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

from jobmanager.config import Config

from liveq.io.bus import BusChannelException
from liveq.component import Component

from liveq.classes.bus.xmppmsg import XMPPBus

"""
Core jobmanager
"""
class JobManagerComponent(Component):

	"""
	Setup job manager
	"""
	def __init__(self):
		Component.__init__(self)

		# Setup logger
		self.logger = logging.getLogger("agent")
		self.logger.info("JobManager component started")

		# TODO: Uhnack this
		# This establishes a presence relationship with the given entity.
		if isinstance(Config.EBUS, XMPPBus):
			for jid in Config.TRUSTED_CHANNELS:
				Config.EBUS.updateRoster( jid, name="Server", subscription="both" )

		# Register the arbitrary channel creations that can happen
		# when we have an incoming agent handshake
		Config.EBUS.on('channel', self.onChannelCreation)

		# Channel mapping
		self.channels = { }

	"""
	Callback when a channel is up
	"""
	def onChannelCreation(self, channel):
		self.logger.warn("[%s] Channel created" % channel.name)

		# Store on local map
		self.channels[channel.name] = channel

		# Handle bus messages and evnets
		channel.on('open', self.onOpen, channel=channel)
		channel.on('close', self.onClose, channel=channel)
		channel.on('handshake', self.onHandshake, channel=channel)

	"""
	Callback when an agent becomes available
	"""
	def onOpen(self, channel=None):
		self.logger.warn("[%s] Channel is open" % channel.name)

	"""
	Callback when an agent becomes unavailable
	"""
	def onClose(self, channel=None):
		self.logger.warn("[%s] Channel is open" % channel.name)

	"""
	Callback when a handshake arrives in the bus
	"""
	def onHandshake(self, message, channel=None):
		self.logger.warn("[%s] Handshaking" % channel.name)

		# Reply with some data
		channel.reply({
				'some': 'data'
			})

	"""
	Entry point
	"""
	def run(self):

		# Start main FSM

		# Run the component
		Component.run(self)