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
import uuid
import logging
import datetime

from jobmanager.config import Config

from liveq.component import Component
from liveq.io.bus import BusChannelException
from liveq.models import Agent, AgentGroup, AgentMetrics, Observable
from liveq.data.histo.intermediate import IntermediateHistogramCollection
from liveq.data.tune import Tune

class ResultsManagerComponent(Component):
	"""
	Core jobmanager
	"""

	def __init__(self):
		"""
		Setup job manager
		"""
		Component.__init__(self)

		# Setup logger
		self.logger = logging.getLogger("results-manager")
		self.logger.info("ResultsManager component started")

		# Register callbacks from the internal message bus, such as
		# job creation and abortion
		self.resultsChannel = Config.IBUS.openChannel("results")
		self.jobChannel.on('results_put', self.onBusResultsPut)
		self.jobChannel.on('results_get', self.onBusResultsGet)


	####################################################################################
	# --------------------------------------------------------------------------------
	#                                CALLBACK HANDLERS
	# --------------------------------------------------------------------------------
	####################################################################################

	# =========================
	# Internal Bus Callbacks
	# =========================

	def onBusResultsPut(self, message):
		"""
		Callback when we have results in the bus
		"""

		# Log request
		self.logger.info("Got job request in IBUS")


	def onBusResultsGet(self, message):
		"""
		Callback when we have a request for fetching resutls from bus
		"""

		# Log request
		self.logger.info("Got job request in IBUS")
