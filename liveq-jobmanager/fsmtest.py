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

from jobmanager.config import Config
from jobmanager.component import JobManagerComponent

from liveq import handleSIGINT
from liveq.events import GlobalEvents
from liveq.exceptions import ConfigException

from liveq.utils.fsm import StoredFSM, state_handler, event_handler

# Prepare runtime configuration
runtimeConfig = { }

# Load configuration
try:
	Config.fromFile( "config/jobmanager.conf.local", runtimeConfig )
except ConfigException as e:
	print("ERROR   Configuration exception: %s" % e)
	sys.exit(1)

# Hook sigint -> Shutdown
handleSIGINT()

# Create an FSM class
class MyFSM(StoredFSM):

	@state_handler("init")
	def stateMain(self):
		print "[STATE] Main"

		self.counter = 0
		self.when = time.time()
		self.goto("ping")

	@state_handler("ping")
	def statePing(self):
		print "*** PING ***"

		self.counter += 1
		self.goto("pong")

	@state_handler("pong")
	def statePong(self):
		print "*** PONG (%i) ***" % self.counter

		if self.counter < 100:
			self.goto("ping")

	@event_handler("boo", on=['pong'])
	def handleBoo(self):
		print "((((( I AM SCARED ))))))"
		time.sleep(2.5)
		self.goto("init")
		


# Get a new FSM instance
inst = MyFSM.get("kaboom32")

while True:

	# Sleep for 5 seconds
	time.sleep(5)

	# Boo the instance every 5 seconds
	#inst.event("boo")
	MyFSM.dispatch("kaboom32", "boo")