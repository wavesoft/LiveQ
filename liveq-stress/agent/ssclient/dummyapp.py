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

"""
Dummy Application

This class provides an app for stress-testing.
"""

import time
import random
import numpy as np
import math
import threading

from liveq.io.application import *
from liveq.events import GlobalEvents
from liveq.config.classes import AppConfigClass
from liveq.exceptions import JobConfigException, JobInternalException, JobRuntimeException, IntegrityException, ConfigException
from liveq.reporting.postmortem import PostMortem

from liveq.data.histo.intermediate import IntermediateHistogram,IntermediateHistogramCollection
from liveq.data.histo.sum import intermediateMerge

class Config(AppConfigClass):
	"""
	Configuration implementation
	"""

	def __init__(self,config):
		self.UPDATE_INTERVAL = int(config["update_interval"])

	def instance(self, runtimeConfig):
		return DummyApp(self)

class HistogramGenerator:

	def __init__(self, name, m=0, s=0.2, bins=20, xmin=0.0, xmax=10.0, seed=None):
		"""
		Initialize random histogram
		"""
		# Initialize properties
		self.name = name
		self.s = s
		self.m = m
		self.xmin = xmin
		self.xmax = xmax
		self.bins = bins
		self.seed = seed
		self.nevts = 0

		# Generate random seed if missing
		if self.seed == None:
			self.seed = random.random() * 0xffffffff

		# Populate xlow,xhigh,xfocus
		binedges = np.concatenate([ np.arange(xmin, xmax, float(xmax-xmin)/float(bins)), [xmax] ])
		self.xlow = binedges[0:bins]
		self.xhigh = binedges[1:bins+1]
		self.xfocus = ((self.xhigh - self.xlow)/2.0) + self.xlow

		# Find maximum probability value
		self.propabMax = 0
		for i in np.arange(-1,1,0.01):
			v = self.propabFn(i)
			if v > self.propabMax:
				self.propabMax = v

		# Initialize histogram data
		self.bvalues = np.zeros(bins)
		self.entries = np.zeros(bins)
		self.sumw = np.zeros(bins)
		self.sumxw = np.zeros(bins)
		self.sumx2w = np.zeros(bins)
		self.sumw2 = np.zeros(bins)

		# Iteration index
		self.iter = 0

	def propabFn(self, x):
		"""
		Propability function (in this case gaussian)
		"""
		# Gaussian function to use for tweaking
		# the random number generator
		a = 1/(self.s*math.sqrt(2*math.pi))
		b = self.m; c = self.s; d = 0
		return a*math.exp(-(pow(x-b,2)/(2*pow(c,2))))+d

	def addSamples(self, numSamples=1000, weight=1.0):
		"""
		Add that number of samples in the bins
		"""

		# Seed engine
		random.seed( self.seed + self.iter )
		self.iter += 1

		# Increment total number of samples
		self.nevts += numSamples

		# Populate bins with samples
		for i in range(0,numSamples):

			# Get a random X point and the probability
			# of a dataset to appear there
			x = (random.random()*2) - 1.0
			y = self.propabFn(x) / self.propabMax

			# Map x value to the appropriate bin index
			j = int( ((x+1)/2) * self.bins )

			# Put sample on bin
			if random.random() < y:
				self.bvalues[j] += 1
				self.entries[j] += 1
				self.sumw[j] += weight
				self.sumxw[j] += x*weight
				self.sumx2w[j] += x*x*weight
				self.sumw2[j] += weight*weight

	def asIntermediate(self, normalize=False):
		"""
		Return current data as intermediate histogram
		"""

		# Extract parts and build histogram
		return IntermediateHistogram(
				name=self.name,
				bins=self.bins,
				meta={
					'nevts': self.nevts,
					'crosssection': 1.0
				},
				xlow=self.xlow,
				xfocus=self.xfocus,
				xhigh=self.xhigh,
				Entries=self.entries,
				SumW=self.sumw,
				SumW2=self.sumw2,
				SumXW=self.sumxw,
				SumX2W=self.sumx2w
			)


