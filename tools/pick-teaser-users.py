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

# ----------
import os
import sys
sys.path.append("%s/liveq-common" % os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
# ----------

import random
import json
import os
import util.pythia as pythia
from util.config import Config

from liveq import handleSIGINT, exit
from liveq.exceptions import ConfigException
from liveq.models import Tunable

from liveq.models import BaseModel
from peewee import *

class TeaserUsers(BaseModel):
	"""
	Model for the teaser users
	"""
	# Select teaser users
	class Meta:
		db_table = "teaser_users"
	# Teaser model fields
	id = IntegerField(primary_key=True)
	email = CharField(max_length=255, default="")
	ip = CharField(max_length=255, default="")
	host = CharField(max_length=255, default="")
	useragent = CharField(max_length=1024, default="")
	notified = IntegerField(default=0)

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
	print "Pick Teaser Users - Select random users from the teaser list"
	print "Usage:"
	print ""
	print " pick-teaser-users.py <number>"
	print ""
	exit(1)

# Get how many users to pick
i_users = int(sys.argv[1])

# Get all users that are not yet notified
users = TeaserUsers.select().where( TeaserUsers.notified == 0 )[:]

# Try to pick random sample
try:
	# Pick random sample
	users = random.sample( users, i_users )
except ValueError:
	# ValueError occurs when the sample is smaller
	pass

# List users and mark their records
for u in users:

	# Print e-mail
	print u.email

	# Update record
	u.notified = 1
	u.save()

# Exit
exit(0)

