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
from liveq.config.classes import StoreConfigClass

"""
Store configuration class
Agents can include this class if they require a Key-Value store configuration
"""
class StoreConfig:

	# Key-Value store instance and confguration
	STORE_CLASS = ""
	STORE_CONFIG = None
	STORE = None

	"""
	Update class variables by reading the config file
	contents of the specified filename
	"""
	@staticmethod
	@configexceptions(section="store")
	def fromConfig(config):

		# Populate classes
		StoreConfig.STORE_CLASS = config.get("store", "class")
		StoreConfig.STORE_CONFIG = StoreConfigClass.fromClass( StoreConfig.STORE_CLASS, config._sections["store"] )
		StoreConfig.STORE = StoreConfig.STORE_CONFIG.instance()