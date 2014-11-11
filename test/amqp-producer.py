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
import random

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

class ProducerClass:

	INDEX = 0

	def __init__(self, outChannel):
		self.outChannel = outChannel
		self.uuid = uuid.uuid4().hex

		ProducerClass.INDEX += 1
		self.index = ProducerClass.INDEX

		# Create random payload
		self.data = ""
		for i in range(0,128):
			self.data += chr(32+int(random.random()*64))

		# Open a channel where to receive data from
		self.inChannel = Config.IBUS.openChannel("data-%s" % self.uuid, serve=True)
		self.inChannel.on("response", self.onResponse)

		# Send checksum request
		logging.info("------ [%i] Placing request ------" % self.index)
		ans = self.outChannel.send("checksum", {
				"data": self.data,
				"channel": "data-%s" % self.uuid
			}, waitReply=True)

		# Check reply
		if not ans:
			logging.error("++++++ [%i] Could not submit job ++++++" % self.index)
			return
		if not 'result' in ans:
			logging.error("++++++ [%i] Invalid job result ++++++" % self.index)
			return
		if ans['result'] != 'ok':
			logging.error("++++++ [%i] Invalid job response ++++++" % self.index)
			return

	def onResponse(self, data):

		# Try to validate data
		expect = hashlib.sha512("%s:%s" % (data['salt'], self.data)).hexdigest()

		# Validate checksum
		if expect == data['checksum']:
			logging.info("------ [%i] Succsesful checksum ------" % self.index)
		else:
			logging.error("++++++ [%i] Invalid checksum ++++++" % self.index)		


class ProducerComponent(Component):

	def __init__(self):
		"""
		Validate
		"""
		Component.__init__(self)

		# Create a couple of producer classes
		self.numChannels = 1000
		self.channels = []

	def onChecksum(self, pkg):
		"""
		Prepare checksum and reply
		"""

		# Prepare reponse 
		salt = uuid.uuid4().hex
		frame = {
			"salt": salt,
			"checksum": hashlib.sha512("%s:%s" % (salt, pkg['data'])).hexdigest()
		}

		# Reply with ack
		self.channel.reply({
			'result': 'ok'
		})

		# Open target channel just to overload
		c = Config.IBUS.openChannel(pkg['channel'])
		c.send(frame)
		c.close()

	def run(self):
		"""
		Bind setup
		"""
		# Open channel to listen for incoming messages
		self.channel = Config.IBUS.openChannel("actions")
		self.channel.on("checksum", self.onChecksum)

		# Run component
		Component.run(self)

	def step(self):
		"""
		Send couple of messages in couple of channels
		"""

		# Create a couple of channels
		if self.numChannels > 0:
			self.channels.append(ProducerClass( self.channel ))
			self.numChannels -= 1

		time.sleep(0.1)

ProducerComponent.runThreaded()