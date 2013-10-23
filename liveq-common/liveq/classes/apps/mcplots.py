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

import glob
import tempfile
import time
import copy
import os, signal
import shlex, subprocess, threading

from liveq.io.application import *
from liveq.utils.FLAT import FLATParser
from liveq.utils.hugedata import Hugedata

from liveq.events import GlobalEvents
from liveq.config.classes import AppConfigClass
from liveq.exceptions import JobConfigException, JobInternalException, JobRuntimeException, IntegrityException

"""
Configuration implementation
"""
class Config(AppConfigClass):

	def __init__(self,config):
		self.WORKDIR = config["work_dir"]
		self.EXEC = config["exec"]
		self.TUNE = config["tune"]
		self.UPDATE_INTERVAL = int(config["update_interval"])

		# Validate parameters
		if len(self.WORKDIR) == 0:
			raise ConfigException("Invalid work dir in the application configuration")
		if not os.path.isdir(self.WORKDIR):
			raise ConfigException("Non-existing work dir specified in the application configuration")

	def instance(self, runtimeConfig):
		return MCPlots(self)

"""
MCPlots implementation of the JobApplication
"""
class MCPlots(JobApplication):

	"""
	Initialize JobApplication
	"""
	def __init__(self, config):
		JobApplication.__init__(self, config)
		self.config = config 
		self.jobconfig = { }
		self.tunename = ""
		self.tunefile = ""
		self.monitorThread = None
		self.state = STATE_ABORTED

	##################################################################################
	###
	### JobApplication Implementation
	###
	##################################################################################

	"""
	Create a process
	"""
	def start(self):

		# If it's already running, raise an exception
		# (The caller might meant to reload() instead of start())
		if self.state == STATE_RUNNING:
			raise JobInternalException("Calling start() on a job that is already running")

		# Check for race condition errors
		if self.state == STATE_STARTING:
			raise IntegrityException("Race condition detected")
		self.state = STATE_STARTING

		# Create a new temporary directory for the job data
		self.jobdir = tempfile.mkdtemp()
		if not self.jobdir:
			raise JobRuntimeException("Unable to create temporary directory")

		# Prepare macros for the cmdline
		rundict = copy.deepcopy(self.jobconfig)
		rundict["tune"] = self.config.TUNE
		rundict["jobdir"] = self.jobdir

		# Prepare cmdline arguments
		args = shlex.split( self.config.EXEC % rundict)
		self.logger.debug("Starting mcplots process '%s'" % args)

		# Launch process in it's own process group
		self.process = subprocess.Popen(args, cwd=self.config.WORKDIR, preexec_fn=os.setpgrp)
		self.logger.debug("Process started with PID=%i" % self.process.pid)

		# Start a monitor thread
		self.monitorThread = threading.Thread(target=self.monitor)
		self.monitorThread.start()

		# Let listeners know of the event
		self.dispatchEvent("job_started")

		self.state = STATE_RUNNING

	"""
	Kill a running thread
	"""
	def kill(self):

		# If it's already stopped, silently exit
		if (self.state == STATE_ABORTED) or (self.state == STATE_COMPLETED):
			return

		# Check for race condition errors
		if self.state == STATE_KILLING:
			raise IntegrityException("Race condition detected")
		self.state = STATE_KILLING

		# Get process group
		gid = os.getpgid(self.process.pid)

		# Kill the enitre process group
		self.logger.debug("Killing mcplots process with PID=%i, GID=%i" % (self.process.pid, gid))
		os.killpg( gid, signal.SIGTERM )

		# Cleanup job
		self.cleanup()

		# Wait for monitor thread to complete
		self.monitorThread.join()

		# Dispatch the event to the listeners
		self.dispatchEvent("job_aborted", -1)

		# We are now officially killed
		self.state = STATE_ABORTED

	"""
	MCPlots generators do not provide reload functionality.
	Use the classic kill/start approach
	"""
	def reload(self):
		self.kill()
		self.start()
	
	"""
	Update instance configuration
	"""
	def setConfig(self,config):

		# Store and validate job config
		self.jobconfig = config
		for cparm in ("beam","process","energy","params","specific","generator","version","tune","events","seed"):
			if not cparm in config:
				raise JobConfigException("Parameter '%s' is missing from the job config" % cparm)
		if type(config["tune"]) != dict:
			raise JobConfigException("Parameter 'tune' has an incompatible format")

		# Find tune filename
		self.tunefile = "%s/configuration/%s-%s.tune" % ( self.config.WORKDIR, config['generator'], self.config.TUNE  )

		# Update tune file
		self.logger.debug("Updating tune file '%s'" % self.tunefile)
		try:
			with open(self.tunefile, 'w') as f:
				for key, value in config['tune'].iteritems():
					f.write("%s = %s\n" % (key, value))
		except IOError as e:
			raise JobConfigException("Unable to open tune file (%s) for writing: %s" % (self.tunefile, str(e)))

	##################################################################################
	###
	### Internal functions
	###
	##################################################################################

	"""
	Helper to cleanup current job files
	"""
	def cleanup(self):

		# Clean temp dir (with caution)
		if len(self.config.WORKDIR) > 1:
			self.logger.debug("Cleaning-up temp directory %s/tmp" % self.config.WORKDIR)
			os.system("rm -rf '%s/tmp'" % self.config.WORKDIR)

		# Clean job dir (with caution)
		if len(self.jobdir) > 1:
			self.logger.debug("Cleaning-up job directory %s" % self.jobdir)
			os.system("rm -rf '%s'" % self.jobdir)

	"""
	Helper function to read the histograms from the dump folder
	"""
	def readIntermediateHistograms(self):

		# Collective results
		histograms = { }

		# Find histograms in the dump directory of the job
		for histogram in glob.glob("%s/dump/*.dat" % self.jobdir):
			self.logger.debug("Loading flat file %s" % histogram)

			# Read histogram data
			histo = FLATParser.parse( histogram )
			if not 'METADATA' in histo:
				self.logger.warn("Missing METADATA section in FLAT file %s" % histogram)
				continue
			if not 'HISTOGRAM' in histo:
				self.logger.warn("Missing METADATA section in FLAT file %s" % histogram)
				continue
			if not 'HISTOSTATS' in histo:
				self.logger.warn("Missing METADATA section in FLAT file %s" % histogram)
				continue

			# Prepare data to store on the collective dict
			meta = histo['METADATA']['d']
			if not meta:
				self.logger.warn("Missing METADATA dict in file %s" % histogram)
				continue
			h_data = histo['HISTOGRAM']['v']
			if not h_data:
				self.logger.warn("Missing HISTOGRAM values in file %s" % histogram)
				continue
			h_stat = histo['HISTOSTATS']['v']
			if not h_stat:
				self.logger.warn("Missing HISTOSTATS values in file %s" % histogram)
				continue
			h_name = histo['HISTOGRAM']['d']['AidaPath']
			if not h_stat:
				self.logger.warn("Missing AidaPath in HISTOGRAM section in file %s" % histogram)
				continue

			# Store entry on the collective histograms
			histograms[h_name] = {
				'meta': dict((k, meta[k]) for k in ('crosssection',)),
				'histo': h_data,
				'stats': h_stat
			}

		# Return the collective results
		return histograms


	"""
	Helper function to collect and submit the real (not intermediate) output
	"""
	def collectAndSubmitOutput(self):
		pass

	"""
	Application monitor [Thread]
	"""
	def monitor(self):
		self.logger.debug("Started monitor thread")

		# Reset variables
		runtime = 0

		# Wait until the process changes state
		while True:
			res = self.process.poll()

			# Check if the process changed state
			if res != None:

				# Check if such an action is expected
				if self.state == STATE_KILLING:
					self.logger.debug("EXPECTED Process state changed to %i" % res)

					# The exit was caused by the kill() function
					# It will take care of notifying the listeners for the action taken

				else:
					self.logger.debug("UNEXPECTED Process state changed to %i" % res)

					# Check the cause of the termination
					if res == 0:

						# Everything was OK
						self.state = STATE_COMPLETED

						# Collect and submit job output
						self.collectAndSubmitOutput()

						# Job is completed, do cleanup
						self.cleanup()

						# Dispatch the event to the listeners
						self.dispatchEvent("job_completed")

					else:

						# An error occured
						self.state = STATE_ABORTED

						# Job is completed, do cleanup
						self.cleanup()

						# Dispatch the event to the listeners
						self.dispatchEvent("job_aborted", res)

				# In any of these cases, exit the loop
				break

			# When it's time to send updates, read the histograms
			# and dispatch the update event to the targets
			if not runtime % self.config.UPDATE_INTERVAL:

				# Fetch itermediate results from the job
				results = self.readIntermediateHistograms()

				# Let listeners know we have intermediate data available
				if results:
					self.dispatchEvent("job_data", False, Hugedata.jsCompress(results))

			# Runtime clock and CPU anti-hoging
			time.sleep(1)
			runtime += 1

		self.logger.debug("Exiting monitor thread")
