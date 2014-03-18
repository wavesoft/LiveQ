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

from agent.config import Config
from agent.io.jobmanagers import JobManagers, NoJobManagersError

from liveq.io.bus import BusChannelException
from liveq.component import Component

from liveq.exceptions import JobConfigException, JobInternalException, JobRuntimeException, IntegrityException

class AgentComponent(Component):
	"""
	Core agent
	"""

	# Agent core version
	VERSION = 2

	def __init__(self):
		"""
		Initialize AgentComponent component
		"""
		Component.__init__(self)

		# Setup logger
		self.logger = logging.getLogger("agent")
		self.logger.debug("Agent component started")

		# The slots where job instances are placed
		self.slots = [None] * int(Config.AGENT_SLOTS)
		self.jobIndex = { }
		self.runtimeConfig = { }

		# Create a JobManagers class which is going to take care of
		# the abstraction and the load-balancing of the I/O between
		# the agent and the job managers.
		self.jobmanagers = JobManagers( Config.SERVER_CHANNEL )

		# Bind incoming message handlers
		self.jobmanagers.on('job_start', self.cmdJobStart)
		self.jobmanagers.on('job_cancel', self.cmdJobCancel)

		# Setup tool callbacks for the jobmanagers
		self.jobmanagers.handshakeFn(self.sendHandshake)

	def sendHandshake(self, channel):
		"""
		Send handshake to the first available server channel
		"""
		try:

			# Count what's the slot usage
			free_slots = 0
			for v in self.slots:
				if not v:
					free_slots += 1

			# Send handshake message to the channel specified
			channel.send('handshake', {
				'version': AgentComponent.VERSION,
				'slots': Config.AGENT_SLOTS,
				'free_slots': free_slots,
				'group': Config.AGENT_GROUP
			})

		except BusChannelException as e:

			# There was an error, switch to retry state
			self.logger.warn("Error while sending request: %s" % str(e))

	def _replyError(self, message):
		"""
		Shorthand function to reply with an error message
		"""
		self.logger.warn(message)
		self.jobmanagers.reply({
				'result': 'error',
				'error': message
			})
		return False


	def cmdJobStart(self, message):
		"""
		Bus message arrived to start job
		"""
		jid = None
		config = None

		# Get job ID and job configuration
		try:
			jid = str(message['jid'])
			config = message['config']

		except KeyError as e:
			return self._replyError("Could not find key %s in job_start message" % str(e))

		# Find a free slot and allocate an application
		k = 0
		for v in self.slots:

			# We found a free slot
			if v == None:

				self.logger.debug("Found free slot on #%i" % k)

				# Instantiate a new app
				jobapp = Config.APP_CONFIG.instance(self.runtimeConfig)

				# Save some extra info on the jobapp
				jobapp.slot = k
				jobapp.jobid = jid

				# Reserve slot & store on index
				self.slots[k] = jobapp
				self.jobIndex[jid] = jobapp

				# Bind event handlers
				jobapp.on("job_data", self.onAppJobData, app=jobapp)
				jobapp.on("job_completed", self.onAppJobCompleted, app=jobapp)
				jobapp.on("job_aborted", self.onAppJobAborted, app=jobapp)

				# Start application
				try:

					# Set configuration and start job
					jobapp.setConfig( config )
					jobapp.start()

				except JobConfigException as e:
					self.slots[k] = None
					del self.jobIndex[jid]
					return self._replyError("Configuration error: %s" % str(e))

				except JobInternalException as e:
					self.slots[k] = None
					del self.jobIndex[jid]
					return self._replyError("Internal error: %s" % str(e))

				except JobRuntimeException as e:
					self.slots[k] = None
					del self.jobIndex[jid]
					return self._replyError("Runtime error: %s" % str(e))

				except Exception as e:
					self.logger.error("Unexpected exception %s: %s", (e.__class__.__name__, str(e)))
					self.slots[k] = None
					del self.jobIndex[jid]
					return self._replyError("Unexpected error: %s" % str(e))

				# Done
				self.jobmanagers.reply({
						'result': 'ok'
					})
				return 

			# Go to next key
			k += 1

		# We found no slot
		return self._replyError("No free slots were found")

	def cmdJobCancel(self, message):
		"""
		Bus message arrived to cancel a running job
		"""
		jid = None

		# Get job ID and job configuration
		try:
			jid = str(message['jid'])
		except KeyError as e:
			return self._replyError("Could not find key %s in job_cancel message" % str(e))

		# Check if we don't have such job
		if not jid in self.jobIndex:
			return self._replyError("Could not find any job with id %s" % jid)

		# Fetch job entry
		job = self.jobIndex[jid]

		# Free slot
		self.slots[job.slot] = None
		del self.jobIndex[jid]

		# Kill job
		job.kill()

		# Reply OK
		self.jobmanagers.reply({
				'result': 'ok'
			})

	def onAppJobData(self, final, data, app=None):
		"""
		Callback from the application when the data are available
		"""

		self.logger.info("Sending job data for job %s" % app.jobid)

		# Forward message to the server channel
		self.jobmanagers.send('job_data', {
				'jid': app.jobid,
				'final': final,
				'data': data
			})

	def onAppJobCompleted(self, app=None):
		"""
		Callback from the application when the job is completed successfully
		"""

		# Check if we were already cleaned-up
		if app.jobid in self.jobIndex:

			# Free slots and index entry
			self.slots[app.slot] = None
			del self.jobIndex[app.jobid]

			# Forward the event to the server
			self.jobmanagers.send('job_completed', {
					'jid': app.jobid,
					'result': 0
				})

	def onAppJobAborted(self, res, app=None):

		# Check if we were already cleaned-up
		if app.jobid in self.jobIndex:

			# Free slots and index entry
			self.slots[app.slot] = None
			del self.jobIndex[app.jobid]

			self.jobmanagers.send('job_completed', {
					'jid': app.jobid,
					'result': res
				})


	def step(self):
		"""
		Run the next cycle of the FSM
		"""

		# Run the timeslice of the job managers
		self.jobmanagers.process(0.5)
