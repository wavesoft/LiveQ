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
from util.peeweedump import SQLExport

from liveq import handleSIGINT, exit
from liveq.exceptions import ConfigException

from liveq.models import *
from webserver.models import *

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
	print "Game Database Dump Script - Export core game data for relocation"
	print "Usage:"
	print ""
	print " dump-game-db.py <path to sql file>"
	print ""
	exit(1)

# Start dumping
with open(sys.argv[1], 'w') as toFile:

	# Add a comment regarding the model name
	toFile.write("-- \n")
	toFile.write("-- Virtual Atom Smasher Data File\n")
	toFile.write("-- \n")
	toFile.write("-- Exported at %s\n" % time.strftime("%Y-%m-%d %H:%M:%S"))
	toFile.write("-- \n\n")

	# Import configuration
	toFile.write("SET NAMES utf8;\n");
	toFile.write("SET FOREIGN_KEY_CHECKS = 0;\n\n");

	# Public agent group
	SQLExport(toFile, AgentGroup, AgentGroup.select().where(
		AgentGroup.id == 1
		))

	# Dump all books
	SQLExport(toFile, Book, Book.select())

	# Dump all book questions
	SQLExport(toFile, BookQuestion, BookQuestion.select())

	# Dump all definitions
	SQLExport(toFile, Definition, Definition.select())

	# Dump all definitions
	SQLExport(toFile, FirstTime, FirstTime.select())

	# Dump all labs
	SQLExport(toFile, Lab, Lab.select())

	# Dump all machine parts
	SQLExport(toFile, MachinePart, MachinePart.select())

	# Dump all machine parts
	SQLExport(toFile, MachinePartStage, MachinePartStage.select())

	# Dump all observables
	SQLExport(toFile, Observable, Observable.select())

	# Dump newbie team
	SQLExport(toFile, Team, Team.select().where(
		Team.id == 1
		))

	# Dump all tootr animations
	SQLExport(toFile, TootrAnimation, TootrAnimation.select())

	# Dump all tootr interface tutorials
	SQLExport(toFile, TootrInterfaceTutorial, TootrInterfaceTutorial.select())

	# Dump all tunables
	SQLExport(toFile, Tunable, Tunable.select())

	# Export Questionnaires
	SQLExport(toFile, Questionnaire, Questionnaire.select())

# We are done, exit now
exit(0)
