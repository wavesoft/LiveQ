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

#import argparse
import traceback
import json
import os
import util.pythia as pythia

from util import print_table
from util.wsconfig import Config

from liveq import handleSIGINT, exit
from liveq.exceptions import ConfigException

from liveq.models import *

from webserver.models import *
from webserver.common.users import HLUser
from webserver.common.forum import deleteForumReflection
from webserver.common.email import EMailTemplate

# Prepare runtime configuration
runtimeConfig = { }

################################################################
# Helper functions
################################################################

# Helper for collecting commands
COMMAND_REGISTRY = {}
def command(command, args=[], help=""):
	def decorator(f):
		COMMAND_REGISTRY[command] = {
			'fn': f,
			'args': args,
			'help': help
		}
		return f
	return decorator

def help():
	"""
	Show help screen
	"""

	print "usage: admin.py [command] [..]"
	print ""
	print "LiveQ Administration Command-Line interface"
	print "The following commands are available:"
	print ""

	# Find the longest command in the list
	maxlen = 5
	for cmd in COMMAND_REGISTRY.keys():
		if len(cmd) > maxlen:
			maxlen = len(cmd)

	# Print commands
	for cmd, details in COMMAND_REGISTRY.iteritems():

		# Print command
		sys.stdout.write((" %%%is " % maxlen) % cmd,)

		# If arguments, dump them in the same line
		if len(details['args']) > 0:
			for a in details['args']:
				sys.stdout.write("[%s] " % a)
			sys.stdout.write("\n")
			sys.stdout.write(" " * (maxlen+2))

		# Then write help text
		print "%s\n" % details['help']
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

################################################################
# Administration Commands definition
################################################################

@command("deluser", args=["uid|email|name"], help="Delete the specified user from the database.")
def cmd_deluser(uid):
	"""
	Delete user 
	"""

	# Get user
	user = user_from_uid(uid)

	# First delete forum reflection
	deleteForumReflection(user)

	# Delete user
	user.delete_instance(recursive=True)

	# Inform user
	print "SUCCESS: User '%s' deleted!" % uid

@command("resetuser", args=["uid|email|name"], help="Reset the user profile.")
def cmd_resetuser(uid):
	"""
	Reset user
	"""

	# Get user
	user = user_from_uid(uid)

	# Get high-level interface to this user
	hluser = HLUser(user)

	# Reset
	hluser.reset()

	# Inform user
	print "SUCCESS: User '%s' was reset!" % uid

@command("batchmail", args=[ "template", "email|file" ], help="Send the specified e-mail template to the specified batch of e-mails.")
def cmd_batch_mail(template, target):
	"""
	Send a batch message to the specified list of recepients
	"""

	# Prepare e-mail list
	targets = [target]

	# Check if template is a file
	if not os.path.isfile(template):
		print "ERROR: '%s' is not a filename! Expecting an e-mail template" % template
		exit(1)

	# Check if target is a file
	if os.path.isfile(target):
		print "INFO: Reading e-mails from %s" % target

		# Reset e-mail list
		targets = []

		# Read e-mails from list
		with open(target, 'r') as f:
			for line in f:

				# Chomp eol for linux and windows
				if line[:-1] == "\n":
					line = line[0:-1]
				if line[:-1] == "\r":
					line = line[0:-1]

				# Check if this is a valid e-mail
				if not '@' in line:
					print "WARNING: Skipping line '%s' because is not a valid e-mail" % line
					continue

				# Put on list
				targets.append( line )

	elif not '@' in target:
		print "ERROR: '%s' is not a filename (list of e-mails) nor an e-mail address!"
		exit(1)

	# Inform about submission
	print "INFO: Sending e-mails to %i target(s)" % len(targets)

	# Load template
	with open(template, 'r') as f:
		print "INFO: Loading e-mail template from '%s'" % template
		tpl = EMailTemplate(f.read())

	# Send now
	Config.EMAIL.send(
		targets,
		tpl.subject,
		tpl.text,
		tpl.html,
		)

	# Inform user
	print "SUCCESS: E-mails were sent!"

@command("sendvalidation", help="Send the e-mail validation mail to all users that are not yet validated.")
def cmd_alpha_invite():
	"""
	Re-send activation e-mail to users that have not yet activated their e-mail
	"""

	# Load template
	mailTpl = "%s/liveq-webserver/config/email/verify.tpl" % os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
	with open(mailTpl, 'r') as f:
		print "INFO: Loading e-mail template from '%s'" % mailTpl
		tpl = EMailTemplate(f.read())


	# Select all the user sith non-validated e-mails
	for user in User.select().where( User.status == 0 ):

		# Send e-mails
		print "INFO: Requesting user '%s' to activate the e-mail '%s'" % (user, user.email)

@command("listusers", help="Display a list of all the registered users")
def cmd_listusers():
	"""
	List users in the database
	"""

	# Banner
	print "The following users are registered:"
	print ""

	# Table
	print_table(
		User\
			.select( User.id, User.displayName, User.email, User.points, User.totalPoints )
			.dicts(),
		["id", "displayName", "email", "points", "totalPoints" ],
		["ID", "Display Name", "E-Mail", "Points", "Total Points" ]
		)

	# Footer
	print ""

@command("workersonline", help="Display a list of all the on-line worker nodes")
def cmd_onlineworkers():
	"""
	List the on-line worker nodes along with other information
	"""

	# Banner
	print "The following workers are on-line:"
	print ""

	# Table
	print_table(
		Agent\
			.select( Agent, AgentGroup.uuid.alias("group_uuid") )
			.where( Agent.state == 1 )
			.join( AgentGroup )
			.dicts(),
		["id", "uuid", "ip", "version", "lastActivity", "group_uuid", "fail_count", "activeJob"],
		["ID", "Agent Jabber ID", "IP", "Ver", "Last Activity", "Group", "Fail", "Job"]
		)

	# Footer
	print ""

@command("workerspurgeidle", help="Purge idle workers")
def cmd_workers_purge_idle():
	"""
	"""

	# Get all idle workers
	q = Agent.lastActivity

#####################s###########################################
# Administration Interface Entry Point
################################################################

if __name__ == "__main__":

	# Handle commands
	if len(sys.argv) < 2:
		help()

	# Get command
	args = list(sys.argv[1:])
	command = args.pop(0)

	# Handle command
	try:

		# Lookup command
		if not command in COMMAND_REGISTRY:
			print "ERROR: Unknown command '%s'" % command
			exit(1)

		else:

			# Get command
			cmd = COMMAND_REGISTRY[command]

			# Load configuration
			try:
				Config.fromFile( "config/common.conf.local", runtimeConfig )
			except ConfigException as e:
				print("ERROR: Configuration exception: %s" % e)
				exit(1)

			# Hook CTRL+C
			handleSIGINT()

			# Require specified number of arguments
			if len(args) < len(cmd['args']):
				print "ERROR: Incorrect number of arguments! Expecting %i" % len(cmd['args'])
				exit(1)

			# Call function
			cmd['fn']( *args )

			# Exit
			exit(0)	

	except Exception as e:

		print "ERROR: %s Exception while handling your request! %s" % (e.__class__.__name__, str(e))
		traceback.print_exc()
		exit(2)	


