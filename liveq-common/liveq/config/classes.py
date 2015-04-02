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

from liveq.config import ComponentClassConfig
from liveq.exceptions import ConfigException

class BusConfigClass(ComponentClassConfig):
	"""
	Transport Bus Configuration
	"""
	
	@staticmethod
	def fromClass(cls,cfg):
		"""
		Instantiate a config class from the package specified
		"""

		# Try to load the specified package
		try:
			mod = __import__(cls, fromlist=['']);
		except ImportError as e:
			raise ConfigException("Unable to load package %s (%s)" % (cls, e) )

		# Make sure we have the required classes inside
		if not hasattr(mod, "Config"):
			raise ConfigException("The bus package %s has no configuration class defined" % cls)

		# Validate integrity
		if not issubclass(mod.Config, BusConfigClass):
			raise ConfigException("The class %s.Config is not a bus configuration" % cls)			

		# Instantiate (safely)
		inst = mod.Config(cfg)

		# Return instance
		return inst

	def instance(self, runtimeConfig):
		"""
		Overridable function to create a bus
		"""

		raise NotImplementedError("The BusConfigClass did not implement the instance() function")


class DatabaseConfigClass(ComponentClassConfig):
	"""
	Database Configuration
	"""
	
	@staticmethod
	def fromClass(cls,cfg):
		"""
		Instantiate a config class from the package specified
		"""

		# Try to load the specified package
		try:
			mod = __import__(cls, fromlist=['']);
		except ImportError as e:
			raise ConfigException("Unable to load package %s (%s)" % (cls, e) )

		# Make sure we have the required classes inside
		if not hasattr(mod, "Config"):
			raise ConfigException("The database package %s has no configuration class defined" % cls)

		# Validate integrity
		if not issubclass(mod.Config, DatabaseConfigClass):
			raise ConfigException("The class %s.Config is not a database configuration" % cls)			

		# Instantiate (safely)
		inst = mod.Config(cfg)
		
		# Return instance
		return inst

	def instance(self, runtimeConfig):
		"""
		Overridable function to create a database
		"""
		raise NotImplementedError("The DatabaseConfigClass did not implement the instance() function")


class CacheConfigClass(ComponentClassConfig):
	"""
	Cache Configuration
	"""
	
	@staticmethod
	def fromClass(cls,cfg):
		"""
		Instantiate a config class from the package specified
		"""

		# Try to load the specified package
		try:
			mod = __import__(cls, fromlist=['']);
		except ImportError as e:
			raise ConfigException("Unable to load package %s (%s)" % (cls, e) )

		# Make sure we have the required classes inside
		if not hasattr(mod, "Config"):
			raise ConfigException("The cache package %s has no configuration class defined" % cls)

		# Validate integrity
		if not issubclass(mod.Config, CacheConfigClass):
			raise ConfigException("The class %s.Config is not a cache configuration" % cls)			

		# Instantiate (safely)
		inst = mod.Config(cfg)
		
		# Return instance
		return inst

	def instance(self, runtimeConfig):
		"""
		Overridable function to create a cache
		"""
		raise NotImplementedError("The CacheConfigClass did not implement the instance() function")


class StoreConfigClass(ComponentClassConfig):
	"""
	Store Configuration Class
	"""
	
	@staticmethod
	def fromClass(cls,cfg):
		"""
		Instantiate a config class from the package specified
		"""

		# Try to load the specified package
		try:
			mod = __import__(cls, fromlist=['']);
		except ImportError as e:
			raise ConfigException("Unable to load package %s (%s)" % (cls, e) )

		# Make sure we have the required classes inside
		if not hasattr(mod, "Config"):
			raise ConfigException("The store package %s has no configuration class defined" % cls)

		# Validate integrity
		if not issubclass(mod.Config, StoreConfigClass):
			raise ConfigException("The class %s.Config is not a store configuration" % cls)			

		# Instantiate (safely)
		inst = mod.Config(cfg)

		# Return instance
		return inst

	def instance(self, runtimeConfig):
		"""
		Overridable function to create a store
		"""

		raise NotImplementedError("The StoreConfigClass did not implement the instance() function")


class AppConfigClass(ComponentClassConfig):
	"""
	Application configuration class
	"""
	
	@staticmethod
	def fromClass(cls,cfg):
		"""
		Instantiate a config class from the package specified
		"""

		# Try to load the specified package
		try:
			mod = __import__(cls, fromlist=['']);
		except ImportError as e:
			raise ConfigException("Unable to load package %s (%s)" % (cls, e) )

		# Make sure we have the required classes inside
		if not hasattr(mod, "Config"):
			raise ConfigException("The store package %s has no configuration class defined" % cls)

		# Validate integrity
		if not issubclass(mod.Config, AppConfigClass):
			raise ConfigException("The class %s.Config is not an application configuration" % cls)			

		# Instantiate (safely)
		inst = mod.Config(cfg)

		# Return instance
		return inst

	def instance(self, runtimeConfig):
		"""
		Overridable function to create a store
		"""

		raise NotImplementedError("The AppConfigClass did not implement the instance() function")

class EmailConfigClass(ComponentClassConfig):
	"""
	Email clients configuration class
	"""
	
	@staticmethod
	def fromClass(cls,cfg):
		"""
		Instantiate a config class from the package specified
		"""

		# Try to load the specified package
		try:
			mod = __import__(cls, fromlist=['']);
		except ImportError as e:
			raise ConfigException("Unable to load package %s (%s)" % (cls, e) )

		# Make sure we have the required classes inside
		if not hasattr(mod, "Config"):
			raise ConfigException("The store package %s has no configuration class defined" % cls)

		# Validate integrity
		if not issubclass(mod.Config, EmailConfigClass):
			raise ConfigException("The class %s.Config is not an application configuration" % cls)			

		# Instantiate (safely)
		inst = mod.Config(cfg)

		# Return instance
		return inst

	def instance(self, runtimeConfig):
		"""
		Overridable function to create a store
		"""

		raise NotImplementedError("The EmailConfigClass did not implement the instance() function")

