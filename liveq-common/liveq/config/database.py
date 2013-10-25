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

import ConfigParser
import logging

from playhouse.proxy import Proxy
from liveq.config import configexceptions
from liveq.config.classes import DatabaseConfigClass

class DatabaseConfig:
	"""
	Database configuration class
	Agents can include this class if they require a database configuration
	"""

	# Relational database instance and confguration that uses PeeWee for the ORM

	#: Database driver class
	DB_CLASS = ""

	#: Database configuration variables
	DB_CONFIG = None

	#: The instance of the configuration class
	DB_INSTANCE = None

	#: The database object that can be used by PeeWee functions
	#: right-away. Even if there is no ``Config`` instance yet, 
	#: this can be accessed as a ``DatabaseConfig.DB`` property.
	DB = Proxy()

	@staticmethod
	@configexceptions(section="database")
	def fromConfig(config, runtimeConfig):
		"""
		Update class variables by reading the config file
		contents of the specified filename
		"""

		# Populate classes
		DatabaseConfig.DB_CLASS = config.get("database", "class")
		DatabaseConfig.DB_CONFIG = DatabaseConfigClass.fromClass( DatabaseConfig.DB_CLASS, config._sections["database"] )

		# Since we are using proxy, delegate the connection to the proxy
		DatabaseConfig.DB_INSTANCE = DatabaseConfig.DB_CONFIG.instance(runtimeConfig)
		DatabaseConfig.DB.initialize( DatabaseConfig.DB_INSTANCE )
