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

import sys
sys.path.append("../liveq-common")

import logging
import time
import signal
import sys

from liveq.events import GlobalEvents
from liveq.exceptions import ConfigException

import ConfigParser
from liveq.config import configexceptions
from liveq.config.core import CoreConfig
from liveq.config.database import DatabaseConfig
from liveq.config.store import StoreConfig
from liveq.config.internalbus import InternalBusConfig
from liveq.config.externalbus import ExternalBusConfig

"""
Create a configuration for the JOB MANAGER based on the core config
"""
class Config(CoreConfig, ExternalBusConfig):

	"""
	Update class variables by reading the config file
	contents of the specified filename
	"""
	@staticmethod
	def fromFile(files):

		# Read config file(s)
		config = ConfigParser.SafeConfigParser()
		config.read(files)

		# Initialize subclasses
		CoreConfig.fromConfig( config )
		ExternalBusConfig.fromConfig( config )

# Parse configuration
try:
	Config.fromFile("config/test.conf")
except ConfigException as e:
	print "Configuration error: %s" % str(e)
	sys.exit(1)

# Register CTRL+C Handler
def signal_handler(signal, frame):
	logging.info("** Caught signal. Shutting down **")
	GlobalEvents.System.trigger('shutdown')
	sys.exit(0)
signal.signal(signal.SIGINT, signal_handler)

# Open a channel to the other endpoint
logging.debug("**** OPPENING CHANNEL *****")
print str(Config.EBUS)

c = Config.EBUS.openChannel("jmliveq@t4t-xmpp.cern.ch/local")
logging.debug("**** CHANNEL OPEN *****")

# Infinite loop
while True:

	# Send message every 10 seconds
	time.sleep(10)
	c.send("test", { "a": "message" })

