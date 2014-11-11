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

class ConsumerComponent(Component):

	def onChecksum(self, pkg):
		"""
		Prepare checksum and reply
		"""

		# Prepare reponse 
		salt = uuid.uuid4().hex
		logging.info("############ Received job %s ############" % salt)
		frame = {
			"salt": salt,
			"checksum": hashlib.sha512("%s:%s" % (salt, pkg['data'])).hexdigest()
		}

		# Open target channel just to overload
		c = Config.IBUS.openChannel(pkg['channel'])
		c.send("response", frame)

		# Reply with ack
		self.channel.reply({
			'result': 'ok'
		})

		c.close()

	def run(self):
		"""
		Bind setup
		"""
		# Open channel to listen for incoming messages
		self.channel = Config.IBUS.openChannel("actions", serve=True)
		self.channel.on("checksum", self.onChecksum)

		# Run component
		Component.run(self)

ConsumerComponent.runThreaded()
