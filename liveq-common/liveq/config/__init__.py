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

"""
The liveq.config module provides the means to access system-wide configuration.

The configuration is splitted into two parts: Components and Classes.

A [COMPONENT] is a system component that has it's own section in the configuration 
file and is usually an instance of a particular [CLASS].

You can define the class for each component as the 'class=' parameter in the
respective section. For example:

	[database]
	class=liveq.classes.db.mysql
	< .. mysql-specific parameters .. >

This will consult the liveq.classes.db.mysql class in order to parse the configuration
information and instanciate the database driver. 

Each component configuration is stored statically under it's component class. 
Therefore, in our example, the database instance is stored in the DatabaseConfig.DB variable.

Applications will usually create their own Config class and inherit from the Components
they require. For example:

	from liveq.config.core import CoreConfig
	from liveq.config.database import DatabaseConfig
	from liveq.config.store import StoreConfig

	class Config(CoreConfig, DatabaseConfig, StoreConfig):
		pass

Therefore, all the system-wide configuration parameters will be available statically under
the Config.<X> class. For example, the database will *ALSO* be available as Config.DB (in 
addition to DatabaseConfig.DB).

The section configuration (not the database instance itself) and the class name variables
are also available statically under the Config.<X>_CONFIG and Config.<X>_CLASS variables.

"""

import ConfigParser
from liveq.exceptions import ConfigException

def configexceptions(section=""):
	"""
	Decorator to catch usual exceptions and convert them into a more
	readable ConfigException.

	This decorator allows config readers to care a bit less about input validation
	"""
	def decorator(f):
		def safe_f(*args, **kwargs):
			try:
				return f(*args, **kwargs)

			except KeyError as e:
				# KeyErrors occur when 
				if not section:
					raise ConfigException("Missing required option %s" % str(e))
				else:
					raise ConfigException("Missing parameter %s in section '%s'" % (str(e), section))

			except ConfigParser.NoSectionError as e:
				# ConfigParser detected a missing section
				raise ConfigException(str(e))

			except ConfigParser.NoOptionError as e:
				# ConfigParser detected a missing option in a section
				raise ConfigException(str(e))

		return safe_f
	return decorator


class ComponentConfig:
	"""
	This class is the base class that all the configuration components must implement.
	During it's construction, it's static members should be initialized.
	"""

	@staticmethod
	def fromConfig(config, runtimeConfig):
		"""
		This function should read the configuration from ``config`` and ``runtimeConfig`` and populate the
		static members of the ``ComponentConfig`` class accordingly.

		:param config: A ``ConfigParser`` instance that parsed the config file
		:param runtimeConfig: A dictionary object that contains the run-time configuration.
		"""
		raise NotImplementedError("The ComponentConfig did not implement the fromConfig() function")

class ComponentClassConfig:
	"""
	This class is the base class that all the configuration classes must implement

	This class should initialize the environment and store the configuration required on it's member
	functions during it's construction. Upon construction, it should implement the :func:`instance` function
	"""

	@staticmethod
	def fromClass(pkg,config):
		"""
		Instantiate a ComponentClassConfig class from the package specified. This function will try to find a
		configuration class with the name ``<pkg>.Class``.

		The configuration object that parsed the input file is passed on the ``config`` parameter.

		:param pkg: A string with the name of the package that contains a ``Config`` class.
		:param config: A dictionary object that contains the collected configuration from the file. Usually that's the contents of the section.
		"""
		raise NotImplementedError("The ComponentClassConfig did not implement the fromClass() function")

	def instance(self, runtimeConfig):
		"""
		This function creates the actual instance of the component of the current class.

		:param runtimeConfig: A dictionary that contains the run-time configuraiton of the application.
		"""
		raise NotImplementedError("The ComponentClassConfig did not implement the instance() function")
