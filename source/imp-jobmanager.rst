.. _imp-jobmanager:

LiveQ Job Manager
=================

This is the application that runs in the back end infrastructure. It receives job creation
commands from the :ref:`LiveQ Web Server <imp-webserver>` via the internal bus and forwards 
them to the :ref:`LiveQ Agents <imp-agent>` via the external bus.

Configuration
-------------

The component configuration class is the following:

.. autoclass:: jobmanager.config.Config
	:members:
	:inherited-members:


Component
-------------

The job manager's core component class is the following

.. autoclass:: jobmanager.component.JobManagerComponent
	:members:
