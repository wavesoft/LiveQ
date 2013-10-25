.. _imp-agent:

LiveQ Agent
===========

This is the application that runs in the volunteer's machine and runs the simulation job.
It communicates with a :ref:`LiveQ Job Manager <imp-jobmanager>` in order to start a 
simulation and send back data.

Configuration
-------------

The component configuration class is the following:

.. autoclass:: agent.config.Config
	:members:
	:inherited-members:
	:private-members:


Component
-------------

The agent's core component class is the following

.. autoclass:: agent.component.AgentComponent
	:members:
