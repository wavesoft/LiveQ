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

from liveq.config import configexceptions, ComponentConfig
from liveq.config.classes import AppConfigClass

class AppConfig(ComponentConfig):
	"""
	Application configuration class.
	This class provides the configuration framework for instantiating application objects.
	This implementation supports only a single application.
	"""

	#: The application package
	APP_CLASS = ""

	#: The application configuration
	APP_CONFIG = None

	@staticmethod
	@configexceptions(section="app")
	def fromConfig(config, runtimeConfig):
		"""
		Update class variables by reading the config file
		contents of the specified filename
		"""

		# Populate app classes
		AppConfig.APP_CLASS = config.get("app", "class")
		AppConfig.APP_CONFIG = AppConfigClass.fromClass( AppConfig.APP_CLASS, config._sections["app"] )

