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
from liveq.data.histo import HistogramCollection

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
		Converts a collection of HistogramCollections into two buffers
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
		into a list of HistogramCollections.
		"""

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
			ans.append(HistogramCollection(
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
	def append(tune, collection):
		"""
		Put a histogram in the neighborhood
		"""
		
		# Get neighborhood ID
		nid = tune.getNeighborhoodID()

		# Fetch neighbors from neighborhood
		print " - Key: %s" % nid

		t_before = int(round(time.time() * 1000))
		ibuf = Config.STORE.get("tune-" + nid)
		t_after = int(round(time.time() * 1000))
		print " - Fetch: %i ms" % (t_after - t_before)

		if ibuf == None:
			print " - I.Buf: NONE"
		else:
			print " - I.Buf: %i" % len(ibuf)

		t_before = int(round(time.time() * 1000))
		neighbors = HistogramStore._unpickle( ibuf )
		t_after = int(round(time.time() * 1000))
		print " - Unpickle: %i ms" % (t_after - t_before)

		print " - Entries: %i" % len(neighbors)

		# Append collection to the neighborhood
		collection.tune = tune
		neighbors.append(collection)

		# Put neighbors back to the neighborhood store
		t_before = int(round(time.time() * 1000))
		vBuf, mBuf = HistogramStore._pickle(neighbors)
		t_after = int(round(time.time() * 1000))
		print " - Pickle: %i ms" % (t_after - t_before)

		print " - Buf: %i" % len(vBuf)
		t_before = int(round(time.time() * 1000))
		Config.STORE.set("tune-%s:v" % nid, vBuf )
		Config.STORE.set("tune-%s:m" % nid, mBuf )
		t_after = int(round(time.time() * 1000))
		print " - Store: %i ms" % (t_after - t_before)

	@staticmethod
	def getNeighborhood(tune):
		"""
		Return the nodes from the given neighborhood
		"""

		# Get neighborhood ID
		nid = tune.getNeighborhoodID()

		# Fetch neighbors from neighborhood
		return HistogramStore._unpickle( Config.STORE.get("tune-" + nid) )

	@staticmethod
	def getInterpolator(tune, function='linear'):
		"""
		Return an initialized interpolator instance with the required
		data from the appropriate neighborhoods.

		TODO: Optimize (a lot)
		"""

		# Get neighborhood
		data = HistogramStore.getNeighborhood(tune)

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

		#indexvars = np.array(indexvars)

		#print "Check: %i == %i" % (len(datavalues), len(indexvars[0]))

		# Create and return interpolator
		return Rbf( *indexvars, data=datavalues, function=function )

