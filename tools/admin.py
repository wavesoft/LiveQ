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

#import argparse
import traceback
import json
import os
import util.pythia as pythia
from util.config import Config

from liveq import handleSIGINT, exit
from liveq.exceptions import ConfigException

from liveq.models import *
from webserver.models import *

from webserver.common.users import HLUser
from webserver.common.forum import deleteForumReflection

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

def help():
	"""
	Show help screen
	"""

	print "usage: admin.py [command] [..]"
	print ""
	print "LiveQ Administration Command-Line interface"
	print ""
	print "commands:"
	print "  udelete [userid|username] 	Delete the specified user from the database."
	print "  ureset [userid|username] 	Reset the user profile."
	print ""
	exit(1)

def user_from_uid(uid):
	"""
	Return user object
	"""

	# Get according to type
	try:
		if uid.isdigit():
			return User.get( User.id == int(uid) )
		elif "@" in uid:
			return User.get( User.email == uid )
		else:
			return User.get( User.displayName == uid )
	except User.DoesNotExist:
		print "ERROR: User '%s' could not be found!" % uid
		exit(1)

def cmd_deluser(uid):
	"""
	Delete user 
	"""

	# Get user
	user = user_from_uid(uid)

	# Delete user
	user.delete_instance(recursive=True)

	# Inform user
	print "INFO: User '%s' deleted!" % uid

def cmd_resetuser(uid):
	"""
	Reset user
	"""

	# Get user
	user = user_from_uid(uid)

	# First delete forum reflection
	deleteForumReflection(user)

	# Get high-level interface to this user
	hluser = HLUser(user)

	# Reset
	hluser.reset()

	# Inform user
	print "INFO: User '%s' was reset!" % uid


# # Prepare argument parser
# parser = argparse.ArgumentParser(prog='admin.py', description='LiveQ Administration Command-Line interface.')
# parser.add_argument('command', type=str, nargs='?',
#                   help='the command to process')
# args = parser.parse_args()

# Handle commands
if len(sys.argv) < 2:
	help()

# Get command
args = list(sys.argv[1:])
command = args.pop(0)

# Handle command
try:
	if command == "udelete":
		
		# Forward command
		cmd_deluser( *args )
		exit(0)

	else:

		print "ERROR: Unknown command '%s'" % command
		exit(1)

except Exception as e:

	print "ERROR: %s Exception while handling your request! %s" % (e.__class__.__name__, str(e))
	traceback.print_exc()
	exit(2)	


