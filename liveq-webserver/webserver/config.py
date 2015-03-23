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
from liveq.config.store import StoreConfig
from liveq.config.internalbus import InternalBusConfig
from liveq.config.database import DatabaseConfig
from liveq.config.cache import CacheConfig
from liveq.config.histograms import HistogramsConfig
from liveq.models import createBaseTables
from webserver.models import createWebserverTables

"""
Local configuration for the agent
"""
class WebserverConfig:

	SERVER_PORT = 8080
	BASE_URL = "/vas"
	TRAINSEQ_PATH = ""
	HISTODESC = None
	SSL = False
	SSL_PORT = 8043
	SSL_CERTIFICATE = ""
	SSL_KEY = ""
	SSL_CA = ""

	@staticmethod
	def fromConfig(config, runtimeConfig):
		WebserverConfig.SERVER_PORT = config.get("webserver", "port")
		WebserverConfig.TRAINSEQ_PATH = config.get("webserver", "trainseq_path")
		WebserverConfig.BASE_URL = config.get("webserver", "base_url")
		WebserverConfig.SSL = (int(config.get("webserver", "ssl")) == 1)
		WebserverConfig.SSL_PORT = config.get("webserver", "ssl_port")
		WebserverConfig.SSL_CERTIFICATE = config.get("webserver", "ssl_certificate")
		WebserverConfig.SSL_KEY = config.get("webserver", "ssl_key")
		WebserverConfig.SSL_CA = config.get("webserver", "ssl_ca")

"""
Synchronization with the forum
"""
class ForumConfig:

	FORUM_DB = None
	FORUM_SERVER = None
	FORUM_USER = None
	FORUM_PASSWORD = None
	FORUM_ENGINE = None
	FORUM_DB_PREFIX = "mybb_"

	@staticmethod
	def fromConfig(config, runtimeConfig):
		ForumConfig.FORUM_DB = config.get("forum", "database")
		ForumConfig.FORUM_SERVER = config.get("forum", "server")
		ForumConfig.FORUM_USER = config.get("forum", "username")
		ForumConfig.FORUM_PASSWORD = config.get("forum", "password")
		ForumConfig.FORUM_ENGINE = config.get("forum", "engine")
		ForumConfig.FORUM_DB_PREFIX = config.get("forum", "prefix")


"""
Game-specific configuration
"""
class GameConfig:

	GAME_DEFAULT_TEAM = 0
	GAME_EXAM_COOLDOWN = 0

	@staticmethod
	def fromConfig(config, runtimeConfig):
		GameConfig.GAME_DEFAULT_TEAM = int(config.get("game", "default_team"))
		GameConfig.GAME_EXAM_COOLDOWN = int(config.get("game", "exam_cooldown"))


"""
Create a configuration for the JOB MANAGER based on the core config
"""
class Config(CoreConfig, CacheConfig, StoreConfig, InternalBusConfig, WebserverConfig, DatabaseConfig, ForumConfig, GameConfig, HistogramsConfig):

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
		CacheConfig.fromConfig( config, runtimeConfig )
		StoreConfig.fromConfig( config, runtimeConfig )
		InternalBusConfig.fromConfig( config, runtimeConfig )
		DatabaseConfig.fromConfig( config, runtimeConfig )
		WebserverConfig.fromConfig( config, runtimeConfig )
		ForumConfig.fromConfig( config, runtimeConfig )
		GameConfig.fromConfig( config, runtimeConfig )
		HistogramsConfig.fromConfig( config, runtimeConfig )
		
		# Ensure base tables exist
		createBaseTables()
		createWebserverTables()