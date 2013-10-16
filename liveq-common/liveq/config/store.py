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

"""
A Key-Value Store configuration instance specified by the configuration file
Handles the following section:

[store]
class=liveq.classes.store.<class>

"""
class StoreConfigClass:
	
	"""
	Instantiate a config class from the package specified
	"""
	@staticmethod
	def fromClass(cls,cfg):
		# Try to load the specified package
		try:
			mod = __import__(cls, fromlist=['']);
		except ImportError as e:
			raise ConfigException("Unable to load package %s (%s)" % (cls, e) )

		# Make sure we have the required classes inside
		if not hasattr(mod, "Config"):
			raise ConfigException("The queue package %s has no configuration class defined" % cls)

		# Validate integrity
		if not issubclass(mod.Config, StoreConfigClass):
			raise ConfigException("The class %s.Config is not a queue configuration" % cls)			

		# Instantiate (safely)
		try:
			inst = mod.Config(cfg)
		except Exception as e:
			raise ConfigException("Unable to parse queue configuration (%s: %s)" % (e.__class__.__name__, e))

		# Return instance
		return inst

	"""
	Overridable function to create a queue
	"""
	def instance(self):
		raise NotImplementedError("The queue config class did not implement the instance() function")


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
	def fromConfig(config):

		# Populate classes
		StoreConfig.STORE_CLASS = config.get("store", "class")
		StoreConfig.STORE_CONFIG = StoreConfigClass.fromClass( StoreConfig.STORE_CLASS, config._sections["store"] )
		StoreConfig.STORE = StoreConfig.STORE_CONFIG.instance()