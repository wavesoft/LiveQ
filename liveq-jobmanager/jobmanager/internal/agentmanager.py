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

import logging
import time
import datetime

from jobmanager.config import Config

from liveq.io.bus import BusChannelException
from liveq.component import Component
from liveq.classes.bus.xmppmsg import XMPPBus

from liveq.models import Agent, AgentGroup, AgentMetrics

class JobAgentManager:
	"""
	Job Agents management facility
	"""

	def __init__(self):
		"""
		Make sure we have a global group
		"""
		self.GLOBAL_GROUP = self.getGroup("global")

	def getAgent(self, uid):
		"""
		Return the Agent entry of the given id, and create it if 
		it's missing
		"""

		# Fetch or create agent
		try:
			return Agent.get(Agent.uuid==uid)

		except Agent.DoesNotExist:

			# Return the new agent entry
			return Agent.create(uuid=uid, group=self.GLOBAL_GROUP, metrics=metrics)

	def getAgentMetrics(self, agent):
		"""
		Return the metrics field for the given agent, and create it if
		it's missing.
		"""

		# Fetch metrics record or create new
		try:
			return AgentMetrics.get(AgentMetrics.agent==agent)

		except AgentMetrics.DoesNotExist:
			return AgentMetrics.create(agent=agent)

	def getGroup(self, gid):
		"""
		Return a Group record for the given agent, and create it if
		it's missing
		"""

		# Fetch or create group
		try:
			return AgentGroup.get(AgentGroup.uuid==gid)

		except AgentGroup.DoesNotExist:
			return AgentGroup.create(uuid=gid)

	def getJob(self, jid):
		"""
		Return a Job record for the given job ID, and create it if
		it's missing
		"""

		# Fetch or create job
		try:
			return AgentGroup.get(AgentGroup.uuid==gid)

		except AgentGroup.DoesNotExist:
			return AgentGroup.create(uuid=gid)

	def updateHandshake(self, uid, attrib):
		"""
		This function is called when a handshake is received from the remote agent.
		This updates the database in order to reflect the new state.
		"""
		
		# Prepare parameters
		group = "global"
		features = ""
		slots = 1
		version = 1

		# Update parameters from the attribs received
		if "group" in attrib:
			group = attrib['group']
		if "slots" in attrib:
			slots = attrib['slots']
		if "features" in attrib:
			features = attrib['features']
		if "version" in attrib:
			version = int(attrib['version'])

		# Fetch references
		groupEntry = self.getGroup(group)
		agentEntry = self.getAgent(uid)

		# Update fields
		agentEntry.lastSeen = datetime.datetime.now()
		agentEntry.group = groupEntry
		agentEntry.slots = slots
		agentEntry.features = features

		# The agent is now active
		agentEntry.state = 1

		# Save entry
		agentEntry.save()
		return agentEntry

	def checkExpired(self,timeout=30):
		"""
		This is called periodically to disable agents that were 
		idle for too long
		"""

	def updatePresence(self, uid, state=1):
		"""
		Update the expiry timeout of the given agent and it's presence
		"""
		
		agentEntry = self.getAgent(uid)

		# Switch state and last time seen
		agentEntry.state = state
		agentEntry.lastSeen = datetime.datetime.now()

		# Save entry
		agentEntry.save()


	def newJobPlan(self, group="public"):
		"""
		This function allocates a new job entry, checks the status of the 
		agents on the given group and returns a plan description for the
		actions to be taken.

		Arguments:
			group (string)	: The ID of the agent group to use

		Returns:
			A dict in the following format:

				{
					"id": ".. id ..",		# The new job ID
					"cancel": [ "id", .. ]	# The agents to cancel
				}
		"""

		# Get the agents in that group that are at least connected
		group = self.getGroup(group)
		query = Agent.query().where( Agent.group == group )

		# 
