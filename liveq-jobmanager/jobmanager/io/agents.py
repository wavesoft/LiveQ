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

from liveq.models import Agent, AgentGroup

#: The name of the default group to use
DEFAULT_GROUP = "global"

##############################################################
# ------------------------------------------------------------
#  INTERFACE FUNCTIONS
# ------------------------------------------------------------
##############################################################

def getAgentGroup(gid):
	"""
	Return an Agent Group record for the given agent, and create it if
	it's missing
	"""

	# Fetch or create group
	try:
		return AgentGroup.get(AgentGroup.uuid==gid)

	except AgentGroup.DoesNotExist:
		return AgentGroup.create(uuid=gid)

def getAgent(uid):
	"""
	Return the Agent entry of the given id, and create it if 
	it's missing
	"""

	# Fetch or create agent
	try:
		return Agent.get(Agent.uuid==uid)

	except Agent.DoesNotExist:

		# Return the new agent entry
		return Agent.create(uuid=uid, group=getAgentGroup(DEFAULT_GROUP))

def getAgentFromJob(jid):
	"""
	Return the agent that is running the given job
	"""

	# Try to fetch agent
	try:
		return Agent.get(Agent.activeJob==jid)
	except Agent.DoesNotExist:
		# Return none if missing
		return None

def updateActivity(uid):
	"""
	Update the agent activity timestamp to avoid expiry
	"""

	# Get agent by UID		
	agentEntry = self.getAgent(uid)

	# Update activity
	agentEntry.lastActivity = time.time()
	agentEntry.save()
