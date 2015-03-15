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
import uuid
import cPickle as pickle
import random
import json

from jobmanager.config import Config
from peewee import fn

from liveq.utils import deepupdate
from liveq.models import Agent, Lab, JobQueue
from liveq.data.histo.sum import intermediateCollectionMerge
from liveq.utils.remotelock import RemoteLock
from liveq.reporting.lars import LARS

#: Reason: Job is running
RUN = JobQueue.RUN
#: Reason: Job is completed
COMPLETED = JobQueue.COMPLETED
#: Reason: Job is failed
FAILED = JobQueue.FAILED
#: Reason: Job was cancelled
CANCELLED = JobQueue.CANCELLED
# :Reason: Job stalled
STALLED = JobQueue.STALLED

class Job:
	"""
	Store interface with the job management
	"""

	def __init__(self, job):
		"""
		Initialize job by it's ID

		There are two ways of constructing this class:
		- By defining the `buf` and the `id`: which is the contents of the metadata key and will resume a Job
		- By not defining the `buf`: Where a new Job will be allocated
		"""

		# Keep job instance
		self.job = job
		self.lab = job.lab
		self.group = job.group
		self.parameters = json.loads(job.parameters)

		# Prepare/allocate new job ID if we haven't
		# specified anything
		self.id = str(self.job.id)
		if not id:

			# Send report to LARS
			report = LARS.openGroup("labs/%s/jobs" % lab.uuid, self.id, alias=self.id)
			report.add("active", 1)


		# Try to open channel
		if job.dataChannel:

			# Fetch job channel
			self.channel = Config.IBUS.openChannel(job.dataChannel)
			self.dataChannel = job.dataChannel

		else:
			self.channel = None

	def updateHistograms(self, agent_id, data):
		"""
		Add/Update a histogram data for the given agent_id
		and return all the histograms as an array
		"""

		# Prepare histograms dict
		histos = { }

		# Fetch histogram buffer from store
		buf = Config.STORE.get("job-%s:histo" % self.id)
		if buf:
			histos = pickle.loads(buf)

		# Update our histogram
		histos[agent_id] = data

		# Put it back
		Config.STORE.set("job-%s:histo" % self.id, pickle.dumps(histos))

		# Merge histograms
		hc = intermediateCollectionMerge( histos.values() )

		# Update number of events in the job files
		self.job.events = hc.countEvents()
		self.job.save()

		# Return collection
		return hc

	def getHistograms(self):
		"""
		Get and merge all the histograms in the stack
		"""

		# Prepare histograms dict
		histos = { }

		# Fetch histogram buffer from store
		buf = Config.STORE.get("job-%s:histo" % self.id)
		if buf:
			histos = pickle.loads(buf)

		# Merge and return histograms
		return intermediateCollectionMerge( histos.values() )

	def removeAgentData(self, agent):
		"""
		Remove data from the given agent from the histogram
		"""

		# Fetch histogram buffer from store
		buf = Config.STORE.get("job-%s:histo" % self.id)
		if not buf:
			return 0

		# Unpickle
		histos = pickle.loads(buf)
		if agent in histos:
			del histos[agent]

		# Pickle and put back
		Config.STORE.set("job-%s:histo" % self.id, pickle.dumps(histos))

		# Return number of agents left
		return len(histos)

	def release(self, reason=JobQueue.COMPLETED):
		"""
		Delete job and all of it's resources
		"""

		# Delete entries in the STORE
		Config.STORE.delete("job-%s:histo" % self.id)

		# Mark job as completed
		self.job.status = reason
		self.job.save()

		# Close channel
		self.channel.close()

	def addAgentInfo(self, agent):
		"""
		Let other end of the job that an agent has gone online
		"""

		# Send status message
		self.sendStatus("Acquired agent %s" % agent.uuid, varMetrics={
				"agent_added": agent.uuid,
				"agent_added_latlng": agent.latlng
			})

	def removeAgentInfo(self, agent):
		"""
		Let other end of the job that an agent has gone offline
		"""

		# Send status message
		self.sendStatus("Lost agent %s" % agent.uuid, varMetrics={
				"agent_removed": agent.uuid
			})

	def sendStatus(self, message, varMetrics={}):
		"""
		Send a status message to the job recepient

		You can also provide machine-parsable metric variables
		"""

		# Send status message
		self.channel.send("job_status", {
				"message": message,
				'vars': varMetrics
			})

	def getRemainingEvents(self):
		"""
		Get number of events remaining
		"""

		# Calculate how many events do active workers are processing
		counters = Agent.select( fn.Sum( Agent.activeJobEvents ).alias('events') ) \
						.where( Agent.activeJob == self.job.id ) \
						.get()

		# Handle None cases
		if counters.events is None:
			counters.events = 0

		# Get target events
		targetEvents = self.lab.getEventCount()

		# Check how many events are left
		return targetEvents - self.job.events - counters.events

	def getBatchRuntimeConfig(self, agents):
		"""
		Get the runtime configuration for the agents in the given batch
		"""

		# Prepare configurations
		configs = []

		# Calculate number of events to divide along workers
		totalEvents = self.getRemainingEvents()
		eventsPerWorker = totalEvents / len(agents)

		# Process agents
		random.seed()
		for a in agents:

			# Compensate remainder of events
			events = eventsPerWorker
			if totalEvents < eventsPerWorker:
				events = totalEvents
			else:
				totalEvents -= eventsPerWorker

			# Append agent config
			configs.append({
					'seed': int(random.random()*65535),
					'events' : events
				})

		# Return configs
		return configs

	def setStatus(self, status):
		"""
		Update job status
		"""
		# Update stateus
		if self.job.status != status:
			self.job.status = status
			self.job.save()

	def getStatus(self):
		"""
		Get job status
		"""
		return self.job.status

	def getEvents(self):
		"""
		Return number of events so far
		"""
		return self.job.events

