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
from liveq.config import configexceptions
from liveq.config.core import CoreConfig
from liveq.config.store import StoreConfig
from liveq.config.internalbus import InternalBusConfig
from liveq.config.tuneaddressing import TuneAddressingConfig
from liveq.config.database import DatabaseConfig

class InterpolatorConfig:
	"""
	Local configuration for the interpolator
	"""

	@staticmethod
	def fromConfig(config, runtimeConfig):
		pass

"""
Create a configuration for the JOB MANAGER based on the core config
"""
class Config(CoreConfig, StoreConfig, InternalBusConfig, DatabaseConfig, InterpolatorConfig, TuneAddressingConfig):
	"""
	Create a configuration for the INTERPOLATOR based on the core config
	"""

	@staticmethod
	def fromFile(confFile, runtimeConfig):
		"""
		Update class variables by reading the config file
		contents of the specified filename
		"""

		# Read config file(s)
		config = ConfigParser.SafeConfigParser()
		config.read(confFile)

		# Initialize subclasses
		CoreConfig.fromConfig( config, runtimeConfig )
		StoreConfig.fromConfig( config, runtimeConfig )
		DatabaseConfig.fromConfig( config, runtimeConfig )
		InternalBusConfig.fromConfig( config, runtimeConfig )
		InterpolatorConfig.fromConfig( config, runtimeConfig )
		TuneAddressingConfig.fromConfig( config, runtimeConfig )
