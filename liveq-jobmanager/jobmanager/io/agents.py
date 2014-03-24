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

from liveq.models import Agent, AgentGroup, AgentMetrics, PostMortems
from liveq.reporting.postmortem import PostMortem
from liveq.reporting.lars import LARS

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

def getAgentMetrics(uid):
	"""
	Return the agent metrics record for the given agent.
	"""

	# First, get the agent entry
	agent = getAgent(uid)

	# Fetch or create group
	try:
		return AgentMetrics.get(AgentMetrics.uuid==uid)
	except AgentMetrics.DoesNotExist:
		return AgentMetrics.create(uuid=uid, agent=agent)

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
	agentEntry = getAgent(uid)

	# Update activity
	agentEntry.lastActivity = time.time()
	agentEntry.save()

def updatePresence(uid, state=1):
	"""
	Update the expiry timeout of the given agent and it's presence
	"""
	
	agentEntry = getAgent(uid)

	# Switch state and last time seen
	agentEntry.state = state
	agentEntry.lastActivity = time.time()

	# Save entry
	agentEntry.save()


	# Send report to LARS
	report = LARS.openGroup("agents", uid, alias=uid)
	report.set("presence", state)

def updateHandshake(uid, attrib):
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
	groupEntry = getAgentGroup(group)
	agentEntry = getAgent(uid)

	# Update fields
	agentEntry.lastActivity = time.time()
	agentEntry.group = groupEntry
	agentEntry.slots = slots
	agentEntry.features = features
	agentEntry.version = version

	# The agent is now active
	agentEntry.state = 1

	# Send report to LARS
	report = LARS.openGroup("agents", uid, alias=uid)
	report.set("group", group)
	report.set("slots", slots)
	report.set("features", features)
	report.set("version", version)
	report.set("group", group)

	# Save entry
	agentEntry.save()
	return agentEntry

def agentJobFailed(uid, job, postMortemBuffer=None):
	"""
	This function is called when an aget fails to complete a job.
	This calculates the error metrics.

	Optinally, it's possible to submit a post-mortem, as received
	from the worker node, that can be used to diagnose errors.
	"""

	# Fetch the agent entry
	agentEntry = getAgent(uid)

	# Update error count and error timestamp
	agentEntry.fail_count += 1
	agentEntry.fail_timestamp = time.time()
	agentEntry.save()

	# Fetch agent metrics
	agentMetrics = getAgentMetrics(uid)

	# Update job counters
	agentMetrics.jobs_failed += 1
	agentMetrics.save()

	# Send report to LARS
	report = LARS.openGroup("agents", uid, alias=uid)
	report.openGroup("jobs").add("failed", 1)

	# Register a post-mortem
	if postMortemBuffer:

		# Create a post-mortem
		postmortemEntry = PostMortems.create(
			agent=agentEntry,
			timestamp=time.time(),
			data=postMortemBuffer
			)

		# Save post-mortem
		postmortemEntry.save()

		# DEBUG
		data = PostMortem.fromBuffer(postMortemBuffer)
		PostMortem.render(data)


def agentJobSucceeded(uid, job):
	"""
	This function is called when an aget successfully completes a job.
	This calculates the success metrics and resets the error counter.
	"""

	# Fetch the agent entry
	agentEntry = getAgent(uid)

	# Reset error count and error timestamp
	agentEntry.fail_count = 0
	agentEntry.fail_timestamp = 0
	agentEntry.save()

	# Fetch agent metrics
	agentMetrics = getAgentMetrics(uid)

	# Update job counters
	agentMetrics.jobs_succeed += 1
	agentMetrics.save()

	# Send report to LARS
	report = LARS.openGroup("agents", uid, alias=uid)
	report.openGroup("jobs").add("completed", 1)


def agentJobSent(uid, job):
	"""
	This function is called when we submit a job request to an agent.
	This updates the agent metrics.
	"""

	# Fetch agent metrics
	agentMetrics = getAgentMetrics(uid)

	# Update job counters
	agentMetrics.jobs_sent += 1
	agentMetrics.save()

	# Send report to LARS
	report = LARS.openGroup("agents", uid, alias=uid)
	report.openGroup("jobs").add("sent", 1)


def agentJobAborted(uid, job):
	"""
	This function is called when we abort a job on the agent.
	This updates the agent metrics.
	"""

	# Fetch agent metrics
	agentMetrics = getAgentMetrics(uid)

	# Update job counters
	agentMetrics.jobs_aborted += 1
	agentMetrics.save()

	# Send report to LARS
	report = LARS.openGroup("agents", uid, alias=uid)
	report.openGroup("jobs").add("aborted", 1)

