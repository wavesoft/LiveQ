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
import os.path

from liveq.config.core import CoreConfig
from liveq.config.store import StoreConfig
from liveq.config.internalbus import InternalBusConfig
from liveq.config.externalbus import ExternalBusConfig
from liveq.config.database import DatabaseConfig
from liveq.config.histograms import HistogramsConfig
from liveq.config.email import EmailConfig
from liveq.models import createBaseTables
from webserver.config import ForumConfig

"""
Create a configuration for the TOOLS based on the core config plus webserver forum
"""
class Config(CoreConfig, StoreConfig, InternalBusConfig, ExternalBusConfig, DatabaseConfig, HistogramsConfig, EmailConfig, ForumConfig):

	# Keep for delay initialization
	_config = {}
	_runtimeConfig = {}

	"""
	Update class variables by reading the config file
	contents of the specified filename
	"""
	@staticmethod
	def fromFile(confFile, runtimeConfig):

		# Read config file(s)
		config = ConfigParser.SafeConfigParser()
		config.read(confFile)

		# Keep for delay initialization
		Config._config = config
		Config._runtimeConfig = runtimeConfig

		# Initialize subclasses
		CoreConfig.fromConfig( config, runtimeConfig )
		StoreConfig.fromConfig( config, runtimeConfig )
		DatabaseConfig.fromConfig( config, runtimeConfig )
		HistogramsConfig.fromConfig( config, runtimeConfig )
		EmailConfig.fromConfig( config, runtimeConfig )
		ForumConfig.fromConfig( config, runtimeConfig )

		# Ensure base tables exist
		createBaseTables()

	@staticmethod 
	def initEBUS():
		"""
		Delayed initialization of external bus
		"""
		ExternalBusConfig.fromConfig( Config._config, Config._runtimeConfig )

	@staticmethod 
	def initIBUS():
		"""
		Delayed initialization of internal bus
		"""
		InternalBusConfig.fromConfig( Config._config, Config._runtimeConfig )


