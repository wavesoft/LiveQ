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
import uuid
import cPickle as pickle

from jobmanager.config import Config

from liveq.utils import deepupdate
from liveq.models import Agent, Lab
from liveq.data.histo.sum import intermediateCollectionMerge
from liveq.utils.remotelock import RemoteLock

JOB_CHANNELS = { }

class Job:
	"""
	Store interface with the job management
	"""

	def __init__(self, buf=None, id=None, dataChannel=None, lab=None, parameters=None, group=None):
		"""
		Initialize job by it's ID

		There are two ways of constructing this class:
		- By defining the `buf` and the `id`: which is the contents of the metadata key and will resume a Job
		- By not defining the `buf`: Where a new Job will be allocated
		"""

		# Prepare/allocate new job ID if we haven't
		# specified anything
		self.id = id
		if not id:
			self.id = uuid.uuid4().hex

		# Prepare metadata
		self.store_meta = {
			'dataChannel': dataChannel,
			'group': group,
			'parameters': parameters
		}

		# If we have a lab specified, store it's UUID in the store_meta
		if lab:
			self.store_meta['lab_id'] = lab.uuid

		# Synchronize metadata with the store
		if not buf:
			Config.STORE.set("job-%s:meta" % self.id, pickle.dumps(self.store_meta))
		else:
			self.store_meta = pickle.loads(buf)

		# Populate static variables and fetch them
		# from store if missing
		self.dataChannel = dataChannel
		self.group = group
		self.parameters = parameters
		self.lab = lab
		if not group:
			self.group = self.store_meta['group']
		if not parameters:
			self.parameters = self.store_meta['parameters']
		if not lab:
			lab_id = self.store_meta['lab_id']

			# Create an instance to Lab model
			try:
				self.lab = Lab.get( Lab.uuid == lab_id)
			except Lab.DoesNotExist:
				self.lab = None

		# Try to open channel
		if not dataChannel:
			dataChannel = self.store_meta['dataChannel']
		if dataChannel:

			# Open IBUS channel and keep it on JOB_CHANNELS
			if not dataChannel in JOB_CHANNELS:
				JOB_CHANNELS[dataChannel] = Config.IBUS.openChannel(dataChannel)

			# Fetch job channel
			self.channel = JOB_CHANNELS[dataChannel]
			self.dataChannel = dataChannel

		else:
			self.channel = None

	def updateHistograms(self, agent_id, data):
		"""
		Add/Update a histogram data for the given agent_id
		and return all the histograms as an array
		"""

		# Prepare histograms dict
		histos = { }

		# Fetch histogram buffer from store
		buf = Config.STORE.get("job-%s:histo" % self.id)
		if buf:
			histos = pickle.loads(buf)

		# Update our histogram
		histos[agent_id] = data

		# Put it back
		Config.STORE.set("job-%s:histo" % self.id, pickle.dumps(histos))

		# Merge and return histograms
		return intermediateCollectionMerge( histos.values() )

	def getHistograms(Self):
		"""
		Get and merge all the histograms in the stack
		"""

		# Prepare histograms dict
		histos = { }

		# Fetch histogram buffer from store
		buf = Config.STORE.get("job-%s:histo" % self.id)
		if buf:
			histos = pickle.loads(buf)

		# Merge and return histograms
		return intermediateCollectionMerge( histos.values() )


	def getMeta(self, name):
		"""
		Fetch metadata from store
		"""

		# Fetch buffer contents
		buf = Config.STORE.get("job-%s:meta" % self.id)
		if not buf:
			return None

		# Extract metadata
		meta = pickle.loads(buf)

		# Update metadata
		if not name in meta:
			return None
		else:
			return meta[name]

	def setMeta(self, name, value):
		"""
		Set metadata to store
		"""

		# Fetch buffer contents
		buf = Config.STORE.get("job-%s:meta" % self.id)
		if not buf:
			return None

		# Extract metadata
		meta = pickle.loads(buf)

		# Update metadata
		meta[name] = value

		# Store
		Config.STORE.set("job-%s:meta" % self.id, pickle.dumps(meta))

	def release(self):
		"""
		Delete job and all of it's resources
		"""

		# Delete entries in the STORE
		Config.STORE.delete("job-%s:meta" % self.id)
		Config.STORE.delete("job-%s:histo" % self.id)

		# Close channel
		self.channel.close()
		del JOB_CHANNELS[self.dataChannel]

##############################################################
# ------------------------------------------------------------
#  INTERFACE FUNCTIONS
# ------------------------------------------------------------
##############################################################

def createJob( lab, parameters, group, dataChannel ):
	"""
	This function will create a new Job with a unique ID and will set-up
	the response channel for the internal bus to `dataChannel`
	"""

	# Try to lookup a lab with the given ID
	labInst = None
	try:
		labInst = Lab.get( Lab.uuid == lab)
	except Lab.DoesNotExist:
		logging.warn("Could not find lab #%s" % lab)
		return

	# Process user's parameters (tunes)
	userTunes = { }
	tunables = labInst.getTunables()
	for k,parm in tunables.iteritems():

		# Get user parameter
		if k in parameters:

			# Convert to numbers
			vValue = float(parameters[k])
			vMax = float(parm['max'])
			vMin = float(parm['min'])
			vDecimals = int(parm['dec'])

			# Wrap value betwen min and max
			vValue = max( min( vMax, vValue ), vMin )

			# Convert to a number with the specified precision
			# and store it on the user parameters
			userTunes[k] = ("%." + str(vDecimals) + "f") % vValue

	# Deep merge lab default parameters and user's parameters
	mergedParameters = deepupdate( { "tune": userTunes } , labInst.getParameters() )

	# Put more lab information in the parameters
	mergedParameters['repoTag'] = labInst.repoTag
	mergedParameters['repoType'] = labInst.repoType
	mergedParameters['repoURL'] = labInst.repoURL
	mergedParameters['histograms'] = labInst.getHistograms()

	# Return a new job instance
	return Job(
		lab=labInst,
		group=group,
		parameters=mergedParameters,
		dataChannel=dataChannel)

def getJob( job_id ):
	"""
	This function will lookup the job store and return a Job instance 
	only if the given job exists.
	"""

	# Load job metadata
	buf = Config.STORE.get("job-%s:meta" % job_id)

	# Not exists, return None
	if not buf:
		return None

	# Job exists, return instance
	return Job(buf=buf, id=job_id)

def hasJob( job_id ):
	"""
	Return TRUE if a job with this ID exists in the store
	"""

	# Load job metadata
	buf = Config.STORE.get("job-%s:meta" % job_id)
	return bool(buf)
