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
import uuid
import json

from jobmanager.config import Config
from jobmanager.component import JobManagerComponent

from liveq import handleSIGINT, exit
from liveq.events import GlobalEvents
from liveq.exceptions import ConfigException
from liveq.models import *

# Prepare runtime configuration
runtimeConfig = { }

# Load configuration
try:
	Config.fromFile( "config/jobmanager.conf.local", runtimeConfig )
except ConfigException as e:
	print("ERROR   Configuration exception: %s" % e)
	sys.exit(1)

# Prepare fixed parameters
fxParameters = {
	"beam": "ee", 
	"process": "zhad", 
	"energy": 91.2, 
	"params": "-",
	"specific": "-",
	"generator": "pythia8",
	"version": "8.175",
	"events": 10000,
	"seed": 123123
}

# Prepare the tunable parameters
tnParameters = {
	"TimeShower:alphaSvalue": {
		"min": 0.01,
		"max": 1,
		"dec": 2,
		"type": "slider"
	}
}

# Prepare the histogram names
hNames = [
	'SLD_2002_S4869273_d01-x01-y01',
	'OPAL_2004_S6132243_d19-x01-y01'
]

# Create a default lab
lab = Lab()
lab.uuid = '3e63661c13854de7a9bdeed71be16bb9'
lab.repoTag = "1677"
lab.repoURL = "http://svn.cern.ch/guest/mcplots/trunk/scripts/mcprod"
lab.setParameters(fxParameters)
lab.setTunables(tnParameters)
lab.setHistograms(hNames)
lab.save()

exit(0)