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
from liveq.config.core import CoreConfig, StaticConfig
from liveq.config.externalbus import ExternalBusConfig

"""
Local configuration for the agent
"""
class AgentConfig:

	SERVER_CHANNEL = ""

	@staticmethod
	def fromConfig(config, runtimeConfig):

		AgentConfig.SERVER_CHANNEL = config.get("agent", "server")

"""
Create a configuration for the JOB MANAGER based on the core config
"""
class Config(CoreConfig, ExternalBusConfig, StaticConfig, AgentConfig):

	"""
	Update class variables by reading the config file
	contents of the specified filename
	"""
	@staticmethod
	def fromFile(confFile, runtimeConfig):

		# Read config file(s)
		config = ConfigParser.SafeConfigParser()
		config.read(confFile)

		# Initialize subclasses
		StaticConfig.initialize( os.path.dirname(confFile) + "/liveq.static.conf" )
		CoreConfig.fromConfig( config, runtimeConfig )
		ExternalBusConfig.fromConfig( config, runtimeConfig )
		AgentConfig.fromConfig( config, runtimeConfig )