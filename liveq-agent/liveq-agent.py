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

import sys
import logging
import time
from liveq.config import Config
from liveq.internal.exceptions import *

# Load configuration
try:
	Config.readFile( "config/liveq.conf.local" )
except ConfigException as e:
	print("ERROR   Configuration exception: %s" % e)
	sys.exit(1)
except Exception as e:
	print("ERROR   Unexpected exception %s while reading configuration: %s" % (e.__class__.__name__, e))
	sys.exit(1)

# Configure logging
logging.basicConfig(level=Config.LOG_LEVEL, format='%(levelname)-8s %(message)s')

# ======== TEST
print Config.ADAPTER.SERVER

#adapter = Config.ADAPTER.instance({})
#adapter.connect()
#adapter.process(block=True)

runconfig = {

	# Run configuration
	"beam": "ee", 
	"process": "zhad", 
	"energy": 91.2, 
	"params": "-",
	"specific": "-",
	"generator": "pythia8",
	"version": "8.175",
	"events": 10000,
	"seed": 123123,

	# Tune configuration
	"tune": {
		"TimeShower:alphaSvalue": 0.31
	}

}

jobapp = Config.APP.instance({})
jobapp.setConfig( runconfig )
jobapp.start()
time.sleep(20)
jobapp.kill()