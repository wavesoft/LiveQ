.. _imp-webserver:

LiveQ Web Server
================

This component starts a tornado webserver and communicates with the :ref:`LiveQ Job Managers <imp-jobmanager>`
and :ref:`LiveQ Interpolators <imp-interpolator>` in order to serve the required data to the user.

The server accepts data via a ``WebSocket`` and sends back in real-time the results as they arrive. It also provides
some static files required for this functionality, such as the interface javascript library.

Configuration
-------------

The component configuration class is the following:

.. autoclass:: webserver.config.Config
	:members:
	:inherited-members:


Component
-------------

The web server's core component class is the following

.. autoclass:: webserver.server.LiveQServer
	:members:
