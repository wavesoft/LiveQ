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
import uuid
import cPickle as pickle

from jobmanager.config import Config
from jobmanager.internal.agentmanager import JobAgentManager

from liveq.io.bus import BusChannelException
from liveq.component import Component
from liveq.classes.bus.xmppmsg import XMPPBus
from liveq.utils import deepupdate

from liveq.models import Agent, AgentGroup, AgentMetrics

from liveq.data.histo.intermediate import IntermediateHistogramCollection
from liveq.data.histo.sum import intermediateCollectionMerge

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
		self.jobChannel = Config.IBUS.openChannel("jobs")
		self.jobChannel.on('job_start', self.onBusJobStart)
		self.jobChannel.on('job_cancel', self.onBusJobCancel)

		# Channel mapping
		self.channels = { }

		#####################################################################
		# ---- BEGIN HACK ----

		# A list of jobs that I manage
		self.activeJobs = {}

		# ----- END HACK ----
		#####################################################################


		# Agent monitor
		self.manager = JobAgentManager()

	def _setupChannelCallbacks(self, channel):
		"""
		Bind the appropriate callbacks to the given channel
		"""

		# Handle bus messages and evnets
		channel.on('open', self.onAgentOnline, channel=channel)
		channel.on('close', self.onAgentOffline, channel=channel)
		channel.on('handshake', self.onAgentHandshake, channel=channel)

		channel.on('job_data', self.onAgentJobData, channel=channel)
		channel.on('job_completed', self.onAgentJobCompleted, channel=channel)

	def getAgentChannel(self, agentID):
		"""
		Return the channel from registry or open a new one if needed.
		"""

		# Check for channel in the registry
		if agentID in self.channels:
			return self.channels[agentID]

		# Create new one
		channel = Config.EBUS.openChannel(agentID)
		self.channels[agentID] = channel

		# Setup callbacks
		self._setupChannelCallbacks(channel)

		# Return instance
		return channel

	def onChannelCreation(self, channel):
		"""
		Callback when a channel is up
		"""
		self.logger.info("[%s] Channel created" % channel.name)

		# Store on local map
		self.channels[channel.name] = channel

		# Setup callbacks
		self._setupChannelCallbacks(channel)

	def onAgentOnline(self, channel=None):
		"""
		Callback when an agent becomes available
		"""
		self.logger.info("[%s] Channel is open" % channel.name)

		# Turn agent on
		self.manager.updatePresence( channel.name, 1 )

	def onAgentOffline(self, channel=None):
		"""
		Callback when an agent becomes unavailable
		"""
		self.logger.info("[%s] Channel is closed" % channel.name)

		# Turn agent off
		self.manager.updatePresence( channel.name, 0 )

	def onAgentHandshake(self, message, channel=None):
		"""
		Callback when a handshake arrives in the bus
		"""
		self.logger.info("[%s] Handshaking" % channel.name)

		# Let manager know that we got a handshake
		self.manager.updateHandshake( channel.name, message )

		# Reply with some data
		channel.reply({ 'some': 'data' })

	def onAgentJobData(self, data, channel=None):
		"""
		Callback when we receive data from a job agent
		"""
		self.logger.info("[%s] Got data" % channel.name)

		# Extract job ID from message
		jid = data['jid']

		# Get the job info from store
		job_data = Config.STORE.get("jobdata-%s" % jid)
		if not job_data:
			self.logger.warn("[%s] Could not find job state in store for job %s" % (channel.name, jid))
			return

		# Get the intermediate histograms from the buffer
		histos = IntermediateHistogramCollection.fromPack( data['data'] )
		if not histos:
			self.logger.warn("[%s] Could not parse data for job %s" % (channel.name, jid))
			return

		# Unpickle buffer
		job_data = pickle.loads( job_data )

		# Store/Update histogram collection for this agent
		job_data[channel.name] = histos

		# Merge histogram collections
		histos = intermediateCollectionMerge( job_data.values() )

		# Pack hstogram and send it to the internal bus
		if jid in self.activeJobs:
			job = self.activeJobs[jid]

			# Forward message on the internal bus as-is
			job['replyTo'].send("job_data", data)

		# ----- END HACK ----
		#####################################################################

	def onAgentJobCompleted(self, data, channel=None):
		"""
		Callback when the job in the specified agent is completed
		"""
		self.logger.info("[%s] Job completed" % channel.name)

		#####################################################################
		# ---- BEGIN HACK ----

		# Extract job ID from message
		jid = data['jid']

		# Forward the message to the internal bus as-is
		if jid in self.activeJobs:
			job = self.activeJobs[jid]

			# Forward message on the internal bus as-is
			job['replyTo'].send("job_completed", data)

			# Close data channel and delete job from registry
			job['replyTo'].close()
			del self.activeJobs[jid]

			# Release agents
			for agent in job['agents']:
				self.manager.releaseAgent( agent.id )


		# ----- END HACK ----
		#####################################################################

	def onBusJobStart(self, message):
		"""
		Callback when we have a request for new job from the bus
		"""
		
		if not all(x in message for x in ('lab', 'parameters', 'group', 'dataChannel')):
			self.logger.warn("Missing parameters on 'job_start' message on IBUS!")
			return

		# Fetch the lab ID and the user parameters
		lab = message['lab']
		parameters = message['parameters']
		group = message['group']
		dataChannel = message['dataChannel']

		# Create new Job ID
		jid = uuid.uuid4().hex

		#####################################################################
		# ---- BEGIN HACK ----

		# Find a free agent
		agent = self.manager.acquireFreeAgent(group)

		# Check if we could not find a free agent
		if not agent:
			self.logger.error("No free agents were found on group #%s" % group)
			self.jobChannel.reply({
					'result': 'error',
					'error': "No free agents were found on group #%s" % group
				})
			return

		# Fetch lab with the given UUID
		labInst = self.manager.getLabByUUID(lab)
		if not labInst:
			self.logger.error("Could not find lab #%s" % lab)
			self.jobChannel.reply({
					'result': 'error',
					'error': "Could not find lab #%s" % lab
				})
			return

		# Process user's parameters
		userParameters = { }
		tunables = labInst.getTunables()
		for k,parm in tunables.iteritems():

			# Get user parameter
			if k in parameters:

				# Convert to numbers
				vValue = float(parameters[k])
				vMax = float(parm['max'])
				vMin = float(parm['min'])
				vDecimals = int(parm['dec'])

				# Wrap value betwen min and max
				vValue = max( min( vMax, vValue ), vMin )

				# Convert to a number with the specified precision
				# and store it on the user parameters
				userParameters[k] = ("%." + str(vDecimals) + "f") % vValue

		# Deep merge lab default parameters and user's parameters
		mergedParameters = deepupdate( { "tune": userParameters } , labInst.getParameters() )

		# Put more lab information in the parameters
		mergedParameters['repoTag'] = labInst.repoTag
		mergedParameters['repoType'] = labInst.repoType
		mergedParameters['repoURL'] = labInst.repoURL
		mergedParameters['histograms'] = labInst.getHistograms()
		
		# Open/Retrieve a channel with the specified agent
		agentChannel = self.getAgentChannel(agent.uuid)

		# Kindly ask to start a job
		ans = agentChannel.send('job_start', {
				'jid': jid,
				'config': mergedParameters
			}, waitReply=True)

		# Check for timeout
		if not ans:
			self.logger.error("Timed out while waiting for response from agent #%s" % agent.uuid)
			self.jobChannel.reply({
					'result': 'error',
					'error': 'No valid agents were found'
				})
			return

		# Check for erroreus answer
		if ans['result'] != 'ok':
			self.logger.error("Got error response from agent #%s: %s" % (agent.uuid, ans['error']))
			self.jobChannel.reply({
					'result': 'error',
					'error': "Remote error: %s" % ans['error']
				})
			return

		# Open a channel to reply to
		self.reply_to = Config.IBUS.openChannel(dataChannel)

		# Store job info
		self.activeJobs[jid] = {
				'agents': [ agent ],
				'replyTo': self.reply_to
			}

		# Reply status
		self.jobChannel.reply({
				'jid': jid,
				'result': 'scheduled'
			})

		# ----- END HACK ----
		#####################################################################

	def onBusJobCancel(self, message):
		"""
		Callback when we have a request for new job from the bus
		"""

		#####################################################################
		# ---- BEGIN HACK ----

		# Fetch JID from request
		jid = message['jid']

		# Check if we are managing this jid
		if jid in self.activeJobs:
			job = self.activeJobs[jid]

			# Send cancellation to all job agents
			for agent in job['agents']:

				# Cancel job on the agent
				agentChannel = self.getAgentChannel(agent.uuid)
				ans = agentChannel.send('job_cancel', {
						'jid': jid
					})

				# Free agent
				# TODO: Not optimal: The agent might not really be free!
				self.manager.releaseAgent( agent.id )

		# Reply status
		self.jobChannel.reply({
				'result': 'ok'
			})

		# ----- END HACK ----
		#####################################################################

	def run(self):
		"""
		Entry point
		"""

		# Run the component
		Component.run(self)