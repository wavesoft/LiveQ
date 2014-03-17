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
from liveq.config.internalbus import InternalBusConfig
from liveq.config.database import DatabaseConfig
from liveq.data.histo.description import HistoDescription
from liveq.models import createBaseTables

"""
Local configuration for the agent
"""
class WebserverConfig:

	SERVER_PORT = 8080
	BASE_URL = "/vas"
	HISTODESC_PATH = ""
	HISTODESC = None
	SSL = False
	SSL_CERTIFICATE = ""
	SSL_KEY = ""
	SSL_CA = ""

	@staticmethod
	def fromConfig(config, runtimeConfig):
		WebserverConfig.SERVER_PORT = config.get("webserver", "port")
		WebserverConfig.HISTODESC_PATH = config.get("webserver", "histodesc_path")
		WebserverConfig.BASE_URL = config.get("webserver", "base_url")
		WebserverConfig.SSL = (int(config.get("webserver", "ssl")) == 1)
		WebserverConfig.SSL_PORT = config.get("webserver", "ssl_port"
		WebserverConfig.SSL_CERTIFICATE = config.get("webserver", "ssl_certificate")
		WebserverConfig.SSL_KEY = config.get("webserver", "ssl_key")
		WebserverConfig.SSL_CA = config.get("webserver", "ssl_ca")

		# Create a histogram description from the reference data path
		WebserverConfig.HISTODESC = HistoDescription( WebserverConfig.HISTODESC_PATH )

"""
Create a configuration for the JOB MANAGER based on the core config
"""
class Config(CoreConfig, InternalBusConfig, WebserverConfig, DatabaseConfig):

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
		CoreConfig.fromConfig( config, runtimeConfig )
		InternalBusConfig.fromConfig( config, runtimeConfig )
		DatabaseConfig.fromConfig( config, runtimeConfig )
		WebserverConfig.fromConfig( config, runtimeConfig )

		# Ensure base tables exist
		createBaseTables()