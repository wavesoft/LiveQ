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

import os
import json
import logging
import struct
import numpy
import glob

import bz2
import pylzma
import base64

from liveq.utils.FLAT import FLATParser
from liveq.data.histo import Histogram

class InterpolatableCollection(list):
	"""
	A collection of histograms that only keeps the histogram fits instead
	of the real bin values.

	This class is optimized for use by the interpolator. 
	"""

	# Overridable default compression function for packing
	F_COMPRESS = pylzma.compress
	F_DECOMPRESS = pylzma.decompress

	def __init__(self, dataCoeff=None, dataMeta=None, tune=None):
		"""
		Initialize the histogram collection
		"""

		# Initialize histogram
		list.__init__(self)

		#: Histogram coefficients
		self.dataCoeff = dataCoeff

		#: Histogram metadata
		self.dataMeta = dataMeta

		# If we have coefficients and metadata, run the set function
		if dataCoeff != None and dataMeta != None:
			self.set(dataCoeff, dataMeta)

		#: Tune index
		self.tune = tune

		# Mark us as not in update
		self.updating = False

		# Intermediate array to store histograms that will
		# be completed upon endUpdate
		self._limboHistos = [ ]


	def set(self, dataCoeff, dataMeta):
		"""
		Re-generate histograms based on coefficients and histogram metadata
		TODO: Optimize
		"""

		# Validate
		if type(dataCoeff) != list and type(dataCoeff) != numpy.ndarray:
			raise ValueError("The dataCoeff parameter is not a list!")
		if type(dataMeta) != list:
			raise ValueError("The dataMeta parameter is not a list!")

		# Reset list
		del self[:]

		# Update local reference
		self.dataCoeff = dataCoeff
		self.dataMeta = dataMeta

		# Calculate coefficient slice width
		w = len(dataCoeff) / len(dataMeta)

		# Rebuild histograms
		ofs=0
		for meta in dataMeta:

			# Fetch coefficient slice and forward to next
			coeff = dataCoeff[ofs:ofs+w]
			ofs += w

			# Create and store histogram
			list.append(self, Histogram.fromFit( coeff, meta ) )


	def beginUpdate(self, fnMetaValidate=None):
		"""
		Flush contents and start updating histogram store
		"""
		# Sanity checks
		if self.updating:
			raise RuntimeError("Please call beginUpdate() only once!")

		# Reset
		self.dataCoeff = [ ]
		self.dataMeta = [ ]

		# Reset list
		del self[:]

		# Mark us as under update
		self.updating = True

	def endUpdate(self):
		"""
		Bind histogram values 
		"""

		# Sanity checks
		if not self.updating:
			raise RuntimeError("Please call beginUpdate() before changing the InterpolatableCollection!")
	
		# Prepare dataCoeff array
		dataCoeff = [ ]

		# Sort histograms by name
		self._limboHistos.sort(key=lambda histo: histo.name)

		# Process histograms in limbo
		for histogram in self._limboHistos:

			# Append histogram instance on refs
			list.append(self, histogram)

			# Append histogram coefficients on data coefficients
			coeff, meta = histogram.polyFit()
			dataCoeff.append( coeff )
			self.dataMeta.append( meta )

		# Convert to coefficients to numpy array
		self.dataCoeff = numpy.array( dataCoeff, dtype=numpy.float64 ).flatten()

	def append(self, histogram):
		"""
		Append a histogram 
		"""

		# Sanity checks
		if not self.updating:
			raise RuntimeError("Please call beginUpdate() before changing the InterpolatableCollection!")

		# Store histogram in libmo
		self._limboHistos.append(histogram)

	def equal(self, collection):
		"""
		Check if the collections is equal to the one specified
		"""

		# Ensure tunes are the same
		if (collection.tune != None) and (self.tune != None):
			if not collection.tune.equal( self.tune ):
				print "!!! Collection tunes not equal"
				return False

		# Make sure histos are the same
		for i in range(0,len(self)):
			# If we are not the same return false
			if not collection[i].equal( self[i] ):
				print "!!! Histogram %i in collection not matching" % i
				return False

		# Return histograms
		return True

	@staticmethod
	def fromPack( data ):
		"""
		The reverse function of pack() that reads the packed data 
		and re-creates the InterpolatableCollection object
		"""

		# Decode and decompress
		buf = InterpolatableCollection.F_DECOMPRESS( base64.b64decode( data ) )

		# Get version, histogram count and state
		(ver, lenCoef, lenMeta) = struct.unpack("!BII", buf[:9])
		p = 9

		# Fetch coefficients from numpy buffer
		dataCoeff = numpy.frombuffer( buf[p:p+lenCoef], dtype=numpy.float64 )
		p += lenCoef

		# Unpickle dictionary
		dataMeta = pickle.loads( buf[p:p+lenMeta] )
		p += lenMeta

		# Return histogram
		return InterpolatableCollection( dataCoeff=dataMeta, dataMeta=dataMeta )

	def pack(self):
		"""
		Generate a packed version of the data that can be streamed
		over network.

		Buffer format:

		/ Header
		+--------+-------------------------------------------+
		|  uchar | Protocol version (current: 1)             |
		|  uint  | Pickled metadata size                     |
		|  uint  | Numpy Float64 buffer size                 |
		+--------+-------------------------------------------+
		/ Coefficients
		+--------+-------------------------------------------+
		|   ..   | float64 numpy buffer                      |
		+--------+-------------------------------------------+
		/ Metadata
		+--------+-------------------------------------------+
		|   ..   | Pickled dictionary metadata               |
		+--------+-------------------------------------------+

		/!\ Note: This buffer is NOT 64-bit aligned!
		"""

		# Prepare buffers
		buf_coef = numpy.getbuffer( self.dataCoeff )
		buf_meta = pickle.dumps( self.dataMeta )

		# Build, compress and encode buffer
		return base64.b64encode( InterpolatableCollection.F_COMPRESS(
				struct.pack("<BII", 1, len(buf_coef), len(buf_meta)) + buf_coef + buf_meta
			))
