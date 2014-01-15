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

from liveq.io.bus import BusChannelException
from liveq.component import Component

from liveq.classes.bus.xmppmsg import XMPPBus
from liveq.utils.fsm import SimpleFSM

from liveq.exceptions import JobConfigException, JobInternalException, JobRuntimeException, IntegrityException

class AgentComponent(Component, SimpleFSM):
	"""
	Core agent
	"""

	# Agent core version
	VERSION = 1

	def __init__(self):
		"""
		Initialize AgentComponent component
		"""
		Component.__init__(self)
		SimpleFSM.__init__(self)

		# Setup logger
		self.logger = logging.getLogger("agent")
		self.logger.debug("Agent component started")

		# Open a communication channel with the server on the external bus
		# (Currently that's the XMPP channel - but we prefer to be abstract)
		self.serverChannel = Config.EBUS.openChannel( Config.SERVER_CHANNEL )

		# The slots where job instances are placed
		self.slots = [None] * int(Config.AGENT_SLOTS)
		self.jobIndex = { }
		self.runtimeConfig = { }

		# TODO: Uhnack this
		# This establishes a presence relationship with the server entity.
		if isinstance(Config.EBUS, XMPPBus):
			self.logger.debug("Subscribing %s to my roster" % Config.SERVER_CHANNEL)
			Config.EBUS.send_presence(pto=Config.SERVER_CHANNEL, ptype='subscribe')

		# Bind incoming message handlers
		self.serverChannel.on('job_start', self.cmdJobStart)
		self.serverChannel.on('job_cancel', self.cmdJobCancel)
		self.serverChannel.on('close', self.onDisconnect)

		# Start with the handshake
		self.schedule(self.stateHandshake)

	def stateHandshake(self):
		"""
		[State] Establish server handshake
		"""
		self.logger.debug("Entering state: HANDSHAKE")
		try:

			# Send handshake message to the bus and retrive
			# initial acknowledgement
			ans = self.serverChannel.send('handshake', {
					'version': AgentComponent.VERSION,
					'slots': Config.AGENT_SLOTS,
					'group': Config.AGENT_GROUP
				}, waitReply=True)

			# Check for errors on handshake
			if ans == None:
				self.logger.warn("No job manager was found online")
				self.schedule(self.stateRetry)
				return

			# Handshake complete
			# (Everything else is asynchronous)
			self.logger.info("Handhake with server completed: %s" % str(ans))

		except BusChannelException as e:

			# There was an error, switch to retry state
			self.schedule(self.stateRetry)
			self.logger.warn("No reply from job manager")

	def stateRetry(self):
		"""
		[State] Retry connection
		"""
		self.logger.debug("Entering state: RETRY")
		
		# Wait some time and re-try handshake
		time.sleep(5)
		self.schedule(self.stateHandshake)

	def onDisconnect(self):
		"""
		Bus connection lost
		"""
		self.logger.info("Server channel connection lost")

		# We lost the interaction with the server.
		# Try to do handshake again and if it failed, 
		# follow the retry protocol from there
		self.schedule(self.stateHandshake)


	def _replyError(self, message):
		"""
		Shorthand function to reply with an error message
		"""
		self.logger.warn(message)
		self.serverChannel.reply({
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
			jid = message['jid']
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
					del self.slots[k]
					del self.jobIndex[jid]
					return self._replyError("Configuration error: %s" % str(e))

				except JobInternalException as e:
					del self.slots[k]
					del self.jobIndex[jid]
					return self._replyError("Internal error: %s" % str(e))

				except JobRuntimeException as e:
					del self.slots[k]
					del self.jobIndex[jid]
					return self._replyError("Runtime error: %s" % str(e))

				except Exception as e:
					self.logger.error("Unexpected exception %s: %s", (e.__class__.__name__, str(e)))
					del self.slots[k]
					del self.jobIndex[jid]
					return self._replyError("Unexpected error: %s" % str(e))

				# Done
				self.serverChannel.reply({
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
			jid = message['jid']
		except KeyError as e:
			return self._replyError("Could not find key %s in job_start message" % str(e))

		# Check if we don't have such job
		if not jid in self.jobIndex:
			return self._replyError("Could a job with the given ID" % str(e))

		# Fetch job entry
		job = self.jobIndex[jid]

		# Free slot
		self.slots[job.slot] = None
		del self.jobIndex[jid]

		# Kill job
		job.kill()

		# Reply OK
		self.serverChannel.reply({
				'result': 'ok'
			})

	def onAppJobData(self, final, data, app=None):
		"""
		Callback from the application when the data are available
		"""

		# Forward message to the server channel
		self.serverChannel.send('job_data', {
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
			self.serverChannel.send('job_completed', {
					'jid': app.jobid,
					'result': 0
				})

	def onAppJobAborted(self, res, app=None):

		# Check if we were already cleaned-up
		if app.jobid in self.jobIndex:

			# Free slots and index entry
			self.slots[app.slot] = None
			del self.jobIndex[app.jobid]

			# Forward the event to the server
			self.serverChannel.send('job_completed', {
					'jid': app.jobid,
					'result': res
				})

	def step(self):
		"""
		Run the next cycle of the FSM
		"""
		self.stepFSM()
		time.sleep(0.5)
