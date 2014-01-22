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
import datetime

import jobmanager.io.jobs as jobs
import jobmanager.io.scheduler as scheduler
import jobmanager.io.agents as agents

from jobmanager.config import Config
from jobmanager.internal.agentmanager import JobAgentManager

from liveq.io.bus import BusChannelException
from liveq.component import Component
from liveq.classes.bus.xmppmsg import XMPPBus

from liveq.models import Agent, AgentGroup, AgentMetrics

from liveq.data.histo.intermediate import IntermediateHistogramCollection

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
		self.logger = logging.getLogger("job-manager")
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

		# Open the interpolator channel were we are dumping the final results
		self.ipolChannel = Config.IBUS.openChannel("interpolate")

		# Channel mapping
		self.channels = { }

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

	def step(self):
		"""
		Internal component loop
		"""

		# Handle the next step in the scheduler
		(job, a_cancel, a_start) = scheduler.process()
		if job:

			# First, cancel the job on the given a_cancel agents
			for agent in a_cancel:

				# Get channel and send cancellations (synchronous)
				agentChannel = self.getAgentChannel( agent.uuid )
				ans = agentChannel.send('job_cancel', {
						'jid': job.id
					}, waitReply=True)

				# Log results
				if not ans:
					self.logger.warn("Could not contact %s to cancel job %s" % ( agent.uuid, job.id ) )
				elif ans['result'] == "ok":
					self.logger.info("Successfuly cancelled job %s on %s" % ( job.id, agent.uuid ))
				else:
					self.logger.warn("Cannot cancel job %s on %s (%s)" % ( job.id, agent.uuid, ans['error'] ))

			# Then, start the job on a_start
			for agent in a_start:

				# Get channel and send start (synchronous)
				agentChannel = self.getAgentChannel( agent.uuid )
				ans = agentChannel.send('job_start', {
						'jid': job.id,
						'config': job.parameters
					}, waitReply=True)

				# Log results
				if not ans:
					self.logger.warn("Could not contact %s to cancel job %s" % ( agent.uuid, job.id ) )
				elif ans['result'] == "ok":
					self.logger.info("Successfuly started job %s on %s" % ( job.id, agent.uuid ))
				else:
					self.logger.warn("Cannot start job %s on %s (%s)" % ( job.id, agent.uuid, ans['error'] ))

		# Delay a bit
		time.sleep(5)

	####################################################################################
	# --------------------------------------------------------------------------------
	#                                CALLBACK HANDLERS
	# --------------------------------------------------------------------------------
	####################################################################################

	# =========================
	# Job Agent Callbacks
	# =========================

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

		# Notify scheduler that the agent is online
		scheduler.markOnline( channel.name )

	def onAgentOffline(self, channel=None):
		"""
		Callback when an agent becomes unavailable
		"""
		self.logger.info("[%s] Channel is closed" % channel.name)

		# Turn agent off
		self.manager.updatePresence( channel.name, 0 )

		# Notify scheduler that the agent is offline
		scheduler.markOffline( channel.name )

	def onAgentHandshake(self, message, channel=None):
		"""
		Callback when a handshake arrives in the bus
		"""
		self.logger.info("[%s] Agent version %s shake hands" % (channel.name, message['version']))

		# Let manager know that we got a handshake
		self.manager.updateHandshake( channel.name, message )

		# If the agent has free slots, reset it's job status
		if message['free_slots'] > 0:
			agent = agents.getAgent(channel.name)
			if agent:
				agent.activeJob = ""
				agent.save()

		# Reply with some data
		channel.reply({ 'status': 'ok' })

	def onAgentJobData(self, data, channel=None):
		"""
		Callback when we receive data from a job agent
		"""
		self.logger.info("[%s] Got data" % channel.name)

		# Extract and validate job ID from message
		jid = data['jid']
		if not jid:
			self.logger.warn("[%s] Missing job ID in the arguments" % channel.name)
			return

		# Fetch job class
		job = jobs.getJob(jid)
		if not job:
			self.logger.warn("[%s] The job %s does not exist" % (channel.name, jid))
			return

		# Send status
		job.sendStatus("Processing data from %s" % channel.name)

		# Get the intermediate histograms from the agent buffer
		agentHistos = IntermediateHistogramCollection.fromPack( data['data'] )
		if not agentHistos:
			job.sendStatus("Could not parse data from worker %s" % channel.name)
			self.logger.warn("[%s] Could not parse data for job %s" % (channel.name, jid))
			return

		# Merge histograms with other histograms of the same job
		# and return resulting histogram collection
		sumHistos = job.updateHistograms( channel.name, agentHistos )
		if sumHistos == None:
			job.sendStatus("Unable to merge histograms")
			self.logger.warn("[%s] Unable to merge histograms of job %s" % (channel.name, jid))
			return

		# Re-pack histogram collection and send to the
		# internal bus for further processing
		job.channel.send("job_data", {
				'jid': jid,
				'data': sumHistos.pack()
			})

	def onAgentJobCompleted(self, data, channel=None):
		"""
		Callback when the job in the specified agent is completed
		"""
		self.logger.info("[%s] Job completed" % channel.name)

		# Extract and validate job ID from message
		jid = data['jid']
		if not jid:
			self.logger.warn("[%s] Missing job ID in the arguments" % channel.name)
			return

		# Fetch job class
		job = jobs.getJob(jid)
		if not job:
			self.logger.warn("[%s] The job %s does not exist" % (channel.name, jid))
			return

		# Send status
		job.sendStatus("Worker %s has finished the job" % channel.name)

		# Get the merged histograms from the job store
		histos = job.getHistograms()
		if histos == None:
			job.sendStatus("Unable to merge histograms")
			self.logger.warn("[%s] Unable to merge histograms of job %s" % (channel.name, jid))
			return

		# Free this agent from the given job, allowing
		# scheduler logic to process the free resource
		scheduler.releaseFromJob( channel.name, job )

		# If all jobs are completed, forward the job_completed event,
		# otherwise fire the job_data event.
		if histos.state == 2:

			# Send status
			job.sendStatus("All workers have finished. Collecting final results.")

			# Pack data once
			histoPack = histos.pack()

			# If ALL histograms have state=2 (completed), it means that the
			# job is indeed completed. Reply to the job channel the final job data
			job.channel.send("job_completed", {
					'jid': jid,
					'result': 0,
					'data': histoPack
				})

			# Send the resulting data to the interpolation database
			self.ipolChannel.send("results", {
					'lab': job.lab.uuid,
					'config': job.parameters['tune'],
					'data': histoPack
				})

			# Cleanup job from scheduler
			scheduler.releaseJob( job )

			# And then cleanup job
			job.release()

		else:
			job.channel.send("job_data", {
					'jid': jid,
					'data': histos.pack()
				})


	# =========================
	# Internal Bus Callbacks
	# =========================

	def onBusJobStart(self, message):
		"""
		Callback when we have a request for new job from the bus
		"""

		self.logger.info("Got job request in IBUS")

		if not all(x in message for x in ('lab', 'parameters', 'group', 'dataChannel')):
			self.logger.warn("Missing parameters on 'job_start' message on IBUS!")
			self.jobChannel.reply({
					'result': 'error',
					'error': 'Missing parameters on \'job_start\' message on IBUS'
				})
			return

		# Fetch the lab ID and the user parameters
		lab = message['lab']
		parameters = message['parameters']
		group = message['group']
		dataChannel = message['dataChannel'] # << The channel name in IBUS where we should dump the data

		# Create a new job descriptor
		job = jobs.createJob( lab, parameters, group, dataChannel )
		if not job:
			# Reply failure
			self.jobChannel.reply({
					'result': 'error',
					'error': 'Unable to process the job request'
				})
			return

		# Place our job inquiry in scheduler and check for response
		self.logger.info("Requesting job #%s on scheduler" % job.id)
		scheduler.requestJob( job )

		# Reply success
		self.jobChannel.reply({
				'jid': job.id,
				'result': 'scheduled'
			})


	def onBusJobCancel(self, message):
		"""
		Callback when we have a request for new job from the bus
		"""

		if not 'jid' in message:
			self.logger.warn("Missing parameters on 'job_cancel' message on IBUS!")
			self.jobChannel.reply({
					'result': 'error',
					'error': 'Missing parameters on \'job_cancel\' message!'
				})
			return

		# Fetch JID from request
		jid = message['jid']
		self.logger.info("Requesting abort of job #%s" % jid)

		# Fetch job class
		job = jobs.getJob(jid)
		if not job:
			self.logger.warn("[IBUS] The job %s does not exist" % jid)
			self.jobChannel.reply({
					'result': 'error',
					'error': "The job %s does not exist" % jid
				})
			return

		# Abort job on scheduler and return the agents that were used
		a_cancel = scheduler.abortJob( job )
		if a_cancel:
			for agent in a_cancel:

				# Skip invalid entries
				if not agent:
					continue

				# Get channel and send cancellations (synchronous)
				agentChannel = self.getAgentChannel( agent.uuid )
				ans = agentChannel.send('job_cancel', {
						'jid': jid
					}, waitReply=True)

				# Log results
				if not ans:
					self.logger.warn("Could not contact %s to cancel job %s" % ( agent.uuid, job.id ) )
				elif ans['result'] == "ok":
					self.logger.info("Successfuly cancelled job %s on %s" % ( job.id, agent.uuid ))
				else:
					self.logger.warn("Cannot cancel job %s on %s (%s)" % ( job.id, agent.uuid, ans['error'] ))

		# And then cleanup job
		job.release()

		# Reply status
		self.jobChannel.reply({
				'result': 'ok'
			})
