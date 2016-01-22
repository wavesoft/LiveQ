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
MCPlots Application

This class provides the application implementation required by the MCplots' 
Virtual Atom Smasher game. 

This application starts an MCPlots simulation based on the lab configuration and
tune values specified by the user and sends in real-time histograms to the user.
"""

import os
import glob
import tempfile
import time
import copy
import hashlib
import random
import datetime
import os, signal
import shlex, subprocess, threading

from liveq.io.application import *
from liveq.utils.FLAT import FLATParser
from liveq.events import GlobalEvents
from liveq.config.classes import AppConfigClass
from liveq.exceptions import JobConfigException, JobInternalException, JobRuntimeException, IntegrityException, ConfigException
from liveq.reporting.postmortem import PostMortem

from liveq.data.histo.intermediate import IntermediateHistogramCollection

def run_and_get(args):
	"""
	Run cmdline and return STDOUT
	"""
	output = ""

	# Open process
	proc = subprocess.Popen(args, stdout=subprocess.PIPE)
	# Read output
	output = proc.stdout.read()
	# Wait
	proc.wait()

	# Return output
	return output

class Config(AppConfigClass):
	"""
	Configuration implementation
	"""

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

class MCPlots(JobApplication):
	"""
	MCPlots implementation of the JobApplication
	"""

	def __init__(self, config):
		"""
		Initialize JobApplication
		"""

		JobApplication.__init__(self, config)
		self.config = config 
		self.jobconfig = { }
		self.softwareDir = config.WORKDIR
		self.tunename = ""
		self.tunefile = ""
		self.monitorThread = None
		self.trackingFile = None
		self.trackingTime = 0
		self.lastState = ""
		self.state = STATE_ABORTED

	##################################################################################
	###
	### JobApplication Implementation
	###
	##################################################################################

	def start(self):
		"""
		Create a process
		"""

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

		# Create a new temporary directory for the job output
		self.datdir = tempfile.mkdtemp()
		if not self.datdir:
			raise JobRuntimeException("Unable to create data directory")

		# Reset last state
		self.lastState = ""

		# Prepare post-mortem for the mcplots app
		self.postmortem = PostMortem()

		# Prepare macros for the cmdline
		rundict = copy.deepcopy(self.jobconfig)
		rundict["tune"] = self.config.TUNE

		# Prepare cmdline arguments
		cmdline = self.config.EXEC % rundict
		args = shlex.split( str(self.config.EXEC % rundict) )
		self.logger.debug("Starting mcplots process '%s'" % args)

		# Prepare environment
		envDict = dict(os.environ)
		envDict['LIVEQ_JOBDIR'] = self.jobdir
		envDict['LIVEQ_DATDIR'] = self.datdir
		envDict['LIVEQ_TUNE'] = self.tunefile

		# Launch process in it's own process group
		self.process = subprocess.Popen(args, cwd=self.softwareDir, preexec_fn=os.setpgrp, env=envDict, stderr=subprocess.PIPE, stdout=subprocess.PIPE)
		self.logger.debug("Process started with PID=%i" % self.process.pid)

		# Include details in the postmortem
		self.postmortem.addInfo("env", envDict, "Process")
		self.postmortem.addInfo("cwd", self.softwareDir, "Process")
		self.postmortem.addInfo("tune", self.jobconfig['tune'], "Process")
		self.postmortem.addInfo("histograms", self.jobconfig['histograms'], "Process")
		self.postmortem.addInfo("revision", self.jobconfig['repoTag'], "Process")

		# Include machine details in postmortem
		self.postmortem.addInfo("memory", run_and_get(['free','-m']), "Machine")
		self.postmortem.addInfo("disk", run_and_get(['df','-h']), "Machine")
		self.postmortem.addInfo("uptime", run_and_get(['uptime']), "Machine")

		self.postmortem.addProcess(" ".join(args), self.process, stderr=True, stdout=True)
		self.logger.debug("Post-mortem for the process started")

		# Start a monitor thread
		self.monitorThread = threading.Thread(target=self.monitor)
		self.monitorThread.start()

		# Let listeners know of the event
		self.trigger("job_started")

		self.state = STATE_RUNNING

	def kill(self):
		"""
		Kill a running thread
		"""

		# If it's already stopped, silently exit
		if (self.state == STATE_ABORTED) or (self.state == STATE_COMPLETED):
			return

		# Check for race condition errors
		if self.state == STATE_KILLING:
			raise IntegrityException("Race condition detected")
		self.state = STATE_KILLING

		# Complete post-mortem
		self.logger.info("Simulation aborted")
		self.postmortem.log("Killed upon user request")
		self.postmortem.complete()

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
		self.trigger("job_aborted", -1, self.postmortem)

		# We are now officially killed
		self.state = STATE_ABORTED

	def reload(self):
		"""
		MCPlots generators do not provide reload functionality.
		Use the classic kill/start approach
		"""
		self.kill()
		self.start()
	
	def setConfig(self,config):
		"""
		Update instance configuration
		"""

		# Store and validate job config
		self.jobconfig = config
		for cparm in ("beam","process","energy","params","specific","generator","version","tune","events","seed","repoType",
						"repoTag","repoURL","histograms"):
			if not cparm in config:
				raise JobConfigException("Parameter '%s' is missing from the job config" % cparm)
		if type(config["tune"]) != dict:
			raise JobConfigException("Parameter 'tune' has an incompatible format")
		if type(config["histograms"]) != list:
			raise JobConfigException("Parameter 'histograms' has an incompatible format")
		if not config['repoType'] in ( 'svn', 'git', 'cvmfs' ):
			raise JobInternalException("Unknown repository type '%s'" % config['repoType'])

		# Calculate a unique ID for the software to use
		swRepoID = "%s-%s" % (
			config['repoType'], 
			hashlib.sha256("%s:%s" % (config['repoURL'], config['repoTag'])).hexdigest() 
			)

		# Find the directory were to deploy the software
		swDir = os.path.join( self.config.WORKDIR, "sw", swRepoID )
		if config['repoType'] == "cvmfs":
			swDir = config['repoURL']
			if config['repoTag']:
				swDir += "/%s" % config['repoTag']

		# Check if the software directory is not properly populated
		if not os.path.isfile( "%s/ready.flag" % swDir ):
			os.system("rm -rf '%s'" % swDir)

		# Create/Check-out the appropriate software
		if not os.path.isdir( swDir ):

			# Make directory
			os.makedirs(swDir)

			# Build command-line based on repository type
			args = [ ]
			if self.jobconfig['repoType'] == 'svn':

				# Run SVN Export
				args = [ "svn", "export", "--force", "-r", self.jobconfig['repoTag'], self.jobconfig['repoURL'],'.' ]
				p = subprocess.Popen(args, cwd=swDir)
				p.wait()

				# Check for success
				if p.returncode != 0:
					raise JobRuntimeException("Unable to export SVN tag %s from %s" % (self.jobconfig['repoTag'], self.jobconfig['repoURL']))

				# Checkout was successful, create ready.flag
				with open("%s/ready.flag" % swDir, "w") as f:
					pass

			elif self.jobconfig['repoType'] == 'git':

				# Run GIT clone
				args = [ "git", "clone", self.jobconfig['repoURL'], '.' ]
				p = subprocess.Popen(args, cwd=swDir)
				p.wait()

				# Check for success
				if p.returncode != 0:
					raise JobRuntimeException("Unable to clone GIT repository %s" % self.jobconfig['repoURL'])

				# Run GIT checkout
				args = [ "git", "checkout", self.jobconfig['repoTag'] ]
				p = subprocess.Popen(args, cwd=swDir)
				p.wait()

				# Check for success
				if p.returncode != 0:
					raise JobRuntimeException("Unable to clone GIT repository %s" % self.jobconfig['repoURL'])

				# Checkout was successful, create ready.flag
				with open("%s/ready.flag" % swDir, "w") as f:
					pass

		# Update software dir
		self.softwareDir = swDir

		# Create a new tune file
		if self.tunefile:
			os.unlink(self.tunefile)
		(fid, self.tunefile) = tempfile.mkstemp('%s-%s.tune' % (config['generator'], self.config.TUNE))

		# Update tune file
		self.logger.debug("Updating tune file '%s'" % self.tunefile)
		try:
			for key, value in config['tune'].iteritems():
				os.write(fid, "%s = %s\n" % (key, value))
		except IOError as e:
			raise JobConfigException("Unable to open tune file (%s) for writing: %s" % (self.tunefile, str(e)))
		finally:
			os.close(fid)

	##################################################################################
	###
	### Internal functions
	###
	##################################################################################

	def isDatasetModified(self):
		"""
		Check if the job data files are modified
		"""

		# Get intermediate histograms only when running
		state = self.getState()
		if state != self.lastState:
			self.logger.info("Job state changed to '%s'" % state)

		# Do not continue unless state is 'running'
		if state !=	"running":
			return False

		# Check if we have a valid tracking file
		if (not self.trackingFile) or (not os.path.isfile(self.trackingFile)):

			# Check if we lost job dir
			if not os.path.isdir(self.jobdir):
				self.logger.warn("Missing dump directory - Could not track changes")
				return False

			# List files in the job dir
			files = glob.glob("%s/dump/*.dat" % self.jobdir)

			# Check for empty file list
			if not files:
				self.logger.warn("Empty dump directory - Could not track changes")
				return False

			# Find the file modified the last
			tfFile = ""
			tfTime = 0
			for f in files:
				tf = os.path.getmtime(f)
				if tf > tfTime:
					tfTime = tf
					tfFile = f

			# Remember the name of the tracking file
			self.trackingFile = tfFile
			self.trackingTime = tfTime

			# And yes, we were modified
			return True

		# Check the time the tracking file was modified
		tfTime = os.path.getmtime(self.trackingFile)
		if tfTime > self.trackingTime:

			# Modified
			self.trackingTime = tfTime
			return True

		else:

			# Not modified
			return False


	def cleanup(self):
		"""
		Helper to cleanup current job files
		"""

		# Clean job dir (with caution)
		if len(self.jobdir) > 1:
			self.logger.debug("Cleaning-up job directory %s" % self.jobdir)
			os.system("rm -rf '%s'" % self.jobdir)

		# Clean data dir (with caution)
		if len(self.datdir) > 1:
			self.logger.debug("Cleaning-up data directory %s" % self.datdir)
			os.system("rm -rf '%s'" % self.datdir)

		# Reset the tracking file
		self.trackingFile = None
		self.trackingTime = 0

	def getState(self):
		"""
		Helper function to read the status.flag
		"""

		# Read state flag
		state = "unknown"
		try:
			with file( "%s/status.flag" % self.jobdir, "r" ) as f:
				lines = f.read().splitlines()
				state = lines[0]
		except:
			pass

		return state

	def readIntermediateHistograms(self):
		"""
		Helper function to read the histograms from the dump folder
		"""

		# Collect intermediate data
		ih = IntermediateHistogramCollection.fromDirectory( "%s/dump" % self.jobdir, state=1 )

		# If we are empty, return empty string
		if len(ih) == 0:
			return ""

		# Pack and return the object
		return ih.pack()

	def readFinalHistograms(self):
		"""
		Helper function to collect and return the real (not intermediate) output
		"""

		# Collect intermediate data
		ih = IntermediateHistogramCollection.fromDirectory( self.datdir, recursive=True, state=2 )

		# If we are empty, return empty string
		if len(ih) == 0:
			return ""

		# Pack and return the object
		return ih.pack()

	def monitor(self):
		"""
		Application monitor [Thread]
		"""

		self.logger.debug("Started monitor thread")

		# Reset variables
		run_time = 0

		# Wait until the process changes state
		while True:

			# Check process status
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

					# Complete post-mortem
					self.postmortem.complete()

					# Check the cause of the termination
					if res == 0:

						# Everything was OK
						self.state = STATE_COMPLETED

						# Collect and submit job output
						results = self.readFinalHistograms()
						if results:
							self.trigger("job_data", True, results)

						# Job is completed, do cleanup
						self.cleanup()

						# Dispatch the event to the listeners
						self.trigger("job_completed")

					else:

						# An error occured
						self.state = STATE_ABORTED

						# Job is completed, do cleanup
						self.cleanup()

						# Dispatch the event to the listeners, including the
						# post-mortem report.
						self.trigger("job_aborted", res, self.postmortem)

				# In any of these cases, exit the loop
				break

			# Every time the histogram timestamp is changed, send the updates to the server.
			if ((self.state == STATE_RUNNING) or (self.state == STATE_COMPLETED)) and self.isDatasetModified():

				# Fetch itermediate results from the job and send
				# them to listeners
				results = self.readIntermediateHistograms()
				if results:
					self.trigger("job_data", False, results)

			# Runtime clock and CPU anti-hoging
			time.sleep(1)
			run_time += 1

		self.logger.debug("Exiting monitor thread")
