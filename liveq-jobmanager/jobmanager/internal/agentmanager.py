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

import time
import logging

from jobmanager.config import Config

from liveq.io.bus import BusChannelException
from liveq.component import Component
from liveq.classes.bus.xmppmsg import XMPPBus

from liveq.models import *

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
			return Agent.create(uuid=uid, group=self.GLOBAL_GROUP)

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

	def getLabByUUID(self, lab):
		"""
		Return a lab instance with the given lab UUID or None if it does not exist
		"""

		try:
			return Lab.get( Lab.uuid == lab)
		except Lab.DoesNotExist:
			return None

	def getLabByID(self, lab):
		"""
		Return a lab instance with the given lab index or None if it does not exist
		"""

		try:
			return Lab.get( Lab.id == lab)
		except Lab.DoesNotExist:
			return None

	def acquireFreeAgent(self, group="public"):
		"""
		Return a job agent which is not doing anything and it belongs on the specified group
		"""

		# Get a group under this id
		ginst = self.getGroup(group)

		# Try to find something
		try:
			agent = Agent.get( (Agent.group == ginst) & (Agent.state == 1) )
		except Agent.DoesNotExist:
			# If we found nothing, return nothing
			return None

		# Mark the agent as busy
		agent.state = 2
		agent.save()

		logging.info("Acquired agent %s of group %s" % (agent.uuid, group))

		# Return agent
		return agent

	def releaseAgent(self, agent):
		"""
		Release the specified agent, previously acquired with acquireFreeAgent
		"""

		# Try to resolve object if a number or a string is specified
		# isntead of an agent object reference
		if type(agent) == int:
			agent = Agent.get( Agent.id == agent )
		elif type(agent) == str:
			agent = Agent.get( Agent.uuid == agent )
		else:
			agent = Agent.get( Agent.id == agent.id )

		# If the agent is not dead, mark it free
		if agent.state > 0:

			# Mark the agent as free
			agent.state = 1
			agent.save()

			# Release agent
			logging.info("Released agent %s of group %s" % (agent.uuid, agent.group.uuid))



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
		agentEntry.lastActivity = time.time()
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
		pass

	def updatePresence(self, uid, state=1):
		"""
		Update the expiry timeout of the given agent and it's presence
		"""
		
		agentEntry = self.getAgent(uid)

		# Switch state and last time seen
		agentEntry.state = state
		agentEntry.lastActivity = time.time()

		# Save entry
		agentEntry.save()

	def updateActivity(self, uid):
		"""
		Update the agent activity timestamp to avoid expiry
		"""

		# Get agent by UID		
		agentEntry = self.getAgent(uid)

		# Update activity
		agentEntry.lastActivity = time.time()
		agentEntry.save()

	def offlineTimedOut(self, timeout=60):
		"""
		Turn offline agents that haven't sent any activity for
		more than the timeout specified (in seconds)
		"""

		# Disconnect agents that are idle for more than `timeout`
		Agent.update( state = 0 ).where( lastActivity < (time.time() - timeout) )