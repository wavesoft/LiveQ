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
import datetime
import uuid
import random
import numpy as np

from interpolator.config import Config
from interpolator.data.store import HistogramStore

from liveq.data.histo import Histogram, HistogramCollection
from liveq.data.tune import Tune

class InterpolatorComponent(Component):
	"""
	Core jobmanager
	"""

	def __init__(self):
		"""
		Setup interpolator
		"""
		Component.__init__(self)

		# Open the interpolator
		self.ipolChannel = Config.IBUS.openChannel("interpolate")

		# Bind events
		self.ipolChannel.on('interpolate', self.onInterpolateRequest)
		self.ipolChannel.on('results', self.onInterpolateResults)

	def onInterpolateRequest(self, data):
		"""
		A request in the interpolator bus to get an estimate
		"""
		
		# Ensure we have required parameters in the data
		if not all([ x in data for x in ('lab', 'config')]):
			return {
				'result': 'error',
				'error': "Missing parameters in the request"
			}

		# Generate a tune object
		tune = Tune(data['config'], labid=data['lab'])

		# Get an interpolator for this region
		ipol = HistogramStore.getInterpolator(tune)

		# Run interpolation and get histogram collection
		histograms = ipol(*tune.getValues())

		# Return a packed histogram collection
		self.ipolChannel.reply({
				'result': 'ok',
				'data': histograms.pack()
			})


	def onInterpolateResults(self, data):
		"""
		An incoming request to update interpolation dataset
		"""
		
		# Ensure we have required parameters in the data
		if not all([ x in data for x in ('lab', 'config', 'data')]):
			return {
				'result': 'error',
				'error': "Missing parameters in the request"
			}

		# Generate a tune object
		tune = Tune(data['config'], labid=data['lab'])

		# Unpack a collection of histograms from the data
		histos = HistogramCollection.unpack(data['data'])

		# Append data on the histogram store
		HistogramStore.append( tune, histos )

		# Return success response
		self.ipolChannel.reply({
				'result': 'ok',
				})
