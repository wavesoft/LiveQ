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
from liveq.config import configexceptions
from liveq.config.core import CoreConfig
from liveq.config.database import DatabaseConfig
from liveq.config.store import StoreConfig
from liveq.config.internalbus import InternalBusConfig
from liveq.models import createBaseTables

class ResultsManagerConfig:
	"""
	Local configuration for the results manager
	"""

	#: The directory where the job output will be dumped
	RESULTS_DIR=""

	@staticmethod
	def fromConfig(config, runtimeConfig):
		WebserverConfig.RESULTS_DIR = config.get("resultsmanager", "results_dir")

"""
Create a configuration for the JOB MANAGER based on the core config
"""
class Config(CoreConfig, DatabaseConfig, StoreConfig, InternalBusConfig, ResultsManagerConfig):

	"""
	Update class variables by reading the config file
	contents of the specified filename
	"""
	@staticmethod
	def fromFile(files, runtimeConfig):

		# Read config file(s)
		config = ConfigParser.SafeConfigParser()
		config.read(files)

		# Initialize subclasses
		CoreConfig.fromConfig( config, runtimeConfig )
		DatabaseConfig.fromConfig( config, runtimeConfig )
		StoreConfig.fromConfig( config, runtimeConfig )
		InternalBusConfig.fromConfig( config, runtimeConfig )
		JobManagerConfig.fromConfig( config, runtimeConfig )

		# Create core models on the database
		createBaseTables()
