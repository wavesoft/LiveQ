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
import uuid
import logging
import datetime
import traceback

import jobmanager.io.jobs as jobs
import jobmanager.io.scheduler as scheduler
import jobmanager.io.agents as agents
import jobmanager.io.results as results
import liveq.data.histo.reference as reference

from jobmanager.config import Config

from liveq.component import Component
from liveq.io.eventbroadcast import EventBroadcast
from liveq.io.bus import BusChannelException
from liveq.classes.bus.xmppmsg import XMPPBus
from liveq.models import Agent, AgentGroup, AgentMetrics, Observable, JobQueue

from liveq.reporting.postmortem import PostMortem
from liveq.reporting.lars import LARS

from liveq.data.tune import Tune
from liveq.data.histo.utils import rebinToReference
from liveq.data.histo.intermediate import IntermediateHistogramCollection, IntermediateHistogram
from liveq.data.histo.interpolate import InterpolatableCollection

class JobManagerComponent(Component):
	"""
	Core jobmanager
	"""

	def __init__(self):
		"""
		Setup job manager
		"""
		Component.__init__(self)

		# Setup properties
		self.degree_cache = {}

		# The IDs of the agents that were online up til the moment
		# we got a presence handshake with the job managers
		self.negotiationOnlineAgents = []
		self.negotiationMode = True
		self.onlyJobManager = True

		# Calculate server JID
		self.serverJID = "%s@%s" % (Config.EBUS_CONFIG.USERNAME, Config.EBUS_CONFIG.DOMAIN)

		# Setup logger
		self.logger = logging.getLogger("job-manager")
		self.logger.info("JobManager component started")

		# Initialize LiveQ Active Reporting System
		LARS.initialize()
		LARS.openEntity("components/job-manager", "%s#%s" % (Config.EBUS.jid, Config.EBUS.resource), autoKeepalive=True, alias="core")

		# Register the arbitrary channel creations that can happen
		# when we have an incoming agent handshake
		Config.EBUS.on('channel', self.onChannelCreation)
		Config.EBUS.on('online', self.onEBUSOnline)

		# Register callbacks from the internal message bus, such as
		# job creation and abortion
		self.jobChannel = Config.IBUS.openChannel("jobs")
		self.jobChannel.on('job_start', self.onBusJobStart)
		self.jobChannel.on('job_cancel', self.onBusJobCancel)
		self.jobChannel.on('job_refresh', self.onBusJobRefresh)
		self.jobChannel.on('job_results', self.onBusJobResults)

		# Open the interpolator channel were we are dumping the final results
		self.ipolChannel = Config.IBUS.openChannel("interpolate")

		# Open the results manager channel where we are dumping the final results
		# self.resultsChannel = Config.IBUS.openChannel("results")

		# Open an internal channel to use for job manager intercommunication
		self.jmChannel = Config.EBUS.openChannel( self.serverJID )
		self.jmChannel.on('online_query', self.onOnlineQuery)
		self.jmChannel.on('online_reply', self.onOnlineReply)

		# Open a global notifications channel
		self.notificationsChannel = EventBroadcast.forChannel("notifications")

		# Channel mapping
		self.channels = { }

	def adaptCollection(self, lab, collection, requiredHistograms):
		"""
		Trim histograms that does not belong to requiredHistograms
		and/or create missing histograms using reference values.
		"""

		# Log information
		logAdded = []
		logRemoved = []
		numBefore = len(collection)

		# Prepare histograms to add
		createHistograms = list(requiredHistograms)

		# Delete excess histograms
		keys = collection.keys()
		for k in keys:

			# Check if this should not be there
			if not k in requiredHistograms:
				logRemoved.append(k)
				del collection[k]

			# Otherwise remove from the histograms to create
			elif k in createHistograms:
				i = createHistograms.index(k)
				del createHistograms[i]

		# Create missing histograms
		for h in createHistograms:
			collection[h] = IntermediateHistogram.empty( h )
			logAdded.append(h)

		# Log
		self.logger.debug("Adapt REM: %s" % ",".join(logRemoved))
		self.logger.debug("Adapt ADD: %s" % ",".join(logAdded))
		self.logger.info("Adapting collection from %i to %i histograms" % (numBefore, len(collection)))

		# Perform rebinning where appliable
		for k,v in collection.iteritems():
			rebinToReference( collection[k], reference.forLab( lab ).loadReferenceHistogram(k) )

		# Return the updated collection
		return collection

	def getPolyFitDegreeOf(self, name):
		"""
		Get polyFit degree for given histogram
		"""

		# Warm cache
		if not name in self.degree_cache:
			try:
				# Get fitDegree of given observable
				obs = Observable.get( Observable.name == name )
				self.degree_cache[name] = obs.fitDegree
			except Observable.DoesNotExist:
				# Otherwise use None (Default)
				self.degree_cache[name] = None

		# Return cached entry
		return self.degree_cache[name]

	def getHistogramPolyfitDegree(self, histoList):
		"""
		Return a dict with the polyFit degree for the given list of histograms
		"""

		# Iterate of histoList and create response
		ans = {}
		for k in histoList:
			# Get polyfit degree of given histogram
			ans[k] = self.getPolyFitDegreeOf(k)

		# Return
		return ans

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
		channel.on('lars', self.onAgentLARSData, channel=channel)

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

		# Handle deferred completed jobs
		c_jobs = scheduler.getCompletedJobs()
		for job in c_jobs:
			# Notify interested entities that the specified job is completed
			self.notifyJobCompleted(job)

		# Handle the next step in the scheduler
		(job, a_cancel, a_start) = scheduler.process()
		if job:

			# First, cancel the job on the given a_cancel agents
			for agent in a_cancel:
				try:

					# Send status
					job.sendStatus("Aborting job on worker %s" % agent.uuid)

					# Get channel and send cancellations (synchronous)
					agentChannel = self.getAgentChannel( agent.uuid )
					ans = agentChannel.send('job_cancel', {
							'jid': agent.jobToCancel
						})

					# Let job2cancel know that it has lost an agent
					job2c = jobs.getJob(agent.jobToCancel)
					if job2c:
						job2c.stockAgentData(agent)
						job2c.removeAgentInfo(agent)

					# Assume aborted
					self.logger.info("Successfuly cancelled job %s on %s" % ( agent.jobToCancel, agent.uuid ))
					agents.agentJobAborted(agent.uuid, job)

				except Exception as e:
					traceback.print_exc()
					self.logger.error("Exception while cancelling job: %s" % str(e))

			# Calculate run-time parameters for this group of agents
			# that are about to start. This is defining the number
			# of events we have to run in order to accumulate to the 
			# maxium events requested
			if len(a_start) > 0:

				# The getBatchRuntimeConfig function will return a list
				# of configurations, one for each agent in the baatch
				runtimeConfig = job.getBatchRuntimeConfig( a_start )

			# Then, start the job on a_start
			for agent in a_start:

				# Send status
				job.sendStatus("Starting job on worker %s" % agent.uuid)

				# Merge with runtime config
				config = dict(job.parameters)
				config.update( agent.getRuntime() )

				# Get channel and send start (synchronous)
				agentChannel = self.getAgentChannel( agent.uuid )
				ans = agentChannel.send('job_start', {
						'jid': job.id,
						'config': config
					}, waitReply=True)

				# Log results
				if not ans:
					job.sendStatus("Could not contact worker %s" % agent.uuid)
					self.logger.warn("Could not contact %s to cancel job %s. Marking agent offline" % ( agent.uuid, job.id ) )

					# Mark agent offline
					agents.updatePresence( agent.uuid, 0 )
					scheduler.markOffline( agent.uuid )

					# Exit
					return 

				# We sent our request
				agents.agentJobSent(agent.uuid, job)

				if ans['result'] == "ok":

					job.addAgentInfo(agent)
					self.logger.info("Successfuly started job %s on %s (runEvents=%i)" % ( job.id, agent.uuid, config['events'] ))

					# Job is running
					job.setStatus( jobs.RUN )

				else:

					job.sendStatus("Could not start: %s" % ans['error'])
					self.logger.warn("Cannot start job %s on %s (%s)" % ( job.id, agent.uuid, ans['error'] ))

					# A failure occured on the agent - register it
					agents.agentJobFailed(agent.uuid, job)

		# Delay a bit
		time.sleep(5)

	def sendResultsToInterpolator(self, job, histograms):
		"""
		Fit and send resutls to interpolator
		"""

		# Prepare the interpolatable collection that will
		# collect the data to send to the interpolator
		res = InterpolatableCollection(tune=Tune( job.getTunableValues(), labid=job.lab.uuid ))

		# Select only the histograms used in this tune
		degrees = {}
		for h in histograms.values():

			# Get histogram
			histo = h.toHistogram().normalize()

			# Store histogram
			res.append( histo )

			# Store histogram polyFit degree
			degrees[histo.name] = self.getPolyFitDegreeOf(histo.name)

		# Generate fits for interpolation
		try:
			res.regenFits( fitDegree=degrees )
		except Exception as ex:
			traceback.print_exc()
			logging.error("Could not generate fits for job %s (%s)" % (job.id, str(ex)))
			return

		# Send the resulting data to the interpolation database
		self.ipolChannel.send("results", {
				'data': res.pack()
			})

	def notifyJobCompleted(self, job, histoCollection=None):
		"""
		Notify all the interested entities that the given job is completed
		"""

		# Get the merged histograms from the job store if we have
		# not provided them as arguments
		if not histoCollection:
			histoCollection = job.getHistograms()
			if histoCollection == None:
				job.sendStatus("Unable to merge histograms")
				self.logger.warn("[%s] Unable to merge histograms of job %s" % (job.channel.name, job.id))
				return

		# Send status
		job.sendStatus("All workers have finished. Collecting final results.")

		# Store the results
		results.dump( job, histoCollection )

		# Calculate level score [Theoretial Data]
		chi2level = 0.0
		chi2level_list = {}
		if job.level_id:		
			(chi2level, chi2level_list) = reference.forLab( job.level_id ).collectionChi2Reference( histoCollection )

		# Calculate chi2 of the collection [Experimental Data]
		(chi2fit, chi2list) = reference.forLab( job.lab ).collectionChi2Reference( histoCollection )

		# Update results
		job.updateResults( chi2=chi2fit, chi2list=chi2list, chi2level=chi2level, chi2level_list=chi2level_list )

		# Reply to the job channel the final job data
		job.channel.send("job_completed", {
				'jid': job.id,
				'result': 0,
				'fit': chi2fit,
				'data': histoCollection.pack()
			})

		# Send data to interpolator
		self.sendResultsToInterpolator( 
			job,
			histoCollection
			)

		# Send job completion event
		self.notificationsChannel.broadcast("job.completed", {
				'jid': job.id,
				'fit': chi2fit,
				'result': 0
			})

		# Cleanup job from scheduler
		scheduler.releaseJob( job )

		# And then cleanup job
		job.release(reason=jobs.COMPLETED)

	def abortMissingJob(self, job_id, agentChannel):
		"""
		Abort the given job id on the given agent, because no appropriate job entry
		was found in store.
		"""

		# Send cancellation synchronously
		ans = agentChannel.send('job_cancel', {
				'jid': job_id
			})

		# Log results
		self.logger.info("Successfuly request abort of job %s on %s" % ( job_id, agentChannel.name ))


	####################################################################################
	# --------------------------------------------------------------------------------
	#                                CALLBACK HANDLERS
	# --------------------------------------------------------------------------------
	####################################################################################

	# =========================
	# Intercom Channel Callback
	# =========================

	def onOnlineQuery(self, message):
		"""
		Online request sent
		"""

		# Send reply only if this message does not originate from us
		if message['res'] != Config.EBUS_CONFIG.RESOURCE:
			self.jmChannel.send('online_reply', { 'res': Config.EBUS_CONFIG.RESOURCE })

	def onOnlineReply(self, message):
		"""
		Reply to channel ping
		"""

		# Mark us as not the only job manager
		self.onlyJobManager = False

	# =========================
	# Job Agent Callbacks
	# =========================


	def onEBUSOnline(self):
		"""
		Callback when the external bus channel is online
		"""

		# # TODO: Uhnack this
		# # This establishes a presence relationship with known entities.
		# if isinstance(Config.EBUS, XMPPBus):
		
		# 	# Subscribe to agents
		# 	for jid in Config.TRUSTED_CHANNELS:
		# 		self.logger.debug("Subscribing %s to my roster" % jid)
		# 		Config.EBUS.send_presence(pto=jid, ptype='subscribe')

		# 	# Include server status in the roster 
		# 	self.logger.info("Subscribing %s to my roster" % self.serverJID)
		# 	Config.EBUS.send_presence_subscription(self.serverJID)
		# 
		# 	# If we are the only job manager in the roster, reset the
		# 	# states of all worker nodes
		# 	isOnly = True
		# 	if self.serverJID in Config.EBUS.client_roster:
		# 		resources = Config.EBUS.client_roster[self.serverJID].resources.keys()
		# 		if len(resources) == 1:
		# 			isOnly = (resources[0] == Config.EBUS_CONFIG.RESOURCE)
		# 
		# 	# If we are only, reset all agent status
		# 	if isOnly:
		# 		self.logger.info("I am the only job manager. Resetting all agent status.")

		# Wait for 1 sec for reply
		# msg = self.jmChannel.send('ping', {})
		# if msg is None:
		# 	# If we had no pong, exit
		# 	self.logger.info("I am the only job manager. Resetting all agent status.")

		# Send online query
		self.jmChannel.send('online_query', {'res': Config.EBUS_CONFIG.RESOURCE })
		Config.EBUS.schedule( "decision", 1, self.onNegotiationTimeout )

	def onNegotiationTimeout(self):
		"""
		Negotiation times out after some time, that's time for decisions
		"""

		# Turn off negotiation mode
		self.negotiationMode = False

		# Check if we should reset and which agents we should reset
		if self.onlyJobManager:
			self.logger.warn("We are the only job manager alive. Resetting state of workers!")

			# Reset workers not present in the ones found already online
			self.logger.info("Excluding agents %r" % self.negotiationOnlineAgents)
			agents.updateAllPresence(0, exclude=self.negotiationOnlineAgents)

	def onChannelCreation(self, channel):
		"""
		Callback when a channel is up
		"""

		self.logger.info("[%s] Channel created" % channel.name)

		# Store on local map
		self.channels[channel.name] = channel
		self.negotiationOnlineAgents.append(channel.name)

		# Setup callbacks
		self._setupChannelCallbacks(channel)

	def onAgentOnline(self, channel=None):
		"""
		Callback when an agent becomes available
		"""
		self.logger.info("[%s] Channel is open" % channel.name)

		# Turn agent on
		agents.updatePresence( channel.name, 1 )

		# Notify scheduler that the agent is online
		scheduler.markOnline( channel.name )

	def onAgentOffline(self, channel=None):
		"""
		Callback when an agent becomes unavailable
		"""
		self.logger.info("[%s] Channel is closed" % channel.name)

		# Turn agent off
		agents.updatePresence( channel.name, 0 )

		# Notify scheduler that the agent is offline
		scheduler.markOffline( channel.name )

	def onAgentLARSData(self, message, channel=None):
		"""
		Callback when LARS payload arrives
		"""

		# Open forwarder
		repeater = LARS.openRepeater(alias=channel, prefixes=[
				"lars/agents/%s" % channel.name.replace("/", "#")
			])

		# Process LARS frames
		for frame in message['frames']:
			repeater.send(frames)

	def onAgentHandshake(self, message, channel=None):
		"""
		Callback when a handshake arrives in the bus
		"""
		self.logger.info("[%s] Agent rev.%s came online (slots/free=%s/%s)" % (channel.name, message['version'], message['slots'], message['free_slots']))

		# Let manager know that we got a handshake
		agents.updateHandshake( channel.name, message )

		# If the agent has free slots, reset it's job status
		if message['free_slots'] > 0:
			agent = agents.getAgent(channel.name)
			if agent:
				agent.activeJob = 0
				agent.setRuntime( None )
				agent.save()

		# Send agent report to LARS
		report = LARS.openGroup("agents", channel.name, alias=channel.name)

		# Reply with some data
		version = int(message['version'])
		if version == 1:
			# VER 1: Older agents are listening for reply
			channel.reply({ 'status': 'ok' })

			# Send report
			report.set("version", 1)
			report.set("handshake", 1)

		else:
			# VER 2: Newer agents are listening for new message
			channel.send('handshake_ack', {
					'status': 'ok'
				})

			# Send report
			report.set("version", 2)
			report.set("handshake", 1)

	def onAgentJobData(self, data, channel=None):
		"""
		Callback when we receive data from a job agent
		"""

		# Send agent report to LARS
		report = LARS.openGroup("agents", channel.name, alias=channel.name)

		# Extract and validate job ID from message
		jid = data['jid']
		if not jid:
			self.logger.warn("[%s] Missing job ID in the arguments" % channel.name)
			report.openGroup("errors").add("missing-job-id", 1)
			return

		# Fetch job class
		job = jobs.getJob(jid)
		if (not job) or (job.getStatus() == jobs.CANCELLED):
			self.logger.warn("[%s] The job %s does not exist or is cancelled" % (channel.name, jid))
			self.abortMissingJob(jid, channel)
			report.openGroup("errors").add("wrong-job-id", 1)
			return

		# Get the intermediate histograms from the agent buffer
		agentHistos = IntermediateHistogramCollection.fromPack( data['data'] )
		if not agentHistos:
			job.sendStatus("Could not parse data from worker %s" % channel.name)
			self.logger.warn("[%s] Could not parse data for job %s" % (channel.name, jid))
			report.openGroup("errors").add("unpack-error", 1)
			return

		# DEBUG: Discard final histograms
		if agentHistos.state == 2:
			self.logger.info("[%s] *HACK* Discarding normalized final histograms for job %s" % (channel.name, jid))
			return

		# Adapt histogram collection to the lab tunables
		agentHistos = self.adaptCollection( job.lab, agentHistos, job.lab.getHistograms() )

		# Merge histograms with other histograms of the same job
		# and return resulting histogram collection
		sumHistos = job.updateHistograms( channel.name, agentHistos )
		if sumHistos == None:
			job.sendStatus("Unable to merge histograms")
			self.logger.warn("[%s] Unable to merge histograms of job %s" % (channel.name, jid))
			report.openGroup("errors").add("merge-error", 1)
			return

		self.logger.info("[%s] Got data for job %s (events=%i)" % (channel.name, jid, job.getEvents()))

		# Send status
		job.sendStatus("Processing data from %s" % channel.name, varMetrics={
				"agent_data": channel.name,
				"agent_frames": 1
			})

		report.add("data-frames", 1)

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

		# Send agent report to LARS
		report = LARS.openGroup("agents", channel.name, alias=channel.name)

		# Extract and validate job ID from message
		jid = data['jid']
		if not jid:
			self.logger.warn("[%s] Missing job ID in the arguments" % channel.name)
			report.openGroup("errors").add("missing-job-id", 1)
			return
			# Send reports
			report.openGroup("jobs").add("failed", 1)

		# Fetch job class
		job = jobs.getJob(jid)
		if not job:
			self.logger.warn("[%s] The job %s does not exist" % (channel.name, jid))
			report.openGroup("errors").add("wrong-job-id", 1)
			return

		# Check result
		ans = int(data['result'])
		if ans != 0:

			# Handle error
			job.sendStatus("Worker %s failed to run job (exit code=%i)" % (channel.name, ans))
			self.logger.warn("Worker %s failed to run job (exit code=%i)" % (channel.name, ans))

			# Handle the agent as lost
			agent = agents.getAgent( channel.name )
			scheduler.handleLoss( agent )

			# Check for post-mortem data
			pmData = None
			if 'postmortem' in data:
				pmData = data['postmortem']

			# Register the agent job failure
			agents.agentJobFailed( channel.name, job, pmData )

		else:

			# Send status
			job.sendStatus("Worker %s has finished the job" % channel.name)
			self.logger.info("Worker %s has finished the job" % channel.name)

			# Get the merged histograms from the job store
			histos = job.getHistograms()
			if histos == None:
				job.sendStatus("Unable to merge histograms")
				self.logger.warn("[%s] Unable to merge histograms of job %s" % (channel.name, jid))
				return

			# Register the agent job success
			agents.agentJobSucceeded( channel.name, job )

			# Free this agent from the given job, allowing
			# scheduler logic to process the free resource
			scheduler.releaseFromJob( channel.name, job )

			# Check if the job is completed
			if scheduler.completeOrReschedule(job):

				# Job is completed
				self.logger.info("All workers of job %s have finished" % jid)

			else:

				# Otherwise just send intermediate data
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

		if not all(x in message for x in ('lab', 'parameters', 'group', 'user', 'team', 'level')):
			self.logger.warn("Missing parameters on 'job_start' message on IBUS!")
			self.jobChannel.reply({
					'result': 'error',
					'error': 'Missing parameters on \'job_start\' message on IBUS'
				})
			return

		# Fetch the lab ID and the user parameters
		lab = message['lab']
		userID = message['user']
		teamID = message['team']
		levelID = message['level']
		parameters = message['parameters']
		group = message['group']

		# Allocate a unique ID on the dataChannel
		# That's the channel name in IBUS where we should dump the data
		dataChannel = "data-%s" % uuid.uuid4().hex

		# Lookup previous job
		job = jobs.findJob( lab, parameters )
		if job:

			# Fetch raw payload
			payload = results.loadRaw(job.id)
			if payload:

				# Link job
				job = jobs.cloneJob( job, group, userID, teamID, levelID )

				# A job with this parameters already exist, return right away
				self.jobChannel.reply({
						'jid': job.id,
						'result': 'exists',
						'data': payload
					})
				return

		# Create a new job descriptor
		job = jobs.createJob( lab, parameters, group, userID, teamID, levelID, dataChannel )
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
				'dataChannel': dataChannel,
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
					})

				# Log successful abort
				job.sendStatus("Successfuly aborted")
				self.logger.info("Successfuly cancelled job %s on %s" % ( job.id, agent.uuid ))
				agents.agentJobAborted(agent.uuid, job)

		# And then cleanup job
		job.release(reason=jobs.CANCELLED)

		# Reply status
		self.jobChannel.reply({
				'result': 'ok'
			})

	def onBusJobRefresh(self, message):
		"""
		Callback when the remote end requests a re-send of the current histogram stack
		"""

		# Validate arguments
		if not 'jid' in message:
			self.logger.warn("Missing parameters on 'job_refresh' message on IBUS!")
			self.jobChannel.reply({
					'result': 'error',
					'error': 'Missing parameters on \'job_refresh\' message!'
				})
			return

		# Fetch JID from request
		jid = message['jid']
		self.logger.info("Requesting refresh of job #%s" % jid)

		# Fetch job class
		job = jobs.getJob(jid)
		if not job:
			self.logger.warn("[IBUS] The job %s does not exist" % jid)
			self.jobChannel.reply({
					'result': 'error',
					'error': "The job %s does not exist" % jid
				})
			return

		# Get the merged histograms from the job store
		histos = job.getHistograms()
		if histos == None:
			job.sendStatus("Unable to merge histograms")
			self.logger.warn("[%s] Unable to merge histograms of job %s" % (job.channel.name, jid))
			return

		# Send data on job channel
		job.channel.send("job_data", {
				'jid': jid,
				'data': histos.pack()
			})

		# If we are completed, send job_compelted + histograms
		if job.getStatus() == jobs.COMPLETED:
			job.channel.send("job_completed", {
					'jid': job.id,
					'result': 0,
					'data': histoCollection.pack()
				})

	def onBusJobResults(self, message):
		"""
		Return job results
		"""

		# Validate arguments
		if not 'jid' in message:
			self.logger.warn("Missing parameters on 'job_results' message on IBUS!")
			self.jobChannel.reply({
					'result': 'error',
					'error': 'Missing parameters on \'job_results\' message!'
				})
			return

		# Fetch JID from request
		jid = message['jid']
		self.logger.info("Requesting results of job #%s" % jid)

		# Fetch job class
		job = jobs.getJob(jid)
		if not job:
			self.logger.warn("[IBUS] The job %s does not exist" % jid)
			self.jobChannel.reply({
					'result': 'error',
					'error': "The job %s does not exist" % jid
				})
			return

		# Check if this is a cloned job
		if job.job.status == JobQueue.CLONED:

			# Get job metadata
			meta = job.getResultsMeta()
			if not 'reference' in meta:
				self.logger.warn("[IBUS] The job %s is cloned but reference data are missing" % jid)
				self.jobChannel.reply({
						'result': 'error',
						'error': "The job %s is cloned but reference data are missing" % jid
					})
				return

			# Get reference jid
			jid = meta['reference']

		# Fetch raw payload
		payload = results.loadRaw(jid)
		if not payload:
			self.logger.warn("Could not load results payload for job %s!" % jid)
			self.jobChannel.reply({
					'result': 'error',
					'error': 'Could not load results payload for job %s!' % jid
				})
			return

		# Send raw payload
		self.jobChannel.reply({
				'result': 'ok',
				'data': payload
			})
