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

import logging

from _mysql_exceptions import OperationalError
from peewee import MySQLDatabase
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

	def sql_error_handler(self, exception, sql, params, require_commit):
		"""
		Handle an exception that might have occured during execution.

		This function is mainly used to recover from OperationalError: (2006, 'MySQL server has gone away'),
		which is caused when MySQL server disconnects because of inactivity.
		"""

		# Chcek if we got an error, while in recovery mode
		if self.__recovering:
			self.logger.error("Re-raised exception %r (%r) during retry" % (exception.__class__, exception.args))
			raise OperationalError(2006, 'MySQL server has gone away, and we cannot recover!')

		# Check if we have an OperationalError of #2006 (MySQL server has gone away)
		self.logger.warn("Got Exception %r (%r). Will try to recover" % (exception.__class__, exception.args))
		if exception.__class__ is OperationalError:

			# Get exception number
			e_num = exception.args[0]
			if e_num == 2006:
				self.logger.info("Recovering SQL connection")

				# Reconnect
				self.close()
				self.connect()

				# Mark recovery
				self.__recovering = True
				# Re-execute query
				self.logger.info("Re-trying SQL Query")
				ans = self.execute_sql( sql, params, require_commit )
				# Reset recovery flag
				self.__recovering = False

				# Return response
				return ans

		else:

			# We can't handle this, use default handler
			return MySQLDatabase.sql_error_handler(self, exception, sql, params, require_commit)

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

