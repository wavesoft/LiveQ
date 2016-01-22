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

# Try to import either MySQLdb or pymysql
try:
	import MySQLdb as MySQL
except ImportError:
	import pymysql as MySQL

import logging
import random
import hashlib
import string

import tornado.escape
import liveq.data.js as js

from webserver.models import User
from webserver.config import ForumConfig

def mybb_salt(password, salt=None):
	"""
	Salt the given password using mybb templates
	"""

	# Generate password hash
	passHash = hashlib.md5(password).hexdigest()

	# Generate random salt
	if salt is None:
		salt = "".join([random.choice(string.letters + string.digits) for x in range(0,8)])

	# hash salt
	saltHash = hashlib.md5(salt).hexdigest()

	# Hash and return tuple
	return ( hashlib.md5("%s%s" % (saltHash, passHash)).hexdigest(), salt )

def getDBCursor():
	"""
	Establish a connection to the forum database
	"""

	# Get logger
	logger = logging.getLogger("forum-sync")

	# If there is no forum configured display a warning and return None
	if (not ForumConfig.FORUM_SERVER) or (not ForumConfig.FORUM_USER) or \
	   (not ForumConfig.FORUM_PASSWORD) or (not ForumConfig.FORUM_DB):
		logger.warn("Missing forum configuration, disabling forum sync")
		return None

	# Connect to SQL
	try:
		sql = MySQL.connect( ForumConfig.FORUM_SERVER, ForumConfig.FORUM_USER, \
							 ForumConfig.FORUM_PASSWORD, ForumConfig.FORUM_DB )
	except Exception as e:
		logger.exception(e)
		return None

	# Return a cursor
	return sql.cursor()

def forumUsernameExists(displayName):
	"""
	Check if such user exists
	"""

	# Open a database cursor
	c = getDBCursor()
	if c is None:
		return None

	# Lookup users with that username
	c.execute(
		"SELECT COUNT(*) FROM %susers WHERE (username = '%s')"
		% ( ForumConfig.FORUM_DB_PREFIX, displayName )
		)

	# Start fetching
	row = c.fetchone()
	if not row:
		return False
	if not row[0]:
		return False

	# User exists
	return True

def banForumUser(user):
	"""
	Ban a user from forum
	"""
	pass

def unbanForumUser(user):
	"""
	Un-ban a user from forum
	"""
	pass

def deleteForumReflection(user, wipe=False):
	"""
	Delete the username (or the entire user content if wipe=True) from
	the forum database
	"""

	# Open a database cursor
	c = getDBCursor()
	if c is None:
		return None

	# Get forum user ID
	uid = forumUidFromUser(user)

	# Delete using the user ID as key
	c.execute(
		"DELETE FROM %susers\
		 WHERE uid = %i"
		% ( ForumConfig.FORUM_DB_PREFIX, uid ) )

def registerForumUser(email, displayName, password, usergroup=2, title=""):
	"""
	Create a new user record in myBB for the given user
	"""

	# Open a database cursor
	c = getDBCursor()
	if c is None:
		return None

	# Salt password
	(uPass, uSalt) = mybb_salt(password)

	# Generate 50 random characters for loginKey
	loginKey = "".join([random.choice(string.letters + string.digits) for x in range(0,50)])

	# Create user
	c.execute(
		"INSERT INTO %susers (username,password,salt,loginkey,email,usertitle,usergroup,subscriptionmethod,allownotices,receivepms,pmnotice,pmnotify,showimages,showvideos,showsigs,showavatars,showquickreply,showredirect,timezone)\
		 VALUES ('%s', '%s', '%s', '%s', '%s', '%s', %i, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0)"
		% ( ForumConfig.FORUM_DB_PREFIX, displayName, uPass, uSalt, loginKey, email, title, usergroup ) )

def forumUidFromUser(user):
	"""
	Lookup the specified forum user from the 
	"""

	# Open a database cursor
	c = getDBCursor()
	if c is None:
		return 0

	# Lookup users with that username
	c.execute(
		"SELECT `uid` FROM %susers WHERE (username = '%s')"
		% ( ForumConfig.FORUM_DB_PREFIX, user.displayName )
		)

	# Fetch user ID
	row = c.fetchone()
	if not row:
		return 0
	return row[0]

def forumUserUnreadPMs(uid):
	"""
	Get the private messages of the specified user
	"""

	# Open a database cursor
	c = getDBCursor()
	if c is None:
		return []

	# Lookup PMS
	c.execute(
		"SELECT %sprivatemessages.pmid,\
			    %sprivatemessages.fromid, \
				%sprivatemessages.subject, \
				%sprivatemessages.dateline, \
				%susers.username\
				FROM %sprivatemessages INNER JOIN %susers ON %sprivatemessages.fromid = %susers.uid\
				WHERE (status = 0) AND (%sprivatemessages.uid = %i)\
				ORDER BY %sprivatemessages.pmid DESC"
		% ( ForumConfig.FORUM_DB_PREFIX, ForumConfig.FORUM_DB_PREFIX, ForumConfig.FORUM_DB_PREFIX,
			ForumConfig.FORUM_DB_PREFIX, ForumConfig.FORUM_DB_PREFIX, ForumConfig.FORUM_DB_PREFIX,
			ForumConfig.FORUM_DB_PREFIX, ForumConfig.FORUM_DB_PREFIX, ForumConfig.FORUM_DB_PREFIX,
			ForumConfig.FORUM_DB_PREFIX, uid, ForumConfig.FORUM_DB_PREFIX )
		)

	# Start fetching
	messages = []
	row = c.fetchone()
	while row:
		messages.append({
				'id': row[0],
				'fromid': row[1],
				'subject': row[2],
				'dateline': row[3],
				'from': row[4]
			})
		row = c.fetchone()

	# Return messages
	return messages
