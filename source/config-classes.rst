
Configuration Classes
=====================

The following configuration classes are defined in LiveQ. You can subclass any of these
classess in your application configuration. Each one of them must implement one abstract function:

Component Configurations
------------------------

Your ``Config`` class can subclass any of the following configuration classes:

Core Configuration
^^^^^^^^^^^^^^^^^^

Configuration file requirements::

	[general]
	logging=info

+-----------+-------------------------------------------+-----------------------+
| Parameter | Description                               | Values                |
+===========+===========================================+=======================+
| *logging* | The logging level of the system console   | debug,info,warn,error |
+-----------+-------------------------------------------+-----------------------+

The :class:`liveq.config.core.CoreConfig` class reads the *[general]* configuration section and sets-up system-wide
configuration parameters, such as logging. There are no component classes in the CoreConfig.

.. autoclass:: liveq.config.core.CoreConfig
   :members:


Static Configuration
^^^^^^^^^^^^^^^^^^^^

Configuration file requirements::

	[static]
	uuid=574994fef143465bae17a2e13ee301f8

+-----------+-------------------------------------------+-----------------------+
| Parameter | Description                               | Values                |
+===========+===========================================+=======================+
| *uuid*    | The Unique ID of the machine              | a UUID hex string     |
+-----------+-------------------------------------------+-----------------------+

The :class:`liveq.config.core.StaticConfig` class reads **and writes** the *[static]* configuration section.
This class provides the mechanism to store persistent configuration parameters.

.. autoclass:: liveq.config.core.StaticConfig
   :members:


Database Configuration
^^^^^^^^^^^^^^^^^^^^^^

Configuration file requirements::

	[database]
	class=liveq.classes.db.<class>

+-----------+-------------------------------------------+-----------------------+
| Parameter | Description                               | Values                |
+===========+===========================================+=======================+
| *class*   | The package where to find the             | package name as       |
|           | implementation for the database driver.   | string                |
+-----------+-------------------------------------------+-----------------------+

The :class:`liveq.config.core.DatabaseConfig` class reads the *[database]* configuration section.
This class provides an interface to the peewee database driver.

.. autoclass:: liveq.config.database.DatabaseConfig
   :members:

The following classess are supported on this configuration:

* :module:`liveq.classes.db.mysql` : That provides a MySQL DB connection
* :module:`liveq.classes.db.sqlite` : That provides an SQLite DB connection


Key/Value Store Configuration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Configuration file requirements::

	[store]
	class=liveq.classes.store.<class>

+-----------+-------------------------------------------+-----------------------+
| Parameter | Description                               | Values                |
+===========+===========================================+=======================+
| *class*   | The package where to find the             | package name as       |
|           | implementation for the store driver.      | string                |
+-----------+-------------------------------------------+-----------------------+

The :class:`liveq.config.core.StoreConfig` class reads the *[store]* configuration section.
This class provides an interface to a generic key/value store.

.. autoclass:: liveq.config.store.StoreConfig
   :members:

External Bus Configuration
^^^^^^^^^^^^^^^^^^^^^^^^^^

Configuration file requirements::

	[external-bus]
	class=liveq.classes.bus.<class>

+-----------+-------------------------------------------+-----------------------+
| Parameter | Description                               | Values                |
+===========+===========================================+=======================+
| *class*   | The package where to find the             | package name as       |
|           | implementation for the bus driver.        | string                |
+-----------+-------------------------------------------+-----------------------+

The :class:`liveq.config.core.ExternalBusConfig` class reads the *[external-bus]* configuration section.
This class provides a generic bus from which data can flow in both directions, interconnecting
components with eachother.

.. autoclass:: liveq.config.externalbus.ExternalBusConfig
   :members:


Internal Bus Configuration
^^^^^^^^^^^^^^^^^^^^^^^^^^

Configuration file requirements::

	[internal-bus]
	class=liveq.classes.bus.<class>

+-----------+-------------------------------------------+-----------------------+
| Parameter | Description                               | Values                |
+===========+===========================================+=======================+
| *class*   | The package where to find the             | package name as       |
|           | implementation for the bus driver.        | string                |
+-----------+-------------------------------------------+-----------------------+

The :class:`liveq.config.core.ExternalBusConfig` class reads the *[internal-bus]* configuration section.
This class provides a generic bus from which data can flow in both directions, interconnecting
components with eachother.

.. autoclass:: liveq.config.internalbus.InternalBusConfig
   :members:


Base Classes
------------

All of the configuration classes inherit fromt he following base classes:

.. autoclass:: liveq.config.ComponentConfig
   :members:

.. autoclass:: liveq.config.ComponentClassConfig
   :members:

