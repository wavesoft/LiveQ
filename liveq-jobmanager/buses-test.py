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
from liveq import handleSIGINT, exit

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
class Config(CoreConfig, InternalBusConfig):

	"""
	Update class variables by reading the config file
	contents of the specified filename
	"""
	@staticmethod
	def fromFile(files, runtimeConfig):

		# Read config file(s)
		config = ConfigParser.SafeConfigParser()
		config.read(files)

		# Initialize subclasses
		CoreConfig.fromConfig( config, runtimeConfig )
		InternalBusConfig.fromConfig( config , runtimeConfig )

# Parse configuration
try:
	Config.fromFile("config/test.conf.local", { })
except ConfigException as e:
	print "Configuration error: %s" % str(e)
	sys.exit(1)

# Register CTRL+C handler
handleSIGINT()

doneFlag = False

def cb_data(msg):
	print "*** DATA!!!"

def cb_done(msg):
	print "*** DONE (res=%i) :D" % msg['result']
	doneFlag = True

jobChannel = Config.IBUS.openChannel("jobs")
responseChannel = Config.IBUS.openChannel("job-responses", serve=True)

responseChannel.on('job_data', cb_data)
responseChannel.on('job_completed', cb_done)

ans = jobChannel.send('job_start', {
		'lab': "3e63661c13854de7a9bdeed71be16bb9",
		'group': 'c678c82dd5c74f00b95be0fb6174c01b',
		'dataChannel': responseChannel.name,
		'parameters': {
			"TimeShower:alphaSvalue": 0.31
		}
	}, waitReply=True)

if not ans:
	print "**** ERROR: I/O Error"
	exit(1)

if ans['result'] == 'error':
	print "**** ERROR: %s" % ans['error']
	exit(1)

print "*** STARTED: %s" % ans['jid']

#time.sleep(5)

#print "*** CANCELLING..."
#ans = jobChannel.send('job_cancel', {
#		'jid': ans['jid']
#	}, waitReply=True)

print "*** RESULT: %r" % ans

while not doneFlag:
	time.sleep(1)

# Exit
exit(0)