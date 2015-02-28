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
import snappy
import numpy as np
import cPickle as pickle

from liveq.data.tune import Tune
from liveq.data.histo.interpolate import InterpolatableCollection

from interpolator.config import Config
from interpolator.scipy.interpolate import Rbf
	
class HistogramStore:
	"""
	Histogram I/O class that uses the store class
	"""

	#: ** Compression method **
	#: So far Snappy seems to be the fastest and the most efficient compression
	#: algorithm. 
	F_COMPRESS = snappy.compress

	#: ** Decompression method **
	F_DECOMPRESS = snappy.decompress

	@staticmethod
	def _pickle(collections, validate=False):
		"""
		Converts a collection of InterpolatableCollection into two buffers
		that can be stored in a key/value store.
		"""

		# Prepare response buffers
		valueData = np.array([], dtype=np.float64)
		iHistoMeta = []

		# Prepare meta info
		iLabID = None
		iNumTunes =  None
		iNumCoeff =  None
		iNumCollections = len(collections)

		# Start processing histogram collections
		for c in collections:

			# Require a tune in all collections
			if not c.tune:
				raise ValueError("All histogram collections must have a tune configuration assigned!")

			# Require the same lab in all tunes
			if not iLabID:
				iLabID = c.tune.labid
			else:
				if c.tune.labid != iLabID:
					raise ValueError("All histogram tunes must belong to the same lab!")

			# Get tune info
			sTune = c.tune.getValues()

			# Require the same number of parameters in all tunes
			if not iNumTunes:
				iNumTunes = len(sTune)
			else:
				if len(sTune) != iNumTunes:
					raise ValueError("All histogram tunes must have the same number of tunable parameters!")

			# Require the same number of coefficients in the histogram collections
			if not iNumCoeff:
				iNumCoeff = len(c.dataCoeff)
			else:
				if len(c.dataCoeff) != iNumCoeff:
					raise ValueError("All histogram collections must have the same number of coefficients!")

			# Store metadata
			if not iHistoMeta:
				iHistoMeta = c.dataMeta
			else:

				# Metadata are the same in principle in all nodes, however
				# with a cost of more computing power we can do some validation
				if validate:
					i = 0
					for md in c.dataMeta:

						# Get current data
						rd = iHistoMeta[i]

						# Validate
						# TODO: Not needed for the first draft, implement this

						# Go to next
						i += 1

			# Collect tune and coefficients
			valueData = np.concatenate([
					valueData,
					sTune,
					c.dataCoeff
				])


		# Pack value buffer
		valueData = HistogramStore.F_COMPRESS( np.getbuffer( valueData ) )

		# Pack metadata
		metaData = HistogramStore.F_COMPRESS( pickle.dumps( {
				'lab' : iLabID,
				'numTunes' : iNumTunes,
				'numCoeff' : iNumCoeff,
				'numCollections' : iNumCollections,
				'meta' : iHistoMeta
			} ) )

		# Return the value/meta tuple
		return (valueData, metaData)

	@staticmethod
	def _unpickle( valueData, metaData ):
		"""
		Unpack the values and metadata from the specified set of packed data
		into a list of InterpolatableCollections.
		"""

		# If we have missing data, return empty array
		if not valueData or not metaData:
			return []

		# Unpack value buffer
		values = np.frombuffer( HistogramStore.F_DECOMPRESS( valueData ) )

		# Unpack metadata
		metaData = pickle.loads( HistogramStore.F_DECOMPRESS( metaData ) )

		# Prepare the response array
		ans = [ ]

		# Extract useful info
		iLabID = metaData['lab']
		iNumTunes =  metaData['numTunes']
		iNumCoeff =  metaData['numCoeff']
		iHistoMeta =  metaData['meta']
		iNumCollections = metaData['numCollections']

		# Start processing histograms
		ofs = 0
		for i in range(0,iNumCollections):

			# Slice tune data
			sTune = values[ ofs : ofs + iNumTunes ]
			ofs += iNumTunes

			# Slice coefficients
			sCoeff = values[ ofs : ofs + iNumCoeff ]
			ofs += iNumCoeff

			# Create and collect histogram collection
			ans.append(InterpolatableCollection(
				dataCoeff=sCoeff, 
				dataMeta=iHistoMeta, 
				tune=Tune.fromLabData(
						iLabID, sTune
					)
				)
			)

		# Return collection
		return ans

	@staticmethod
	def append(collection):
		"""
		Put a histogram in the neighborhood
		"""

		# Require a tune
		if not collection.tune:
			raise ValueError("Missing tune information on the InterpolatableCollection provided!")
		
		# Get neighborhood ID
		nid = collection.tune.getNeighborhoodID()

		# Fetch neighbors from neighborhood
		vBuf = Config.STORE.get("tune-%s:v" % nid)
		mBuf = Config.STORE.get("tune-%s:m" % nid)
		neighbors = HistogramStore._unpickle( vBuf, mBuf )

		# Debug
		print "--[ Appending ]------------"
		print "Size=%i" % len(collection)
		print "Neighbors=%i" % len(neighbors)
		if neighbors:
			print "Neighbor histograms=%i" % len(neighbors[0])
		print "---------------------------"

		# Replace identical indices
		i = 0
		found = False
		for e in neighbors:

			# If tunes match exactly, use the newer data for the interpolation
			if e.tune.equal(collection.tune):
				neighbors[i] = collection
				found = True
				break
			i += 1

		# Append collection to the neighborhood if a
		# simmilar entry was not found.
		if not found:
			neighbors.append(collection)

		# Put neighbors back to the neighborhood store
		vBuf, mBuf = HistogramStore._pickle(neighbors)
		Config.STORE.set("tune-%s:v" % nid, vBuf )
		Config.STORE.set("tune-%s:m" % nid, mBuf )

	@staticmethod
	def getNeighborhood(tune, offset=0):
		"""
		Return the nodes from the given neighborhood
		"""

		# Get neighborhood ID
		nid = tune.getNeighborhoodID(offset=offset)

		vBuf = Config.STORE.get("tune-%s:v" % nid)
		mBuf = Config.STORE.get("tune-%s:m" % nid)

		# Fetch neighbors from neighborhood
		return HistogramStore._unpickle( vBuf, mBuf )

	@staticmethod
	def getInterpolator(tune, function='linear', minSamples=10, maxIterations=10):
		"""
		Return an initialized interpolator instance with the required
		data from the appropriate neighborhoods.

		TODO: Optimize (a lot)
		"""

		# Get neighborhood
		data = HistogramStore.getNeighborhood(tune)

		# If data are underpopulated, fetch neighbor bins
		iterations = 0
		while len(data) < minSamples:
			iterations += 1

			# Collect neighbor samples
			data += HistogramStore.getNeighborhood(tune, offset=iterations)

			# Check if we reached max iterations
			if iterations > maxIterations:
				break

		# Iterate over items and create interpolation indices and data variables
		datavalues = [ ]
		indexvars = [ ]
		for hc in data:

			# Fetch index cariables
			datavalues.append(hc)
			indexvars.append(hc.tune.getValues())


		# Flip matrix of indexvars
		indexvars = np.swapaxes( np.array(indexvars), 0, 1 )

		# Nothing available
		if len(indexvars) == 0:
			return None

		# Create and return interpolator
		return Rbf( *indexvars, data=datavalues, function=function )