##############################################################
# ------------------------------------------------------------
#  INTERFACE FUNCTIONS
# ------------------------------------------------------------
##############################################################

def createJob( lab, parameters, group, userID, teamID, dataChannel ):
	"""
	This function will create a new Job with a unique ID and will set-up
	the response channel for the internal bus to `dataChannel`
	"""

	# Try to lookup a lab with the given ID
	labInst = None
	try:
		labInst = Lab.get( Lab.uuid == lab)
	except Lab.DoesNotExist:
		logging.warn("Could not find lab #%s" % lab)
		return

	# Ensure user-provided tunes follow the appropriate format
	userTunes = labInst.formatTunables(parameters)

	# Deep merge lab default parameters and user's parameters
	mergedParameters = deepupdate( { "tune": userTunes } , labInst.getParameters() )

	# Put more lab information in the parameters
	mergedParameters['repoTag'] = labInst.repoTag
	mergedParameters['repoType'] = labInst.repoType
	mergedParameters['repoURL'] = labInst.repoURL
	mergedParameters['histograms'] = labInst.getHistograms()

	# Extract events
	events = 10000
	try:
		if 'events' in parameters:
			events = int(parameters['events'])
	except Exception:
		pass

	# Create a new job record
	job = JobQueue.create(
		lab=labInst,
		group=group,
		dataChannel=dataChannel,
		team_id=teamID,
		user_id=userID,
		userTunes=json.dumps(userTunes),
		parameters=json.dumps(mergedParameters),
		events=0,
		)

	# Save and return
	job.save()
	return Job(job)

def getJob( job_id ):
	"""
	This function will lookup the job store and return a Job instance 
	only if the given job exists.
	"""

	# Missing ID, return none
	if not job_id:
		return None

	# Lookup job by it's ID
	try:
		jobInst = JobQueue.get( JobQueue.id == int(job_id) )
	except JobQueue.DoesNotExist:
		# Not exists, return None
		return None
	except ValueError:
		# Invalid integer, return None
		return None

	# Job exists, return instance
	return Job(jobInst)

def hasJob( job_id ):
	"""
	Return TRUE if a job with this ID exists in the store
	"""

	# Missing ID, return false
	if not job_id:
		return False

	# Return true if exists
	try:
		return JobQueue.select().where(JobQueue.id == int(job_id)).exists()
	except ValueError:
		# Invalid integer, return False
		return False

