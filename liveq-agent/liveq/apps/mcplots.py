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
import copy
import os, signal
import shlex, subprocess, threading

from multiprocessing import Process
from liveq.internal.application import JobApplication
from liveq.internal.exceptions import JobConfigException, JobInternalException, IntegrityException
from liveq.config import AppConfig

"""
Configuration implementation
"""
class Config(AppConfig):

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

	def instance(self,userconfig):
		return MCPlots(self, userconfig)

"""
MCPlots implementation of the parametric job
"""
class MCPlots(JobApplication):

	STOPPED = 0
	KILLING = 1
	KILLED = 2
	STARTING = 3
	STARTED = 4
	COMPLETED = 5

	"""
	Initialize JobApplication
	"""
	def __init__(self, config, userconfig):
		JobApplication.__init__(self, config)
		self.config = config 
		self.jobconfig = { }
		self.tunename = ""
		self.tunefile = ""
		self.monitorThread = None
		self.state = MCPlots.STOPPED

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
				if self.state == MCPlots.KILLING:
					self.logger.debug("EXPECTED Process state changed to %i" % res)

					# The exit was caused by the kill() function
					# It will take care of notifying the listeners for the action taken

				else:
					self.logger.debug("UNEXPECTED Process state changed to %i" % res)

					# Check the cause of the termination
					if res == 0:

						# Everything was OK
						self.state = MCPlots.COMPLETED

						# Dispatch the event to the listeners
						self.dispatchEvent("job_completed")

					else:

						# An error occured
						self.state = MCPlots.STOPPED

						# Dispatch the event to the listeners
						self.dispatchEvent("job_aborted", res)


				# Exit the main loop
				break

			# When it's time to send updates, do it
			if not runtime % self.config.UPDATE_INTERVAL:
				# Dispatch the event to the listeners
				self.dispatchEvent("job_data", { })

			# Runtime clock and CPU anti-hoging
			time.sleep(1)
			runtime += 1

		self.logger.debug("Exiting monitor thread")


	"""
	Create a process
	"""
	def start(self):

		# If it's already running, raise an exception
		# (The caller might meant to reload() instead of start())
		if self.state == MCPlots.STARTING:
			raise JobInternalException("Calling start() on a job that is already running")

		# Check for race condition errors
		if self.state == MCPlots.STARTING:
			raise IntegrityException("Race condition detected")
		self.state = MCPlots.STARTING

		# Prepare macros for the cmdline
		rundict = copy.deepcopy(self.jobconfig)
		rundict["tune"] = self.config.TUNE

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

		self.state = MCPlots.STARTED

	"""
	Kill a running thread
	"""
	def kill(self):

		# If it's already stopped, silently exit
		if self.state == MCPlots.STOPPED:
			return

		# Check for race condition errors
		if self.state == MCPlots.KILLING:
			raise IntegrityException("Race condition detected")
		self.state = MCPlots.KILLING

		# Get process group
		gid = os.getpgid(self.process.pid)

		# Kill the enitre process group
		self.logger.debug("Killing mcplots process with PID=%i, GID=%i" % (self.process.pid, gid))
		os.killpg( gid, signal.SIGTERM )

		# Clean temp dir (with caution)
		if len(self.config.WORKDIR) > 1:
			self.logger.debug("Cleaning-up temp directory %s/tmp" % self.config.WORKDIR)
			os.system("rm -rf %s/tmp" % self.config.WORKDIR)

		# Wait for monitor thread to complete
		self.monitorThread.join()

		# Dispatch the event to the listeners
		self.dispatchEvent("job_aborted", -1)

		# We are now officially killed
		self.state = MCPlots.KILLED

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
