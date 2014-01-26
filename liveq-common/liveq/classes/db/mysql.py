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

"""
MySQL Database Class

This class provides a MySQL connection to the peewee databse back-end.
"""

import time
import logging

#from _mysql_exceptions import OperationalError
from peewee import OperationalError, MySQLDatabase
from liveq.config.classes import DatabaseConfigClass

class DurableMySQLDatabase(MySQLDatabase):
	"""
	A DurableMySQLDatabase is an extension on the MySQLDatabase that re-connects if the
	connection has gone off.
	"""

	def init(self, database, **connect_kwargs):
		"""
		Override the initialization so we add extra variables
		"""

		# Call superclass
		MySQLDatabase.init(self, database, **connect_kwargs)

		# Get logger
		self.logger = logging.getLogger("MySQL")

		# Setup recovery flag
		self.__recovering = False 

	def execute_sql(self, sql, params=None, require_commit=True):
		"""
		Function to re-connect to server if it disconnects
		"""
		try:
			return MySQLDatabase.execute_sql(self, sql, params, require_commit)

		except OperationalError as e:

			# If we are recovering, re-raise
			if self.__recovering:
				raise

			# Check for "SQL server has gone away"
			if e.args[0] == 2006:

				# Reconnect
				self.close()
				self.connect()

				# Retry
				self.__recovering = True
				try:
					ans = MySQLDatabase.execute_sql(self, sql, params, require_commit)
					self.__recovering = False
					return ans
				except OperationalError as e:
					self.__recovering = False
					raise

			# Check for "Cannot connect to the SQL server"
			elif e.args[0] == 2002:
				pass


class Config(DatabaseConfigClass):
	"""
	Configuration endpoint for the MySQL
	"""

	"""
	Populate the database configuration
	"""
	def __init__(self,config):
		self.HOST = config['server']
		self.DATABASE = config['database']
		self.USERNAME = config['username']
		self.PASSWORD = config['password']

	"""
	Create an SQL instance
	"""
	def instance(self, runtimeConfig):
		return DurableMySQLDatabase(self.DATABASE, host=self.HOST, user=self.USERNAME, passwd=self.PASSWORD, threadlocals=True)

