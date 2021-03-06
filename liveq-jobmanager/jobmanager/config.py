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

import ConfigParser
from liveq.config import configexceptions
from liveq.config.core import CoreConfig
from liveq.config.database import DatabaseConfig
from liveq.config.store import StoreConfig
from liveq.config.internalbus import InternalBusConfig
from liveq.config.externalbus import ExternalBusConfig
from liveq.config.histograms import HistogramsConfig
from liveq.models import createBaseTables

class JobManagerConfig:
	"""
	Local configuration for the job manager
	"""

	#: The names of the channels the user is trusting
	TRUSTED_CHANNELS = []

	#: The time after a failed node will be retried
	FAIL_DELAY = 60

	#: The maximum number of consecutive fails before the node is considered
	#: invalid and won't be used again
	FAIL_LIMIT = 10

	#: The time after a node is considered invalid will be re-tried
	FAIL_RETRY_DELAY = 86400

	#: Results directory
	RESULTS_PATH = ""

	#: Minimum event thresshold below which we are not going to start
	#: a job in a worker
	MIN_EVENT_THRESSHOLD = 1000

	@staticmethod
	def fromConfig(config, runtimeConfig):

		channels = str(config.get("jobmanager", "trusted-channels"))
		JobManagerConfig.TRUSTED_CHANNELS = channels.split(",")
		JobManagerConfig.FAIL_DELAY = config.getint("jobmanager", "failure_delay")
		JobManagerConfig.FAIL_LIMIT = config.getint("jobmanager", "failure_limit")
		JobManagerConfig.FAIL_RETRY_DELAY = config.getint("jobmanager", "failure_retry_delay")
		JobManagerConfig.RESULTS_PATH = config.get("jobmanager", "results_path")
		JobManagerConfig.MIN_EVENT_THRESSHOLD = config.getint("jobmanager", "min_event_thresshold")

"""
Create a configuration for the JOB MANAGER based on the core config
"""
class Config(CoreConfig, DatabaseConfig, StoreConfig, InternalBusConfig, ExternalBusConfig, JobManagerConfig, HistogramsConfig):

	"""
	Update class variables by reading the config file
	contents of the specified filename
	"""
	@staticmethod
	def fromFile(files, runtimeConfig):

		# Read config file(s)
		config = ConfigParser.SafeConfigParser()
		config.read(files)

		# Initialize subclasses
		CoreConfig.fromConfig( config, runtimeConfig )
		DatabaseConfig.fromConfig( config, runtimeConfig )
		StoreConfig.fromConfig( config, runtimeConfig )
		InternalBusConfig.fromConfig( config, runtimeConfig )
		ExternalBusConfig.fromConfig( config, runtimeConfig )
		JobManagerConfig.fromConfig( config, runtimeConfig )
		HistogramsConfig.fromConfig( config, runtimeConfig )

		# Create core models on the database
		createBaseTables()
