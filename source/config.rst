
LiveQ Configuration Mechanism
=============================

LiveQ framework has an intuitive configuration meachanism that enables a powerful modular design. 
In this section, we are going to describe how this configuration mechanism works and how you can use it.

Basic Concepts
--------------

Since the configuration is project-wide and static, all the configuration properties and configured
objects are available globally as static member functions of a ``Config`` class.

This global ``Config`` class is defined per project and inherits one or more core :class:`ComponentConfig <liveq.config.ComponentConfig>` classes.
Each one of these :class:`ComponentConfig <liveq.config.ComponentConfig>` classes has it's own static members that hold the configuration for
each component. By inheriting from them the ``Config`` class unifies all these properties.

In addition, each one of the :class:`ComponentConfig <liveq.config.ComponentConfig>` classes, has an overridable implementation, allowing each component
to be dynamically configured in the future, without any changes on the code. Each one of this implementation is called
:class:`ComponentClassConfig <liveq.config.ComponentClassConfig>` and is defined by the user in the configuration file.

Optionally, each application might have some specific run-time configuration parameters. These parameters can be specified
at configuration time and can be used individually by each component class.

A simple example
----------------

Take for example the following configuration file::

	[general]
	logging=info

	[database]
	class=liveq.classes.db.mysql
	server=localhost
	username=liveq
	database=liveq
	password=liveq

This configuration class is intended to be used with the following project config class::

	import ConfigParser
	from liveq.config.core import CoreConfig
	from liveq.config.database import DatabaseConfig

	class Config(CoreConfig, DatabaseConfig):

		"""
		Use this method to load configuration from file
		"""
		@staticmethod
		def fromFile(confFile, runtimeConfig):

			# Read config file(s)
			config = ConfigParser.SafeConfigParser()
			config.read(confFile)

			# Initialize subclasses
			CoreConfig.fromConfig( config, runtimeConfig )
			DatabaseConfig.fromConfig( config, runtimeConfig )

And to load the configuration from your application you can simply do::

	from myproject import Config

	# Load file
	Config.fromFile("path/to/file")


The LiveQ configuration modules will take care of loading the appropriate database configuration
driver, establishing a databse connection and storing the abstract database handler on the ``Config.DB``
static property. However, the actual class of the instance in the ``Config.DB`` property is also configurable,
via the *class=* option in the configuration file.