class DummyApp(JobApplication):
	"""
	A dummy job implementation
	"""

	def __init__(self, config):
		"""
		Constructor
		"""
		JobApplication.__init__(self, config)

		self.thread = None
		self.running = False
		self.numEvents = 0

		self.delay = 4

	def start(self):
		"""
		Launch application binaries
		"""

		# Kill previous instance
		self.kill()
		
		# Start thread
		self.logger.info("Starting new generator thread")
		self.running = True
		self.thread = threading.Thread(target=self.threadMain)
		self.thread.start()

	def kill(self):
		"""
		Kill all instances
		"""

		# Stop previous thread
		if self.running:
			self.logger.info("Stopping previous instance")
			self.running = False
			self.thread.join()
			self.logger.info("Interrupted")

	def reload(self):
		"""
		Reload configuration (this might mean restarting the simulation)
		"""

		# Restart
		self.kill()
		self.start()

	def setConfig(self,config):
		"""
		Set/Update configuration files
		"""

		# Store and validate job config
		self.jobconfig = config
		for cparm in ("version", "tune","histograms"):
			if not cparm in config:
				raise JobConfigException("Parameter '%s' is missing from the job config" % cparm)
		if type(config["tune"]) != dict:
			raise JobConfigException("Parameter 'tune' has an incompatible format")
		if type(config["histograms"]) != list:
			raise JobConfigException("Parameter 'histograms' has an incompatible format")


		# Seed using version
		random.seed( int(config["version"]) )

		# Get tune keys
		parmNames = config["tune"].keys()

		# Set number of events to generate
		self.numEvents = config["events"]

		# Create histograms
		i = 0
		self.histoGens = []
		for k in config["histograms"]:

			# Induce randomness on event generator
			km = parmNames[ int(random.random()*len(parmNames)) ]
			ks = parmNames[ int(random.random()*len(parmNames)) ]
			bins = int(random.random()*90) + 10
			seed = int(random.random()*0xffffffff)

			# Get values
			m = float(config["tune"][km]) * 2.0 - 1.0
			s = float(config["tune"][ks])

			# Store histogram generator
			self.logger.info("Creating generator for histogram '%s'" % k)
			self.histoGens.append(HistogramGenerator(k, m=m, s=s, bins=bins, seed=seed))

		self.logger.info("Configuration updated for %i events" % self.numEvents)

	def threadMain(self):

		# Get number of events to produce
		eventsLeft = self.numEvents

		while self.running and (eventsLeft > 0):

			# Create that many events
			genEvents = min(eventsLeft, 1000)
			self.logger.info("Adding %i more samples (%i left)" % (genEvents, eventsLeft))
			for h in self.histoGens:
				h.addSamples( numSamples=genEvents )
			eventsLeft -= genEvents

			# Forward event information
			payload = self.getData(state=1)
			self.logger.info("Sending intermediate data (%0.2f Kb)" % (len(payload)/1024))
			self.trigger("job_data", False, payload)

			# Wait a second
			waitTime = time.time() + self.delay
			while self.running and (time.time() > waitTime):
				time.sleep(0.05)

		# Send final results
		payload = self.getData(state=2)
		self.logger.info("Sending final data (%0.2f Kb)" % (len(payload)/1024))
		self.trigger("job_data", True, payload)

		# We are not running any more
		self.logger.info("Simulation completed")
		self.running = False
		self.trigger("job_completed")		

	def doPhysics(self):
		# Collect some samples
		for h in self.histoGens:
			h.addSamples(1000)

	def getData(self, state=1):

		# Prepare collection
		ans = IntermediateHistogramCollection()

		# Populate results
		for h in self.histoGens:
			ans[h.name] = h.asIntermediate()

		# Store state
		ans.state = state

		# Return collection
		return ans.pack()

	def sendIntermediate(self):
		"""
		"""
		self.trigger("job_data", False, results)

	def sendFeedback(self):
		"""
		Send dummy feedback
		"""
		self.trigger("job_completed")
		self.trigger("job_data", False, results)
		self.trigger("job_aborted", res, self.postmortem)

