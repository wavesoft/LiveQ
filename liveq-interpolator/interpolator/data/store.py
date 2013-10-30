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
	def _pickle(lst):
		"""
		Converts a collection of HistogramCollections into a buffer
		that can be stored in a key/value store

		The "pickled" result is the buffered contents of a numpy float64 array
		with a metadata header and the histogram data as body. The metadata header
		has the following format:

		+--------+------------------------------------------------+
		| Offset | Description                                    |
		+========+================================================+
		|    0   | Protocol Version (Always 1).                   |
		+--------+------------------------------------------------+
		|    1   | Number of histogram collections in the buffer. |
		+--------+------------------------------------------------+
		|    2   | Number of histograms in each collection.       |
		+--------+------------------------------------------------+
		|    3   | Number of bins in each histogram.              |
		+--------+------------------------------------------------+
		|    4   | Number of histogram parameters in the tune.    |
		+--------+------------------------------------------------+
		|    5   | The index of the lab the tunes are associated. |
		+--------+------------------------------------------------+
		|   ...  | (Tune and data sections of every histogram)    |
		+--------+------------------------------------------------+

		Args:
			o (array) : A set of HistogramCollections objects

		Returns:
			A data chunk that can be converted back to the same input
			using the :func:`_unpickle` function.

		"""

		# If we have nothing as input, return nothing as output
		if not lst:
			return ""

		# Basic sanitization
		if not lst[0].tune:
			raise ValueError("All histogram collections must have a tune configuration assigned!")

		# Get the number of bins of the histogram and the number of parameters in the tune
		numHistos = len(lst[0])
		numBins = lst[0].bins
		numParams = len(lst[0].tune)
		tuneLab = lst[0].tune.labid

		# [Convert all the data into a one-dimentional float64 numpy array]

		# Start by creating the meta-info
		meta = np.array([
				1,			# First parameter	: The protocol version
				len(lst),	# Second parameter 	: The number of histogram collections
				numHistos,	# Third parameter   : The number of histograms in each hollection
				numBins,	# Third parameter 	: The number of bins in the histograms
				numParams,	# Fourth parameter  : The number of tune parameters
				tuneLab		# Fifth parameter 	: The lab ID associated with this tune

			], dtype=np.float64)

		# Then start concatenating the data
		ans = meta
		for c in lst:

			# Validate histogram collection
			if len(c) != numHistos:
				raise ValueError("All histogram collections must have the same number of histograms!")
			if c.bins != numBins:
				raise ValueError("All histogram collections must have the same number of bins!")
			if not c.tune:
				raise ValueError("All histogram collections must have a tune configuration assigned!")
			if len(c.tune) != numParams:
				raise ValueError("All histogram collections must have the same number of tunable parameters!")
			if c.tune.labid != tuneLab:
				raise ValueError("All tunable parameters must belong to the same lab!")

			# Merge tune values and histogram collection data
			ans = np.concatenate((ans, c.tune.getValues(), c.data))

		# Compress buffer
		return HistogramStore.F_COMPRESS( np.getbuffer(ans) )

	@staticmethod
	def _unpickle(dat):
		"""
		TODO: Optimize performance
		"""

		# If we have nothing as input, return empty array
		if not dat:
			return []

		# Decompress and create numpy array from buffer
		dat = np.frombuffer( HistogramStore.F_DECOMPRESS(dat) )

		# Extract metainfo, validating protocol
		numProtocol = int(dat[0])
		if numProtocol != 1:
			raise ValueError("Unsupported protocol version #%i found in the input buffer" % numProtocol)

		# Extract the rest
		numCollections = int(dat[1])
		numHistos = int(dat[2])
		numBins = int(dat[3])
		numParams = int(dat[4])
		tuneLab = int(dat[5])

		# Calculate the size of each histogram collection
		szHistogram = numBins*3 * numHistos

		# Start creating collections
		idx = 5
		ans = []
		for i in range(0,numCollections):

			# Get a reference to the tune parameters
			refTune = dat[idx:idx+numParams]
			idx += numParams

			# Get a reference to the data
			refData = dat[idx:idx+szHistogram]
			idx += szHistogram

			# Create histogram collection
			c = HistogramCollection(data=refData, bins=numBins)

			# Create tune instance
			c.tune = Tune.fromLabData(tuneLab, refTune)

			# Store to response
			ans.append(c)

		# Return response
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
		buf = HistogramStore._pickle(neighbors)
		t_after = int(round(time.time() * 1000))
		print " - Pickle: %i ms" % (t_after - t_before)

		print " - Buf: %i" % len(buf)
		t_before = int(round(time.time() * 1000))
		Config.STORE.set("tune-" + nid, buf )
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
	def getInterpolator(tune):
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
		#indexvars = np.array(indexvars)

		print "Check: %i == %i" % (len(datavalues), len(indexvars[0]))

		# Create and return interpolator
		return Rbf( *indexvars, data=datavalues )

