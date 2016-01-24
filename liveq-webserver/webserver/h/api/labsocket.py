
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

import struct
import uuid
import logging
import base64

import liveq.data.js as js
import liveq.data.histo.io as io
import liveq.data.histo.reference as reference

import tornado.escape

from liveq.models import Lab, Observable, TunableToObservable, Agent, JobQueue
from liveq.data.histo.intermediate import IntermediateHistogramCollection
from liveq.data.histo.interpolate import InterpolatableCollection
from liveq.data.histo.utils import rebinToReference

from webserver.common.api import compileObservableHistoBuffers, compileTunableHistoBuffers

from webserver.models import UserLevel
from webserver.config import Config
from webserver.h.api import APIInterface

# Flags
FLAG_INTERPOLATION = 1
FLAG_EXISTS = 2
FLAG_CHANNEL_2 = 4

class LabSocketError(Exception):
	"""
	An error occured in a high-level user-action
	"""
	def __init__(self, message, code=None):
		self.message = message
		self.code = code
	def __str__(self):
		return repr(self.message)

class LabSocketInterface(APIInterface):

	def __init__(self, socket):
		"""
		Initialize the LAB SOCKET API interface
		"""
		APIInterface.__init__(self, socket, "labsocket", 0x01)

		# Setup local variables
		self.lab = None
		self.job = None
		self.dataChannel = None
		self.jobChannel = None
		self.ipolChannel = None
		self.sentConfigFrame = False

		# Tunable/Observable Trim
		self.trimObs = []
		self.trimTun = []

	####################################################################################
	# --------------------------------------------------------------------------------
	#                             API INTERFACE IMPLEMENTATION
	# --------------------------------------------------------------------------------
	####################################################################################

	def close(self):
		"""
		Cleanup logic when the channel is closed
		"""
		self.logger.info("Socket closed")

		# Disconnect and release job channel
		if self.jobChannel:
			self.jobChannel.close()
			self.jobChannel = None

		# Disconnect and release interpolation channel
		if self.ipolChannel:
			self.ipolChannel.close()
			self.ipolChannel = None

		# Deselect data channel
		self.selectDataChannel( None )

	def ready(self):
		"""
		When socket is ready, get the user reference
		"""

		# Keep a local reference of the user
		self.user = self.socket.user

	def handleAction(self, action, param):
		"""
		Handle labsocket actions
		"""
		
		##################################################
		# Open (handshake) with a Lab Socket
		# ------------------------------------------------
		if action == "open":

			# Get client API version
			# (0.1a did not support protocol version information)
			self.cversion = "0.1a"
			if 'version' in param:
				self.cversion = param['version']

			# We have a handshake with the agent.
			# Fetch configuration and send configuration frame
			self.logger.info("Handshake with client v%s" % self.cversion)

			# Check if we have trim parameters
			if 'tunables' in param:
				self.trimTun = parm['tunables']
			else:
				self.trimTun = self.user.getKnownTunables()
			if 'observables' in param:
				self.trimObs = parm['observables']
			else:
				self.trimObs = self.user.getKnownObservables()

			# Reset state
			self.selectDataChannel( None )
			self.sentConfigFrame = False

		##################################################
		# Enumerate jobs in user's / team's gropu
		# ------------------------------------------------
		elif action == "job.enum":

			self.sendJobListing()
			# # Reply with the job listing
			# ans = []

			# # Select team jobs
			# jobs = JobQueue.select().where( 
			# 		((JobQueue.team_id == self.user.teamID) | (JobQueue.user_id == self.user.id))
			# 	  & (JobQueue.status << [ JobQueue.PENDING, JobQueue.RUN, JobQueue.STALLED ])
			# 	).dicts()[:]

			# # Send response
			# self.sendResponse({ 
			# 		"status": "ok",
			# 		"jobs": jobs
			# 		})

		##################################################
		# Focus on the job with the given ID
		# ------------------------------------------------
		elif action == "job.select":

			# Switch currently focused job to the given ID
			try:
				job = JobQueue.select().where( JobQueue.id == int(param['jid']) ).get()
			except JobQueue.DoesNotExist:
				return self.sendError("A job with the specified ID dies not exist!", "not-exists")
			except Exception:
				return self.sendError("Invalid 'jid' parameter specified", "invalid")

			# Validate job access permissions
			if job.user_id != self.user.id:
				if job.team_id != self.user.teamID:
					return self.sendError("You don't have permission to access this job details!", "access-denied")

			# Looks good, switch to given job
			self.switchToJob( job, refresh=True )

		##################################################
		# Verify job submission
		# ------------------------------------------------
		elif action == "job.verify":

			# Check if there is an active job with the same paper
			if JobQueue.select().where(
					(JobQueue.status << [ JobQueue.PENDING, JobQueue.RUN, JobQueue.STALLED ])
				  & (JobQueue.paper_id == self.user.activePaper_id)
				  & (JobQueue.user_id == self.user.id)
				).exists():

				# Send conflict warning
				self.sendResponse({
					"status"  : "conflict"
					})

			else:

				# We are good
				self.sendResponse({
					"status"  : "ok"
					})

		##################################################
		# Submit a new job to the liveQ workers
		# ------------------------------------------------
		elif action == "job.submit":

			# Switch to the user's lab
			if not self.switchLab( self.user.lab ):
				self.sendError("Cannot resolve user's lab", "not-found")
				return False

			# Format user tunables
			tunables = self.lab.formatTunables( param['parameters'] )

			# Send status
			self.sendStatus("Contacting job manager", {"JOB_STATUS": "starting"})

			# Ask job manager to schedule a new job
			ans = self.jobChannel.send('job_start', {
				'lab'  : self.lab.uuid,
				'group': self.user.resourceGroup.uuid,
				'user' : self.user.id,
				'team' : self.user.teamID,
				'paper': self.user.activePaper_id,
				'parameters': tunables
			}, waitReply=True, timeout=5)

			# Check for I/O failure on the bus
			if not ans:
				return self.sendError("Unable to contact the job manager")

			# Check for error response
			if ans['result'] == 'error':
				return self.sendError("Unable to place a job request: %s" % ans['error'])

			# If we have a 'level' parameter (that denotes the level the
			# user submitted the simulation from), and also a job ID 
			# in the response record, tag that particular level
			if ('jid' in ans) and ('level' in param) and (param['level']):

				# # Check if such record exists
				# record = UserLevel.select().where(
				# 		UserLevel.user == self.user.id,
				# 		UserLevel.level == int(param['level'])
				# 	)

				# # If it exists, update it
				# if record.exists():
				# 	level = record.get()
				# 	level.job_id = int(ans['jid'])
				# 	level.save()

				# # Otherwise create it
				# else:
				level = UserLevel.create(
						user=self.user.id,
						level=int(param['level']),
						job_id=int(ans['jid'])
					)
				level.save()

			# Check if this job is already calculated
			if ans['result'] == 'exists':

				# Return details of the specified job
				self.sendResponse({ 
						"status": "ok",
						"jid": ans['jid']
					})

				# Send configuration frame if not already sent
				if not self.sentConfigFrame:
					self.sendConfigurationFrame( FLAG_EXISTS )

				# Send data
				self.onBusData( ans, FLAG_EXISTS )

				# Forward event to the user socket
				self.sendAction( "job.exists", { } )

			else:

				# Send status
				self.sendStatus("Job #%s started" % ans['jid'], {"JOB_STATUS": "started"})

				# Send response
				self.sendResponse({ 
						"status": "ok",
						"jid": ans['jid']
						})

				# The job started, switch to that job
				self.switchToJob( ans['jid'] )			

		##################################################
		# Estimate the results of the specified job
		# ------------------------------------------------
		elif action == "job.estimate":

			# Switch to the user's lab
			if not self.switchLab( self.user.lab ):
				self.sendError("Cannot resolve user's lab", "not-found")
				return False

			# Send configuation frame only once
			if not self.sentConfigFrame:
				# Send configuration frame
				self.sendConfigurationFrame()

			# Fetch parameters
			tunables = param['parameters']
			trimObs = param['observables']
			if trimObs and len(trimObs) > 0:
				self.trimObs = trimObs

			# Format user tunables
			tunables = self.lab.formatTunables( tunables )

			# Send interpolation
			try:
				self.sendInterpolation(tunables)
			except LabSocketError as e:
				self.sendError( e.message, e.code )

		##################################################
		# Abort action with the specifeid id
		# ------------------------------------------------
		elif action == "job.abort":

			# Switch currently focused job to the given ID
			try:
				job = JobQueue.select().where( JobQueue.id == int(param['jid']) ).get()
			except JobQueue.DoesNotExist:
				return self.sendError("A job with the specified ID dies not exist!", "not-exists")
			except Exception:
				return self.sendError("Invalid 'jid' parameter specified", "invalid")

			# Validate job access permissions
			if job.user_id != self.user.id:
				if job.team_id != self.user.teamID:
					return self.sendError("You don't have permission to access this job details!", "access-denied")

			# Abort job
			self.abortJob( job.id )

			# Remove from list
			self.sendAction("job.removed", { 'job': job.serialize() })

		##################################################
		# Deselect an active job
		# ------------------------------------------------
		elif action == "job.deselect":

			# Deselect data channel
			self.selectDataChannel( None )

		##################################################
		# Return details for the specified job
		# ------------------------------------------------
		elif action == "job.details":

			# Return details of the specified job
			self.sendResponse({ 
					"status": "ok",
					"data": self.user.getJobDetails(param['jid'])
					})

		##################################################
		# Return results for the specified job
		# ------------------------------------------------
		elif action == "job.results":

			# Get job record
			job = self.user.getJob( param['jid'] )
			if not job:
				return self.sendError("Could not fetch details of the specified job!")

			# Check if we need to switch labs
			switchBackToLab = self.lab
			if not (self.lab is None) and (self.lab.id == job.lab.id):
				switchBackToLab = None
			else:
				if not self.switchLab( job.lab ):
					self.sendError("Cannot resolve job's lab", "not-found")
					return False

			# Send configuration frame to the secondary channel
			self.sendConfigurationFrame( FLAG_CHANNEL_2 )

			# Ask job manager to fetch the results of the specifeid job
			ans = self.jobChannel.send('job_results', {
				'jid': param['jid']
			}, waitReply=True)

			# Check for I/O failure on the bus
			if not ans:
				return self.sendError("Unable to contact the job manager")

			# Check for error response
			if ans['result'] == 'error':
				return self.sendError("Unable to fetch results of the job: %s" % ans['error'])

			# Send bus data on the secondary channel
			self.onBusData( ans, FLAG_CHANNEL_2 )

			# Return details of the specified job
			self.sendResponse({ 
				"status": "ok"
				})

			# Check if we should switch back to the previous lab
			if switchBackToLab:
				self.switchLab(switchBackToLab)

		else:

			# Unknown request
			self.sendError("Unknown action '%s' requested" % action )

	####################################################################################
	# --------------------------------------------------------------------------------
	#                               MESSAGE BUS CALLBACKS
	# --------------------------------------------------------------------------------
	####################################################################################

	def onBusData(self, data, flags=0):
		"""
		[Bus Event] Data available
		"""

		# Create a histogram collection from the data buffer
		histos = IntermediateHistogramCollection.fromPack( data['data'] )

		# Keep only the subset we are interested in
		obsNames = self.lab.getHistograms() 
		if len(self.trimObs) > 0:
			obsNames = self.trimObs

		# Return subset of histos we are interested in
		histos = histos.subset( obsNames )

		# Pack them
		histoBuffers = []
		for k, h in histos.iteritems():
			# Pack buffers
			histoBuffers.append( js.packHistogram( h.toHistogram().normalize(copy=False) ) )

		# Compile buffer and send
		self.sendBuffer( 0x02, 
				# Header must be 64-bit aligned
				struct.pack("<BBHI", 
					2, 						# [8-bit]  Protocol
					flags, 					# [8-bit]  Flags (1=FromInterpolation)
					0, 						# [16-bit] (Reserved)
					len(histoBuffers)		# [32-bit] Number of histograms
				) + ''.join(histoBuffers)
			)

	def onBusCompleted(self, data):
		"""
		[Bus Event] Simulation completed
		"""

		# Forward event to the user socket
		self.sendAction( "job.completed", { 'result': data['result'] } )

	def onBusStatus(self, data):
		"""
		[Bus Status] Forward bus message 
		"""

		# Extract parameters
		pMessage = ""
		if 'message' in data:
			pMessage = data['message']
		pVars = { }
		if 'vars' in data:
			pVars = data['vars']

		# Forward the status message
		self.sendStatus(pMessage, pVars)

	####################################################################################
	# --------------------------------------------------------------------------------
	#                                 UTILITY FUNCTIONS
	# --------------------------------------------------------------------------------
	####################################################################################

	def getAgents(self, job):
		"""
		Return agent configuration for the specified job
		"""

		# Return agent UUID and coordinates
		return Agent.select( Agent.uuid, Agent.latlng ).where( Agent.activeJob == job ).dicts()[:]

	def selectDataChannel(self, channelID):
		"""
		Switch channel to the given ID
		"""

		# Close previous
		if self.dataChannel:

			# Unbind events
			self.dataChannel.off('job_data', self.onBusData)
			self.dataChannel.off('job_status', self.onBusStatus)
			self.dataChannel.off('job_completed', self.onBusCompleted)

			# Disconnect and release job channel
			#self.dataChannel.close()
			self.dataChannel = None

		# Open new channel
		if channelID:

			# Open channel
			self.dataChannel = Config.IBUS.openChannel(channelID, serve=True)

			# Bind events
			self.dataChannel.on('job_data', self.onBusData)
			self.dataChannel.on('job_status', self.onBusStatus)
			self.dataChannel.on('job_completed', self.onBusCompleted)

	def switchToJob(self, job, refresh=False):
		"""
		Switch focus to the given job
		"""

		# Switch or query job object
		jobRef = job
		if not (jobRef is None) and not isinstance(job, JobQueue):
			try:
				jobRef = JobQueue.select().where( JobQueue.id == job ).get()
			except JobQueue.DoesNotExist:
				jobRef = None
				return False

		# Fire deactivate on previous job
		if (self.job != None):
			if (jobRef is None) or (self.job.id != jobRef.id):
				self.sendAction("job.deactivate", { 'jid': self.job.id })

		# If we are focusing to None, just deactivate
		if jobRef == None:
			self.selectDataChannel(None)
		else:
			self.job = jobRef

		# Switch to the job's lab
		if not self.switchLab( jobRef.lab ):
			return False

		# Send configuration frame
		self.sendConfigurationFrame()

		# Serialize job
		jobData = jobRef.serialize()
		jobData['maxEvents'] = self.lab.getEventCount()

		# Get level data of this job
		record = UserLevel.select().where(
				UserLevel.user == self.user.id,
				UserLevel.job_id == jobRef.id
			)
		if record.exists():
			level = record.get()
			print level
			jobData['level'] = level.level.id
		else:
			jobData['level'] = None

		# Send job details
		self.sendAction("job.details", {
				'job': jobData,
				'agents': self.getAgents( jobRef )
			})

		# Connect to the specified data channel
		self.selectDataChannel( jobData['dataChannel'] )

		# Re-send histograms of the given job
		if refresh:
			self.jobChannel.send('job_refresh', { 
					'jid': jobRef.id 
				})

	def sendJobListing(self):
		"""
		Send the job listing
		"""

		# Select team jobs
		jobs = JobQueue.select().where( 
				(JobQueue.user_id == self.user.id)
			  & (JobQueue.status << [ JobQueue.PENDING, JobQueue.RUN, JobQueue.STALLED ])
			).order_by( JobQueue.id, JobQueue.status )

		# Send jobs
		for job in jobs:

			# Serialize and send
			self.sendAction("job.added", {
					'job': job.serialize()
				})

	def switchLab(self, lab):
		"""
		Open socket

		After oppening the socket, we will try to find a lab tha matches the
		specified labID and then register on the message bus in order to receive
		the messages regarding this lab.
		"""

		# Act accordingly if lab is instance or number
		if isinstance(lab, Lab):

			# Don't do anything if lab is already selected
			if not (self.lab is None) and (self.lab.id == lab.id):
				return True

			# Switch lab
			self.logger.info( "Labsocket switching to lab #%i" % lab.id )
			self.lab = lab

		else:

			# Don't do anything if lab is already selected
			if not (self.lab is None) and (self.lab.id == lab):
				return True

			# Switch lab
			self.logger.info( "Labsocket switching to lab #%i" % lab )
			try:
				self.lab = Lab.get( Lab.id == lab )
			except Lab.DoesNotExist:
				self.lab = None
				self.logger.error("Unable to locate lab with id '%i'" % lab)
				self.sendError("Unable to find a lab with the given ID")
				return False

		# Open required bus channels if not already open
		if not self.ipolChannel:
			self.ipolChannel = Config.IBUS.openChannel("interpolate")
		if not self.jobChannel:
			self.jobChannel = Config.IBUS.openChannel("jobs")

		# Reset configFrameSent
		self.sentConfigFrame = False

		# We are good
		return True

	def sendStatus(self, message, varMetrics={}):
		"""
		Send a status message to the interface.

		Optionally you can send status variables that can be processed
		by the interface in the vars dict.
		"""

		# Send the status message
		self.sendAction("job.status", {
			"message": message,
			"vars": varMetrics
		})


	def sendConfigurationFrame(self, flags=0):
		"""
		Send the first, configuration frame to the agent
		"""

		# ==========================
		#  Histograms (Observables)
		# ==========================

		# Fetch descriptions for the histograms
		histo_ids = self.lab.getHistograms()
		histo_ids = list(set(histo_ids) & set(self.trimObs))
		histoBuffers = compileObservableHistoBuffers( self.lab, histo_ids )

		# Compile buffer and send
		self.sendBuffer( 0x01, 
				# Header must be 64-bit aligned
				struct.pack("<BBHI", 
					2, 						# [8-bit]  Protocol
					flags, 					# [8-bit]  Flags
					0, 						# [16-bit] Number of events
					len(histoBuffers)		# [32-bit] Number of histograms
				) + ''.join(histoBuffers)
			)

		# We did send a configuration frame
		self.sentConfigFrame = True

	def sendInterpolation(self, tunables):
		"""
		Try to contact interpolator and reply an interpolation data frame.
		If the process was successful, True is returned, otherwise False
		"""

		# Send status
		self.sendStatus("Contacting interpolator", {"JOB_STATUS": "interpolating"})

		# Histograms to trim for
		trimObs = None
		if self.trimObs:
			trimObs = self.trimObs

		# First ask interpolator
		ans = self.ipolChannel.send("interpolate", {            
				'lab': self.lab.uuid,
				'parameters': tunables,
				'histograms': trimObs
			}, waitReply=True, timeout=10)

		# Check response
		if not ans:

			# Send status
			self.sendStatus("Could not contact interpolator", {"INTERPOLATION": "0"})
			self.logger.warn("Could not contact interpolator")

			# Send error
			raise LabSocketError("Could not contact interpolation server", "not-alive")

		elif ans['result'] != 'ok':

			# Send error
			self.sendStatus("Could not interpolate (%s)" % ans['error'])
			self.logger.warn("Could not interpolate (%s)" % ans['error'])

			# Send error
			raise LabSocketError("Could not request interpolation: %s" % ans['error'], "request-error")

		else:

			# Send status
			self.sendStatus("Processing interpolation")

			# Fetch InterpolatableCollection from data
			histos = InterpolatableCollection.fromPack( ans['data'] )

			# Re-generate histogram from coefficients
			histos.regenHistograms()

			# Pack histograms
			histoBuffers = []
			for hid, h in histos.iteritems():

				# Skip untrimmed histograms 
				if (len(self.trimObs) > 0) and (not hid in self.trimObs):
					continue

				# Rebin and normalize histograms
				rebinToReference( h, reference.forLab(self.lab).loadReferenceHistogram(h.name) )
				h.normalize(copy=False)

				# Pack buffers
				histoBuffers.append( js.packHistogram(h) )

			# Prepare flags
			flags = 1 # (1=FromInterpolation)
			if ans['exact']:
				flags |= 2 # (2=Exact match)

			# Compile buffer and send
			self.sendBuffer( 0x02, 
					# Header must be 64-bit aligned
					struct.pack("<BBHI", 
						2, 						# [8-bit]  Protocol
						flags, 					# [8-bit]  Flags (1=FromInterpolation)
						0, 						# [16-bit] (Reserved)
						len(histoBuffers)		# [32-bit] Number of histograms
					) + ''.join(histoBuffers)
				)

			# Send status message
			self.sendStatus("Got interpolated results", {"INTERPOLATION": "1"})

		# Successful
		return True


	def abortJob(self, jobid):
		"""
		Abort a previously running job
		"""

		# Send status
		self.sendStatus("Aborting job #%i" % jobid, {"JOB_STATUS": "aborting"})

		# Ask job manager to cancel a job
		ans = self.jobChannel.send('job_cancel', {
			'jid': jobid
		}, waitReply=True)

		# Check for I/O failure on the bus
		if not ans:
			return self.sendError("Unable to contact the job manager")

		# Check for error response
		if ans['result'] == 'error':
			return self.sendError("Unable to cancel job: %s" % ans['error'])

		# Send status
		self.sendStatus("Job aborted", {"JOB_STATUS": "aborted"})

		# If this was the job we were currently running at
		# then disconnect from the job
		if self.job.id == jobid:

			# Deactivate job
			self.sendAction("job.deactivate", { 'jid': jobid })

			# Delelect data channel
			self.selectDataChannel( None )

			# Reset job ID
			self.job = None

