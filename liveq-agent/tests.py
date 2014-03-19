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

import time
import logging

from agent.io.jobmanagers import JobManagers
from agent.config import Config

from liveq.exceptions import ConfigException
from liveq.debug.postmortem import PostMortem
from liveq import handleSIGINT, exit

# Prepare runtime configuration
runtimeConfig = { }

# Load configuration
try:
	Config.fromFile( "config/agent.conf.local", runtimeConfig )
except ConfigException as e:
	print("ERROR   Configuration exception: %s" % e)
	exit(1)

# Hook sigint -> Shutdown
handleSIGINT()

# Setup post-mortem
PostMortem.addGlobalConfig("global", Config)
PostMortem.addGlobalInfo("version", "2.0")


# Prepare post-mortem
from subprocess import Popen, PIPE

pm = PostMortem()
p = Popen(["C:\\windows\\system32\\help.exe"], stdout=PIPE)
pm.addProcess("C:\\windows\\system32\\help.exe", p, stdout=True)

time.sleep(2)
pm.complete()

print pm.sections
a = str(pm.sections)
print pm.toBuffer()
b = pm.toBuffer()

print "dump=%i, compress=%i" % (len(a),len(b))

# EXIT
exit(0)

# Banner
logging.info("Starting agent tests %s" % Config.UUID)

# Login to the server
jobmanagers = JobManagers( Config.SERVER_CHANNEL )

def hsFunction(channel):

	logging.info("Sending handshake to %s" % channel.name)	
	channel.send('handshake', {
		'version': 2,
		'slots': 0,
		'free_slots': 0,
		'group': 'debug'
	})
jobmanagers.handshakeFn(hsFunction)

# Pick JIDs
while True: 
	
	jobmanagers.process(0.5)
	print "--- Agent: %s" % jobmanagers.jid()
