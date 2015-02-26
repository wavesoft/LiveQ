
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

import tornado.escape

from liveq.models import Lab, Observable, TunableToObservable
from liveq.data.histo.intermediate import IntermediateHistogramCollection
from liveq.data.histo.interpolate import InterpolatableCollection

from webserver.common.api import compileObservableHistoBuffers, compileTunableHistoBuffers

from webserver.config import Config
from webserver.h.api import APIInterface

class LabSocketInterface(APIInterface):

	def __init__(self, socket):
		"""
		Initialize the LAB SOCKET API interface
		"""
		APIInterface.__init__(self, socket, "labsocket", 0x01)

		# Setup local variables
		self.lab = None
		self.jobid = None
		self.dataChannel = None

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

		# If we have a running tune, cancel it
		if self.jobid:

			# Ask job manager to cancel the job
			ans = self.jobChannel.send('job_cancel', {
				'jid': self.jobid
			})

			# Clear job ID
			self.jobid = None

		# Unregister from the bus
		if self.dataChannel:

			# Disconnect and release data channel
			self.dataChannel.off('job_data', self.onBusData)
			self.dataChannel.off('job_completed', self.onBusCompleted)
			self.dataChannel.close()

			# Disconnect and release job channel
			self.jobChannel.close()
			self.jobChannel = None
			self.dataChannel = None

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
		
		# Process actions
		if action == "open":

			# Get client API version
			self.cversion = "0.1a"
			if 'version' in param:
				self.cversion = param['version']

			# Open lab socket
			self.openLab(param['labid'])
			if not self.lab:
				return

			# We have a handshake with the agent.
			# Fetch configuration and send configuration frame
			self.logger.info("Opening lab %s with client v%s" % (param['labid'], self.cversion))

			# Check if we have trim parameters
			if 'tunables' in param:
				self.trimTun = parm['tunables']
			else:
				self.trimTun = []
			if 'observables' in param:
				self.trimObs = parm['observables']
			else:
				self.trimObs = []

			# Send configuration frame
			self.sendConfigurationFrame()

		elif action == "sim_start":

			# If we are already running a tune (jobid is defined), cancel and restart
			self.abortJob()

			# Format user tunables
			tunables = self.lab.formatTunables( param )

			# Send status
			self.sendStatus("Contacting job manager", {"JOB_STATUS": "starting"})

			# Ask job manager to schedule a new job
			ans = self.jobChannel.send('job_start', {
				'lab': self.lab.uuid,
				'group': 'global',
				'dataChannel': self.dataChannel.name,
				'parameters': tunables
			}, waitReply=True, timeout=5)

			# Check for I/O failure on the bus
			if not ans:
				return self.sendError("Unable to contact the job manager")

			# Check for error response
			if ans['result'] == 'error':
				return self.sendError("Unable to place a job request: %s" % ans['error'])

			# Send status
			self.sendStatus("Job #%s started" % ans['jid'], {"JOB_STATUS": "started"})

			# The job started, save the tune job ID
			self.jobid = ans['jid']


		elif action == "sim_estimate":
			# We requested just an estimate.
			# No need to have full job management

			# Fetch parameters
			tunables = param['parameters']
			trimObs = param['observables']
			if trimObs and len(trimObs) > 0:
				self.trimObs = trimObs

			# Format user tunables
			tunables = self.lab.formatTunables( tunables )

			# Send interpolation
			if not self.sendInterpolation(tunables):
				self.sendError("Could not estimate result")

		elif action == "sim_abort":

			# If we don't have a running tune, don't do anything
			if not self.jobid:
				return

			# Abort job
			self.abortJob()

		else:

			# Unknown request
			self.sendError("Unknown action '%s' requested" % action )

	####################################################################################
	# --------------------------------------------------------------------------------
	#                               MESSAGE BUS CALLBACKS
	# --------------------------------------------------------------------------------
	####################################################################################

	def onBusData(self, data):
		"""
		[Bus Event] Data available
		"""

		# If we have no job, ignore
		if not self.jobid:
			return

		# Create a histogram collection from the data buffer
		histos = IntermediateHistogramCollection.fromPack( data['data'] )

		# Keep only the subset we are interested in
		histos = histos.subset( self.lab.getHistograms() )

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
					0, 						# [8-bit]  Flags (1=FromInterpolation)
					0, 						# [16-bit] (Reserved)
					len(histoBuffers)		# [32-bit] Number of histograms
				) + ''.join(histoBuffers)
			)

	def onBusCompleted(self, data):
		"""
		[Bus Event] Simulation completed
		"""

		# If we have no job, ignore
		if not self.jobid:
			return

		# Forward event to the user socket
		self.sendAction( "sim_completed", { 'result': data['result'] } )

		# Reset tune
		self.jobid = None

	def onBusStatus(self, data):
		"""
		[Bus Status] Forward bus message 
		"""

		# If we have no job, ignore
		if not self.jobid:
			return

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

	def openLab(self, labid):
		"""
		Open socket

		After oppening the socket, we will try to find a lab tha matches the
		specified labID and then register on the message bus in order to receive
		the messages regarding this lab.
		"""

		self.logger.info( "Lab socket '%s' requested" % labid )

		# Reset local variables
		self.job = None
		self.jobid = None
		self.dataChannel = None

		# Try to find a lab with the given ID
		try:
			self.lab = Lab.get(Lab.uuid == labid)
		except Lab.DoesNotExist:
			self.lab = None
			self.logger.error("Unable to locate lab with id '%s'" % labid)
			return self.sendError("Unable to find a lab with the given ID")

		# Open required bus channels
		self.ipolChannel = Config.IBUS.openChannel("interpolate")
		self.jobChannel = Config.IBUS.openChannel("jobs")
		self.dataChannel = Config.IBUS.openChannel("data-%s" % uuid.uuid4().hex, serve=True)

		# Bind events
		self.dataChannel.on('job_data', self.onBusData)
		self.dataChannel.on('job_status', self.onBusStatus)
		self.dataChannel.on('job_completed', self.onBusCompleted)

	def sendStatus(self, message, varMetrics={}):
		"""
		Send a status message to the interface.

		Optionally you can send status variables that can be processed
		by the interface in the vars dict.
		"""

		# Send the status message
		self.sendAction("status", {
			"message": message,
			"vars": varMetrics
		})


	def sendConfigurationFrame(self):
		"""
		Send the first, configuration frame to the agent
		"""

		# ==========================
		#  Histograms (Observables)
		# ==========================

		# Fetch descriptions for the histograms
		histo_ids = self.lab.getHistograms()
		histo_ids = list(set(histo_ids) - set(self.trimObs))
		histoBuffers = compileObservableHistoBuffers( histo_ids )

		# Compile buffer and send
		self.sendBuffer( 0x01, 
				# Header must be 64-bit aligned
				struct.pack("<BBHI", 
					2, 						# [8-bit]  Protocol
					0, 						# [8-bit]  Flags
					0, 						# [16-bit] Number of events
					len(histoBuffers)		# [32-bit] Number of histograms
				) + ''.join(histoBuffers)
			)

	def sendInterpolation(self, tunables):
		"""
		Try to contact interpolator and reply an interpolation data frame.
		If the process was successful, True is returned, otherwise False
		"""

		# Send status
		self.sendStatus("Contacting interpolator", {"JOB_STATUS": "interpolating"})

		# First ask interpolator
		ans = self.ipolChannel.send("interpolate", {            
				'lab': self.lab.uuid,
				'parameters': tunables,
				'histograms': self.lab.getHistograms()
			}, waitReply=True, timeout=5)

		# Check response
		if not ans:

			# Send status
			self.sendStatus("Could not contact interpolator", {"INTERPOLATION": "0"})
			self.logger.warn("Could not contact interpolator")

			# If we asked only for interpolation, return
			return False

		elif ans['result'] != 'ok':

			# Send error
			self.sendStatus("Could not interpolate (%s)" % ans['error'])
			self.logger.warn("Could not interpolate (%s)" % ans['error'])

			# If we asked only for interpolation, return
			return False

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

				# Pack buffers
				histoBuffers.append( js.packHistogram(h) )

			# Compile buffer and send
			self.sendBuffer( 0x02, 
					# Header must be 64-bit aligned
					struct.pack("<BBHI", 
						2, 						# [8-bit]  Protocol
						1, 						# [8-bit]  Flags (1=FromInterpolation)
						0, 						# [16-bit] (Reserved)
						len(histoBuffers)		# [32-bit] Number of histograms
					) + ''.join(histoBuffers)
				)

			# Send status message
			self.sendStatus("Got interpolated results", {"INTERPOLATION": "1"})

			# Check if we found excact match
			if ans['exact']:

				# Let interface know that this is the real answer
				self.sendAction( "sim_completed", { 'result': data['result'] } )

				# Don't store any jobID
				self.jobid = None

				# And exit
				return True

		# Never reached
		return True


	def abortJob(self):
		"""
		Abort a previously running job
		"""

		# Make sure we have a job
		if not self.jobid:
			return

		# Send status
		self.sendStatus("Aborting previous job", {"JOB_STATUS": "aborting"})

		# Ask job manager to cancel a job
		ans = self.jobChannel.send('job_cancel', {
			'jid': self.jobid
		}, waitReply=True)

		# Check for I/O failure on the bus
		if not ans:
			return self.sendError("Unable to contact the job manager")

		# Check for error response
		if ans['result'] == 'error':
			return self.sendError("Unable to cancel job: %s" % ans['error'])

		# Send status
		self.sendStatus("Job aborted", {"JOB_STATUS": "aborted"})

		# Clear job ID
		self.jobid = None
