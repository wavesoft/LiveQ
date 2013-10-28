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
		Return the Agent entry of the given user, and create it if 
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
		Return the metrics field for the given agent
		"""

		# Fetch metrics record or create new
		try:
			return AgentMetrics.get(AgentMetrics.agent==agent)

		except AgentMetrics.DoesNotExist:
			return AgentMetrics.create(agent=agent)

	def getGroup(self, gid):
		"""
		Return a Group reference or create it if it's missing
		"""

		# Fetch or create group
		try:
			return AgentGroup.get(AgentGroup.uuid==gid)

		except AgentGroup.DoesNotExist:
			return AgentGroup.create(uuid=gid)

	def gotHandshake(self, uid, attrib):
		"""
		Handshake received from the given agent
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

	def disableTimedOut(self,timeout=30):
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

class JobManagerComponent(Component):
	"""
	Core jobmanager
	"""

	def __init__(self):
		"""
		Setup job manager
		"""
		Component.__init__(self)

		# Setup logger
		self.logger = logging.getLogger("agent")
		self.logger.info("JobManager component started")

		# TODO: Uhnack this
		# This establishes a presence relationship with the given entity.
		if isinstance(Config.EBUS, XMPPBus):
			for jid in Config.TRUSTED_CHANNELS:
				self.logger.debug("Subscribing %s to my roster" % jid)
				Config.EBUS.send_presence(pto=jid, ptype='subscribe')

		# Register the arbitrary channel creations that can happen
		# when we have an incoming agent handshake
		Config.EBUS.on('channel', self.onChannelCreation)

		# Register callbacks from the internal message bus, such as
		# job creation and abortion
		Config.IBUS.on('job_start', self.onBusJobStart)
		Config.IBUS.on('job_cancel', self.onBusJobCancel)
		Config.IBUS.on('job_restart', self.onBusJobRestart)

		# Channel mapping
		self.channels = { }

		# Agent monitor
		self.manager = JobAgentManager()

	def onChannelCreation(self, channel):
		"""
		Callback when a channel is up
		"""
		self.logger.warn("[%s] Channel created" % channel.name)

		# Store on local map
		self.channels[channel.name] = channel

		# Handle bus messages and evnets
		channel.on('open', self.onAgentOnline, channel=channel)
		channel.on('close', self.onAgentOffline, channel=channel)
		channel.on('handshake', self.onAgentHandshake, channel=channel)

	def onAgentOnline(self, channel=None):
		"""
		Callback when an agent becomes available
		"""
		self.logger.warn("[%s] Channel is open" % channel.name)

		# Turn agent on
		self.manager.updatePresence( channel.name, 1 )

	def onAgentOffline(self, channel=None):
		"""
		Callback when an agent becomes unavailable
		"""
		self.logger.warn("[%s] Channel is closed" % channel.name)

		# Turn agent off
		self.manager.updatePresence( channel.name, 0 )

	def onAgentHandshake(self, message, channel=None):
		"""
		Callback when a handshake arrives in the bus
		"""
		self.logger.warn("[%s] Handshaking" % channel.name)

		# Let manager know that we got a handshake
		self.manager.gotHandshake( channel.name, message )

		# Reply with some data
		channel.reply({
				'some': 'data'
			})

	def onBusJobStart(self, message):
		"""
		Callback when we have a request for new job from the bus
		"""
		pass

	def onBusJobCancel(self, message):
		"""
		Callback when we have a request for new job from the bus
		"""
		pass

	def onBusJobRestart(self, message):
		"""
		Callback when we have a request for new job from the bus
		"""
		pass

	def run(self):
		"""
		Entry point
		"""

		# Run the component
		Component.run(self)