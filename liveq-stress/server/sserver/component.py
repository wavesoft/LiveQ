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
import random
import uuid
import time

from sserver.config import Config

from liveq.component import Component
from liveq.io.bus import BusChannelException
from liveq.models import Tunables, Observables, Lab
from liveq.data.histo.intermediate import IntermediateHistogramCollection
from liveq.data.tune import Tune

class StressJobListener:

	def onJobCreated(self, job):
		pass

	def onJobDestroyed(self, job):
		pass

	def onJobStatusChanged(self, job, status_id):
		pass

	def onJobProgressChanged(self, job, value):
		pass

class LogStressJobListener(StressJobListener):

	def __init__(self):
		self.logger = logging.getLogger("job-status")

	def onJobCreated(self, job):
		self.logger.info("[%s]: Created" % job.id)

	def onJobDestroyed(self, job):
		self.logger.info("[%s]: Destroyed" % job.id)

	def onJobStatusChanged(self, job, status, verboseMsg):
		self.logger.info("[%s]: %s (%s)" % (job.id, status, verboseMsg))

	def onJobProgressChanged(self, job, value):
		self.logger.info("[%s]: %0.2f%% " % (job.id, value*100))


class StressJob:

	counter = 0

	def __init__(self, jobTracker, tunables):

		# General configuration
		self.tracker = jobTracker
		self.lab = jobTracker.lab
		self.jobChannel = jobTracker.jobChannel
		self.tunables = tunables

		# Open Data channel
		self.dataChannel = Config.IBUS.openChannel("data-%s" % uuid.uuid4().hex, serve=True)

		# Job-specific information
		self.jid = None
		self.id = 'job-%i' % StressJob.counter
		StressJob.counter += 1

		# Bind events
		self.dataChannel.on('job_data', self.onBusData)
		self.dataChannel.on('job_status', self.onBusStatus)
		self.dataChannel.on('job_completed', self.onBusCompleted)

	def submit(self):

		# Ask job manager to schedule a new job
		ans = self.jobChannel.send('job_start', {
			'lab': self.lab.uuid,
			'group': 'global',
			'dataChannel': self.dataChannel.name,
			'parameters': self.tunables
		}, waitReply=True, timeout=30)

		# Check for I/O failure on the bus
		if not ans:
			# Fire listeners
			for l in self.tracker.jobListeners:
				l.onJobStatusChanged(self, 'error', "Unable to contact the job manager")
			return False

		# Check for error response
		if ans['result'] == 'error':
			# Fire listeners
			for l in self.tracker.jobListeners:
				l.onJobStatusChanged(self, 'error', "Unable to place a job request: %s" % ans['error'])
			return False

		# Update job id
		self.jid = ans['jid']

		# Fire listeners
		for l in self.tracker.jobListeners:
			l.onJobStatusChanged(self, 'scheduled', "Job request scheduled")

		# Result is OK
		return True

	def onBusData(self, data):
		"""
		[Bus Event] Data available
		"""
		self.tracker.jobData(self, data)

	def onBusCompleted(self, data):
		"""
		[Bus Event] Simulation completed
		"""
		self.tracker.jobCompleted(self, data)

	def onBusStatus(self, data):
		"""
		[Bus Status] Forward bus message 
		"""
		self.tracker.jobStatus(self, data)


