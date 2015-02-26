
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
import datetime

import liveq.data.js as js
import liveq.data.histo.io as io
import tornado.escape

from liveq.data.histo.intermediate import IntermediateHistogramCollection
from liveq.data.histo.interpolate import InterpolatableCollection

from webserver.config import Config
from webserver.h.api import APIInterface

from tornado.ioloop import IOLoop
from webserver.common.training import OfflineSequence
from webserver.common.api import compileObservableHistoBuffers

class LabTrainInterface(APIInterface):

	def __init__(self, socket):
		"""
		Initialize the TRAIN SOCKET API interface
		"""
		APIInterface.__init__(self, socket, "labtrain", 0x02)

		# Setup local variables
		self.sequence = None
		self.running = False
		self.trainTimer = None

		# Tunable/Observable Trim
		self.observables = []

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
		self.trainAbort()

	def ready(self):
		"""
		When socket is ready, get the user reference
		"""

		# Keep a local reference of the user
		self.user = self.socket.user


	def handleAction(self, action, param):
		"""
		Handle trainsocket actions
		"""
		
		# Process actions
		if action == "open":

			# Get client API version
			self.cversion = "0.1a"
			if 'version' in param:
				self.cversion = param['version']

			# Validate request
			if not 'sequence' in param:
				self.sendError("Missing parameter 'sequence'")
				return
			if not 'observables' in param:
				self.sendError("Missing parameter 'sequence'")
				return

			# We have a handshake with the agent.
			# Open offline sequence
			self.logger.info("Opening offline sequence '%s' with client v%s" % (param['sequence'], self.cversion))

			# Store histogram names
			self.observables = param['observables']

			# Open training sequence
			self.sequence = OfflineSequence( 
				baseDir=Config.TRAINSEQ_PATH,
				prefix="%s-" % param['sequence'],
				histoTrim=self.observables
				)

			# Send configuration frame
			self.sendConfigurationFrame()

		# Process actions
		elif action == "start":

			# Start the train sequence
			self.trainSequence()

		# Process actions
		elif action == "stop":

			# Abort the train sequence
			self.trainAbort()

		else:
			# Unknown request
			self.sendError("Unknown action '%s' requested" % action )

	####################################################################################
	# --------------------------------------------------------------------------------
	#                             TRAINING PLAYBACK SEQUENCE
	# --------------------------------------------------------------------------------
	####################################################################################


	def sendConfigurationFrame(self):
		"""
		Send the first, configuration frame to the agent
		"""

		# ==========================
		#  Histograms (Observables)
		# ==========================

		# Fetch descriptions for the histograms
		histoBuffers = compileObservableHistoBuffers( self.observables )

		# Compile buffer and send
		self.sendBuffer( 0x01, 
				# Header must be 64-bit aligned
				struct.pack("<BBHI", 
					2, 						# [8-bit]  Protocol
					0, 						# [8-bit]  Flags (1=FromInterpolation)
					0, 						# [16-bit] Number of events
					len(histoBuffers)		# [32-bit] Number of histograms
				) + ''.join(histoBuffers)
			)

	def trainSequence(self):
		"""
		Start training sequence
		"""

		# If we don't have sequence, exit
		if not self.sequence:
			return

		# Get next training histograms
		histos = self.sequence.next()
		if histos == None:
			# If we don't have other data, we are completed
			# Forward event to the user socket
			self.sendAction( "completed", {} )
			return

		# Pack histograms into javascript buffers
		histoBuffers = []
		for h in histos:
			# Pack buffers
			histoBuffers.append( js.packHistogram( h ) )

		# Compile buffer and send
		self.sendBuffer( 0x02, 
				# Header must be 64-bit aligned
				struct.pack("<BBHI", 
					2, 						# [8-bit]  Protocol
					0, 						# [8-bit]  Flags (1=FromInterpolation)
					0, 						# [16-bit] Number of events
					len(histoBuffers)		# [32-bit] Number of histograms
				) + ''.join(histoBuffers)
			)

		# Schedule next request
		self.trainTimer = IOLoop.instance().add_timeout(datetime.timedelta(0,0,0,100), self.trainSequence)

	def trainAbort(self):
		"""
		Abort a training sequence
		"""

		# Dispose sequence
		if self.sequence:
			self.sequence = None

		# Abort timer
		if self.trainTimer:
			IOLoop.instance().remove_timeout(self.trainTimer)
			self.trainTimer = None

