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

# This script imports all tunables from a Pythia8 installation

# ----------
import os
import sys
sys.path.append("%s/liveq-common" % os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
# ----------

import json
import os
import util.pythia as pythia
from util.config import Config

from liveq import handleSIGINT, exit
from liveq.exceptions import ConfigException
from liveq.models import Tunable

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
	print "Tunables Import Script - Import tunable configuration from Pythia8"
	print "Usage:"
	print ""
	print " import-tunables.py <path to pythia source>"
	print ""
	sys.exit(1)

# Check if we have xmldir
if not os.path.isdir("%s/xmldoc" % sys.argv[1]):
	print "ERROR: Could not find %s/xmldoc!" % sys.argv[1]
	sys.exit(1)

# Load tunables
tunables = pythia.parseXMLDoc("%s/xmldoc" % sys.argv[1])

# Import them
for k,v in tunables.iteritems():
	print "Importing %s..." % k,

	# Check if it exists
	if Tunable.select().where(Tunable.name == k).exists():
		print "exists"
		continue

	# Create new entry
	t = Tunable(name=k)

	# Unless overriden title is the name
	t.title = k

	# Basic
	t.type = v['type']
	t.short = v['short']
	t.group = v['group']
	t.subgroup = v['subgroup']
	t.desc = v['desc']

	# Value information
	if ('min' in v) and (v['min'] != None):
		t.min = v['min']
	if ('max' in v) and (v['max'] != None):
		t.max = v['max']
	if ('default' in v) and (v['default'] != None):
		t.default = v['default']
	if ('dec' in v) and (v['dec'] != None):
		t.dec = v['dec']

	# Serialize options
	if 'options' in v:
		t.setOptions(v['options'])
	else:
		t.options = '[]'

	# Save record
	t.save()
	print "ok"


