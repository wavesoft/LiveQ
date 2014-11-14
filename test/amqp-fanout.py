#!/usr/bin/python
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

# ----------
import sys
sys.path.append("../liveq-common")
# ----------

import logging
import time
import signal
import sys
import hashlib
import uuid

from liveq.io.bus import Bus
from config import Config

from liveq import handleSIGINT, exit
from liveq.events import GlobalEvents
from liveq.exceptions import ConfigException
from liveq.component import Component

# Prepare runtime configuration
runtimeConfig = { }

# Load configuration
try:
	Config.fromFile( "config.local", runtimeConfig )
except ConfigException as e:
	print("ERROR   Configuration exception: %s" % e)
	exit(1)

# Hook sigint -> Shutdown
handleSIGINT()

host_id = uuid.uuid4().hex

class ConsumerComponent(Component):

	def __init__(self):
		Component.__init__(self)
		self.logger = logging.getLogger("consumer")

	def onMessage(self, pkg):
		"""
		Prepare checksum and reply
		"""

		self.logger.info("Got message from %s" % pkg['from'])

	def step(self):
		"""
		Called on every iteration to broadcast a message
		"""

		self.channel.send("message", { "from": host_id })
		time.sleep(0.01)

	def run(self):
		"""
		Bind setup
		"""

		self.logger.info("Host ID: %s"  % host_id)

		# Open channel to listen for incoming messages
		self.channel = Config.IBUS.openChannel("actions", flags=Bus.OPEN_BIND|Bus.OPEN_BROADCAST)
		self.channel.on("message", self.onMessage)

		# Run component
		Component.run(self)

ConsumerComponent.runThreaded()
