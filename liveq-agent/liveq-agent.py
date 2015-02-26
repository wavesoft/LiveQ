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

import os
import time
import logging

from agent.config import Config
from agent.component import AgentComponent

from liveq.reporting.postmortem import PostMortem
from liveq.exceptions import ConfigException
from liveq import handleSIGINT, exit

# Prepare runtime configuration
runtimeConfig = { }

# Load configuration
try:

	# Override configuration from command-line
	configFile = "config/agent.conf.local"
	if len(sys.argv) > 1:
		configFile = sys.argv[1]
		if not os.path.isfile(configFile):
			raise ConfigException("Config file %s does not exist" % configFile)

	# Load config file
	Config.fromFile( configFile, runtimeConfig )
	PostMortem.addGlobalConfig("global", Config)
	PostMortem.addGlobalInfo("version", "2.0")
	
except ConfigException as e:
	print("ERROR   Configuration exception: %s" % e)
	exit(1)

# Hook sigint -> Shutdown
handleSIGINT()

# Banner
logging.info("Starting agent %s" % Config.UUID)

# Start Agent
AgentComponent.runThreaded()
