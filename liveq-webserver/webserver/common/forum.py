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

import logging
import MySQLdb

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

	# Connect to SQL
	try:
		sql = MySQLdb.connect( ForumConfig.FORUM_SERVER, ForumConfig.FORUM_USER, \
							   ForumConfig.FORUM_PASSWORD, ForumConfig.FORUM_DB )
	except Exception as e:
		logger.exception(e)
		return None

	# Return a cursor
	return sql.cursor()

def registerForumUser(email, password, usergroup=2, title=""):
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
		"INSERT INTO %susers (username,password,salt,loginkey,email,usertitle,usergroup,allownotices,receivepms,pmnotice,pmnotify,showimages,showvideos,showsigs,showavatars,showquickreply,showredirect,timezone)\
		 VALUES ('%s', '%s', '%s', '%s', '%s', %i, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0)"
		% ( ForumConfig.FORUM_DB_PREFIX, email, uPass, uSalt, loginKey, email, title, usergroup ) )
