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

from liveq.internal.exceptions import ConfigException

"""
[[ Overridable Queue Configuration ]]
The queue can subclass this module and provide it's custom implementation.
"""
class QueueConfig:
	
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
		if not issubclass(mod.Config, QueueConfig):
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
	def instance(self,userconfig):
		raise NotImplementedError("The queue config class did not implement the instance() function")


"""
[[ Overridable Adapter Configuration ]]
The adapter can subclass this module and provide it's custom implementation.
"""
class AdapterConfig:
	
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
			raise ConfigException("The adapter package %s has no configuration class defined" % cls)

		# Validate integrity
		if not issubclass(mod.Config, AdapterConfig):
			raise ConfigException("The class %s.Config is not a adapter configuration" % cls)			

		# Instantiate (safely)
		try:
			inst = mod.Config(cfg)
		except Exception as e:
			raise ConfigException("Unable to parse adapter configuration (%s: %s)" % (e.__class__.__name__, e))

		# Return instance
		return inst

	"""
	Overridable function to create an adapter
	"""
	def instance(self,userconfig):
		raise NotImplementedError("The adapter config class did not implement the instance() function")

"""
[[ Overridable Application Configuration ]]
The application can subclass this module and provide it's custom implementation.
"""
class AppConfig:

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
			raise ConfigException("The application package %s has no configuration class defined" % cls)

		# Validate integrity
		if not issubclass(mod.Config, AppConfig):
			raise ConfigException("The class %s.Config is not a application configuration" % cls)			

		# Instantiate (safely)
		try:
			inst = mod.Config(cfg)
		except Exception as e:
			raise ConfigException("Unable to parse application configuration (%s: %s)" % (e.__class__.__name__, e))

		# Return instance
		return inst

	"""
	Overridable function to create an application
	"""
	def instance(self,userconfig):
		raise NotImplementedError("The application config class did not implement the instance() function")


"""
[[ Global Configuration ]]
"""
class Config:

	QUEUE_CLASS = ""
	QUEUE = None

	APP_CLASS = ""
	APP = None

	ADAPTER_CLASS = ""
	ADAPTER = None

	LOG_LEVEL = logging.INFO

	"""
	Read the actual configuration from the file
	"""
	@staticmethod
	def readFile(file):
		config = ConfigParser.SafeConfigParser()
		config.read(file)

		# Populate classes
		Config.QUEUE_CLASS = config.get("liveq", "queue_class")
		Config.ADAPTER_CLASS = config.get("liveq", "adapter_class")
		Config.APP_CLASS = config.get("liveq", "app_class")
		
		# Instantiate classes
		Config.QUEUE = QueueConfig.fromClass( Config.QUEUE_CLASS, config._sections["queue"] )
		Config.ADAPTER = AdapterConfig.fromClass( Config.ADAPTER_CLASS, config._sections["adapter"] )
		Config.APP = AppConfig.fromClass( Config.APP_CLASS, config._sections["app"] )

		# Setup logging levels
		level_map = {

			# String mapping
			"debug": logging.DEBUG,
			"info": logging.INFO,
			"warn": logging.WARNING,
			"warning": logging.WARNING,
			"error": logging.ERROR,
			"critical": logging.CRITICAL,
			"fatal": logging.FATAL,

			# Numeric mapping
			"5": logging.DEBUG,
			"4": logging.INFO,
			"3": logging.WARNING,
			"2": logging.ERROR,
			"1": logging.CRITICAL,
			"0": logging.FATAL,
		}
		Config.LOG_LEVEL = level_map[ config.get("liveq", "loglevel", "info") ]
