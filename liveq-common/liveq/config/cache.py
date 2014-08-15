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

from liveq.exceptions import ConfigException
from liveq.config import configexceptions
from liveq.config.classes import CacheConfigClass

class CacheConfig:
	"""
	External Bus Configration

	An external bus is a transport class that exchanges messages between the
	code LiveQ Core and the Agents. 
	"""

	#: The external bus class string
	CACHE_CLASS = ""

	#: The external bus configuration
	CACHE_CONFIG = None

	#: The external bus instance
	CACHE = None

	@staticmethod
	@configexceptions(section="cache")
	def fromConfig(config, runtimeConfig):
		"""
		Update class variables by reading the config file
		contents of the specified filename
		"""

		# Populate classes
		CacheConfig.CACHE_CLASS = config.get("cache", "class")
		CacheConfig.CACHE_CONFIG = CacheConfigClass.fromClass( CacheConfig.CACHE_CLASS, config._sections["cache"] )
		CacheConfig.CACHE = CacheConfig.CACHE_CONFIG.instance(runtimeConfig)