class StressJobTracker:

	def __init__(self, lab, jobChannel):
		self.lab = lab

		self.jobChannel = jobChannel
		self.jobListeners = []
		self.jobTable = {}

	def addJobListener(self, listener):
		self.jobListeners.append(listener)

	def create(self):

		# Generate random tunable values
		tunables = {}
		for t in self.lab.getTunables():
			tunables[t.name] = (random.random() * (t.max - t.min)) + t.min

		# Create a new stress-test job
		job = StressJob(self, tunables)

		# Store on list
		self.jobTable[job] = {
			'status': 0,
			'percent': 0
		}

		# Fire listeners
		for l in self.jobListeners:
			l.onJobCreated(job)

		# Return job instance
		return job


	def jobData(self, job, data):
		"""
		Dat arrived from a running job
		"""

		# Get job status table
		if not job in self.jobTable:
			return

		# Validate
		if not 'data' in data:
			# Fire listeners
			for l in self.jobListeners:
				l.onJobStatusChanged(job, 'bug', "Missing 'data' parameter on job result")
			return

		# Create a histogram collection from the data buffer
		histos = IntermediateHistogramCollection.fromPack( data['data'] )

		# Make sure that we have all the histograms we need
		currentEvents = None
		for h in self.lab.getHistograms():
			if not h in histos:
				for l in self.jobListeners:
					l.onJobStatusChanged(job, 'bug', "Missing histogram '%s' from response" % h)
			else:
				if currentEvents == None:
					currentEvents = histos[h].nevts
				else:
					if histos[h].nevts != currentEvents:
						for l in self.jobListeners:
							l.onJobStatusChanged(job, 'bug', "Event number inconsistency on histogram '%s'" % h)

		# Extract useful information
		params = self.lab.getParameters()
		expectedEvents = params['events']

		# Update progress & check overflows
		if currentEvents > expectedEvents:
			for l in self.jobListeners:
				l.onJobStatusChanged(job, 'bug', "Event number overflow")
		for l in self.jobListeners:
			l.onJobProgressChanged(job, float(currentEvents) / expectedEvents )

	def jobCompleted(self, job, data):
		"""
		A pending job completed
		"""

		# Get job status table
		if not job in self.jobTable:
			return

		# Fire listeners
		for l in self.jobListeners:
			l.onJobStatusChanged(job, 'completed', "Job completed")

	def jobStatus(self, job, data):
		"""
		Job status updated
		"""
		pass

class StressServerComponent(Component):
	"""
	Core jobmanager
	"""

	def __init__(self):
		"""
		Setup job manager
		"""
		Component.__init__(self)

		# Setup logger
		self.logger = logging.getLogger("stress-test")
		self.logger.info("StressTest component initialized")

		# Try to find a lab with the given ID
		self.lab = self.createStressLab(Config.LAB_ID)

		# Open the job channel
		self.jobChannel = Config.IBUS.openChannel("jobs")

		# Prepare job tracker
		self.feedback = LogStressJobListener()
		self.tracker = StressJobTracker(self.lab, self.jobChannel)
		self.tracker.addJobListener(self.feedback)

	def dropStressLab(self, labID):
		"""
		Drop the given lab and any custom stress-test variables created for it
		"""
		pass

	def createStressLab(self, labID, numParams=15, numHistograms=100):
		"""
		Configure the specified lab in order to match the given parameters required for stress-testing
		"""

		# Set-up the lab
		self.logger.info("Using lab %s for stress-testing" % labID)

		# Get/Create lab
		lab = None
		try:
			lab = Lab.get(Lab.uuid == labID)
		except Lab.DoesNotExist:
			lab = Lab.create(uuid=labID)

		# Make sure that we have the given range of parameters
		tunables = []
		for i in range(1, numParams+1):
			try:
				parm = Tunables.get(Tunables.name == "DummyParm:%i" % i)
			except Tunables.DoesNotExist:
				parm = Tunables.create(name="DummyParm:%i" % i, sort="[%i]" % i, title="Dummy Parameter #%i" % i)
				parm.save()
			tunables.append("DummyParm:%i" % i)

		# Make sure that we have the given range of histograms
		histos = []
		for i in range(1, numHistograms+1):
			try:
				obs = Observables.get(Observables.name == "DummyHisto:%i" % i)
			except Observables.DoesNotExist:
				obs = Observables.create(name="DummyHisto:%i" % i, sort="[%i]" % i, title="Dummy Histogram #%i" % i)
				obs.save()
			histos.append("DummyHisto:%i" % i)

		# Make sure the given lab has the appropriate paramters
		lab.setTunableNames( tunables )
		lab.setHistograms( histos )
		lab.name = "Stress-Test Lab"

		# Set dummy config
		lab.setParameters({ 
			"beam" : "ee",
			"energy" : 91.2,
			"events" : 100000,
			"generator" : "pythia8",
			"params" : "-",
			"process" : "zhad",
			"seed" : 123123,
			"specific" : "-",
			"version" : "8175"
			})

		# Set the source of the dummy job
		lab.repoTag = ""
		lab.repoURL = ""
		lab.repoType = "dummy"
		lab.save()
		return lab

	def run(self):
		"""
		Entry point
		"""

		time.sleep(5)

		# Submit a job
		for i in range(0,100):
			self.startJob()

		# Run superfunction
		Component.run(self)

	def startJob(self):
		"""
		Submit a stress job to the server
		"""

		# Create a new stress job instance
		job = self.tracker.create()

		# Submit and return
		job.submit()
		return job
