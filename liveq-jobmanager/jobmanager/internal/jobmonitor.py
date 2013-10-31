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

from jobmanager.component import JobManagerComponent

from liveq.utils.fsm import StoredFSM, state_handler, event_handler
from liveq.models import Agent, AgentGroup, LabInstance

class JobMonitor(StoredFSM):
	"""
	This Finite-State Machine class implements all the required
	functionality for keeping the state and managing jobs distributed
	on the volunteer's computers.

	.. note::
		Due to the stateless assumptions of the StoredFSM, we are not allowed to keep a reference
		to the channel that is used for communication with the agent.

		Therefore we are sending data using the forward() function of the JobManagerComponent that 
		can be accessed via the global singleton ``JobManagerComponent.INSTANCE``, and we are receiving
		data from the users via events.

	"""

	def afterThaw(self):
		"""
		(Overrided) Establish connections to resources that are not available otherwise
		"""
		pass

	@state_handler("init")
	def stateInit(self):
		"""
		Handler of the entry state
		"""
		
		# Go to calculate resources
		self.goto("calc_resources")

	@state_handler("calc_resources")
	def stateCalcResources(self):
		"""
		Calculate the resources required for running this job
		"""
		pass

	@event_handler("jobData")
	def eventDataArrived(self):
		"""
		Handler of the event ``jobData``.

		This event is broadcasted when data arrive that concern this job.
		"""
		pass

	@event_handler("jobCompleted")
	def eventDataArrived(self):
		"""
		Handler of the event ``jobCompleted``.

		This event is broadcasted when the agent has completed the job.
		"""
		pass

	@event_handler("jobError")
	def eventDataArrived(self):
		"""
		Handler of the event ``jobError``.

		This event is broadcasted when the agent failed to execute a job.
		"""
		pass
