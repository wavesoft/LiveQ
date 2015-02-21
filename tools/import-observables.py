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

# This script imports all Observables from a Rivet source directory

# ----------
import sys
sys.path.append("../liveq-common")
# ----------

import json
import os
import util.rivetHistos as Rivet
from util.config import Config

from liveq import handleSIGINT, exit
from liveq.exceptions import ConfigException
from liveq.models import Observable

# Prepare runtime configuration
runtimeConfig = { }

# Load configuration
try:
	Config.fromFile( "config/common.conf.local", runtimeConfig )
except ConfigException as e:
	print("ERROR   Configuration exception: %s" % e)
	exit(1)

# Hook CTRL+C
handleSIGINT()

# Ensure we have at least one parameter
if (len(sys.argv) < 2) or (not sys.argv[1]):
	print "Observables Import Script - Import histogram configuration from Rivet"
	print "Usage:"
	print ""
	print " import-observables.py <path to rivet source>"
	print ""
	sys.exit(1)

# Check if we have xmldir
if not os.path.isdir("%s/data/plotinfo" % sys.argv[1]):
	print "ERROR: Could not find %s/data/plotinfo!" % sys.argv[1]
	sys.exit(1)
if not os.path.isdir("%s/data/refdata" % sys.argv[1]):
	print "ERROR: Could not find %s/data/refdata!" % sys.argv[1]
	sys.exit(1)

# Load observables
observables = Rivet.parsePlotData("%s/data/plotinfo" % sys.argv[1], "%s/data/refdata" % sys.argv[1])

# Import them
for k,v in observables.iteritems():
	print "Importing %s..." % k,

	# Check if it exists
	if Observable.select().where(Observable.name == k).exists():
		print "exists"
		continue

	# Create new entry
	t = Observable(name=k)


	# Save record
	#t.save()
	print "ok"


