#!/usr/bin/env python
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

# This script imports all Tunables from a Pythia8 installation

# ----------
import os
import sys
sys.path.append("%s/liveq-common" % os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
sys.path.append("%s/liveq-webserver" % os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
# ----------

import time
import os
import util.pythia as pythia
from util.config import Config
from data.schemapatches import SchemaPatches

from liveq import handleSIGINT, exit
from liveq.exceptions import ConfigException

from liveq.models import *
from playhouse.migrate import *

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

# Identify the current database version
try:
	verInfo = DBInfo.get(key="version")
except DBInfo.DoesNotExist:
	verInfo = DBInfo.create(
		key="version",
		val="0"
		)
dbVersion = int(verInfo.val)

# Get the schema patches
patches = SchemaPatches()

# Sort all the patch_XXXX functions from
# the schema patches class
functions = sorted([x for x in dir(patches) if x[0:6] == "patch_"], key=lambda x: int(x[6:]))
newVersion = len(functions)

# Check if there is nothing to do
if dbVersion < newVersion:

	# Notify
	print "Will upgrade from version %i to %i" % (dbVersion, newVersion)

	# Create migrator
	migrator = MySQLMigrator( Config.DB )

	# Perform patches
	for i in range(dbVersion, newVersion):

		# Run patch in a transaction
		with Config.DB.transaction():
			print "Applying patch %i..." % (i+1)
			getattr(patches, functions[i])(migrator)

# Update version record
verInfo.val = "%i" % newVersion
verInfo.save()

# We are done
print "Your database is now on version %i" % newVersion

# We are done, exit
exit(0)
