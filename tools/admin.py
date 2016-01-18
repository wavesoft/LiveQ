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

# Common administration interface for platform operations

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

@command("listawardusers", help="Find users deserving an award.")
def cmd_find_listawardusers():
	"""
	Delete user 
	"""

	# Collect user information
	users = [ ]

	# Get all users
	#for user in User.select().where( User.analyticsProfile != None, User.playTime >= 3600000 ):
	mark_date = datetime.datetime.strptime("2015-08-05 00:00:00", "%Y-%m-%d %H:%M:%S")
	for user in User.select().where( User.analyticsProfile != None, User.created >= mark_date ):

		# Get properties
		v = json.loads(user.variables)
		first_time = v.get('first_time', {})
		level_counters = user.getState("partcounters", {})

		# Get level counters
		total = 0
		unlocked = 0
		for k,v in level_counters.iteritems():
			total += v.get("total", 0)
			unlocked += v.get("unlocked", 0)

		# Calculate percentage
		if total == 0:
			percent = 0
		else:
			percent = int(float(unlocked) * 100.0 / total)
		preeval = 'learningeval.pre' in first_time
		posteval = 'learningeval.post' in first_time

		# Collect info
		users.append({
				"uid": user.id,
				"email": user.email,
				"name": user.displayName,
				"percent": percent,
				"preeval": preeval,
				"posteval": posteval,
				"points": user.totalPoints,
				"playHours": "%0.2f" % (float(user.playTime) / 3600000.0),
			})

	# Sort users
	users.sort(lambda a,b: (b['percent']*10 + int(float(b['playHours'])) + int(b['posteval'])*20000) - \
						   (a['percent']*10 + int(float(a['playHours'])) + int(a['posteval'])*20000) )

	# Print
	print_table(
		users,
		["uid", "email", "name", "points", "percent", "playHours", "posteval"],
		["ID", "EMail", "Name", "Points", "Completed %", "Play hours", "Post-Eval"]
	)


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
				targets.append( line.strip() )

	elif not '@' in target:
		print "ERROR: '%s' is not a filename (list of e-mails) nor an e-mail address!"
		exit(1)

	# Compile macros from targets
	macros = []
	for t in targets:

		# Get the user account
		try:
			user = User.get( User.email == t )
			macros.append( user.serialize() )
		except User.DoesNotExist:
			print "WARNING: Using dummy record for target '%s' because a VAS user with this e-mail does not exist" % line
			macros.append( { 'displayName': 'player' } )

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
		macros,
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
			.select( User.id, User.displayName, User.email, User.points, User.totalPoints, User.playTime )
			.dicts(),
		["id", "displayName", "email", "points", "totalPoints", "playTime" ],
		["ID", "Display Name", "E-Mail", "Points", "Total Points", "Play Time" ]
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

@command("console", help="Start a python console with the environment initialized.")
def cmd_console():
	"""
	Start python console
	"""

	# Open interpreter
	import code
	code.interact(local=locals())

@command("exportdb", args=["file.sql"], help="Export the game database in the specified SQL file.")
def cmd_exportdb(filename):
	"""
	Dump game database in an SQL file
	"""

	import time
	from util.peeweedump import SQLExport

	# Start dumping
	with open(filename, 'w') as toFile:

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

		# Dump tunable-to-observable correlations
		SQLExport(toFile, TunableToObservable, TunableToObservable.select())

		# Dump all tootr animations
		SQLExport(toFile, TootrAnimation, TootrAnimation.select())

		# Dump all tootr interface tutorials
		SQLExport(toFile, TootrInterfaceTutorial, TootrInterfaceTutorial.select())

		# Dump all tunables
		SQLExport(toFile, Tunable, Tunable.select())

		# Export Questionnaires
		SQLExport(toFile, Questionnaire, Questionnaire.select())

@command("updatedb", help="Apply outstanding database patches.")
def cmd_updatedb():
	"""
	Apply outstanding database patches
	"""

	from data.schemapatches import SchemaPatches
	from playhouse.migrate import MySQLMigrator

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
		print "Schema upgrade from version %i to version %i" % (dbVersion, newVersion)

		# Create migrator
		migrator = MySQLMigrator( Config.DB )

		# Perform patches
		for i in range(dbVersion, newVersion):

			# Run patch in a transaction
			with Config.DB.transaction():
				print "- Patch #%i..." % (i+1)
				getattr(patches, functions[i])(migrator)

	# Update version record
	verInfo.val = "%i" % newVersion
	verInfo.save()

	# We are done
	print "Your database is now on version %i" % newVersion

@command("controlworkers", args=["action"], help="Send a control command to all job agents.")
def cmd_controlworkers(action):
	"""
	Find all agents, open output channel and send data
	"""

	# Include job manager API
	sys.path.append("%s/liveq-jobmanager" % os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
	import jobmanager.io.agents as agents

	# Init EBUS
	Config.initEBUS()

	# Open a control channel to each agent and send command
	for agent in agents.getOnlineAgents():

		# Get channel
		channel = Config.EBUS.openChannel( agent.uuid )

		# Send and wait reply
		ans = channel.send("agent_control", { "action": action }, waitReply=True, timeout=1)
		print "- Sending '%s' to %s..." % ( action, agent.uuid),
		if ans is None:
			print "timeout"
		else:
			if 'error' in ans:
				print "%s (%s)" % (ans['result'], ans['error'])
			else:
				print ans['result']

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


