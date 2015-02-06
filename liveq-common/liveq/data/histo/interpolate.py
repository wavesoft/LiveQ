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

import cPickle as pickle
import bz2
import pylzma
import base64

from liveq.utils.FLAT import FLATParser
from liveq.data.histo import Histogram

class InterpolatableCollection(dict):
	"""
	A collection of histograms that only keeps the histogram fits instead
	of the real bin values.

	This class is optimized for use by the interpolator. 
	"""

	# Overridable default compression function for packing
	F_COMPRESS = pylzma.compress
	F_DECOMPRESS = pylzma.decompress

	def __init__(self, tune=None, dataCoeff=None, dataMeta=None):
		"""
		Initialize the histogram collection
		"""

		# Initialize histogram
		dict.__init__(self)

		#: Tune index
		self.tune = tune

		#: The data coefficients
		self.dataCoeff = dataCoeff

		#: The metadata
		self.dataMeta = dataMeta

	def append(self, ihisto):
		"""
		Append an object in the collection and map them with their name
		"""

		# Store histogram by it's name
		self[ihisto.name] = ihisto

	def regenHistograms( self, histograms=None ):
		"""
		(Re)generate the histograms from the dataCoeff and dataMeta

		Optionally you can specify only a subset of histograms to re-generate
		"""

		# Validate
		if type(self.dataCoeff) != list and type(self.dataCoeff) != numpy.ndarray:
			raise ValueError("The dataCoeff parameter is not a list!")
		if type(self.dataMeta) != list:
			raise ValueError("The dataMeta parameter is not a list!")

		# Create collection
		self.clear()

		# Calculate coefficient slice width
		w = len(self.dataCoeff) / len(self.dataMeta)

		# Rebuild histograms
		ofs=0
		for meta in self.dataMeta:

			# Skip histogram if we were not asked to process it
			if histograms and (not meta['name'] in histograms):
				continue

			# Fetch coefficient slice and forward to next
			coeff = self.dataCoeff[ofs:ofs+w]
			ofs += w

			# Create and store histogram
			histo = Histogram.fromFit( coeff, meta )
			self[histo.name] = histo

	def regenFits( self, histograms=None ):
		"""
		(Re)generate dataCoeff and dataMeta from Histograms

		Optionally you can specify only a subset of histograms to fit
		"""
	
		# Prepare response arrays
		dataCoeff = [ ]
		self.dataMeta = [ ]

		# Get histogram names if histograms is missing
		if not histograms:
			histograms = self.keys()

		# Sort keys
		histograms.sort()

		# Process histograms in array
		for hname in histograms:

			# Fit histogram
			coeff, meta = self[hname].polyFit()

			# Skip buggy histograms
			if coeff is None:
				logging.warn("Could not calculate fits for histogram %s" % hname)
				continue

			# Append histogram coefficients on data coefficients
			dataCoeff.append( coeff )
			self.dataMeta.append( meta )

		# Convert to coefficients to numpy array and return 
		# the mix of dataCoeff / dataMeta
		self.dataCoeff = numpy.array( dataCoeff, dtype=numpy.float64 ).flatten()

	@staticmethod
	def fromPack( buf, decompress=True, decode=True ):
		"""
		The reverse function of pack() that reads the packed data 
		and re-creates the InterpolatableCollection object
		"""

		# Decode and decompress
		if decode:
			buf = base64.b64decode( buf )
		if decompress:
			buf = InterpolatableCollection.F_DECOMPRESS( buf )

		# Get version, histogram count and state
		(ver, lenCoef, lenMeta) = struct.unpack("<BII", buf[:9])
		p = 9

		# Create interpolatable collection
		ic = InterpolatableCollection()

		# Fetch coefficients from numpy buffer
		ic.dataCoeff = numpy.frombuffer( buf[p:p+lenCoef], dtype=numpy.float64 )
		p += lenCoef

		# Unpickle dictionary
		kvdata = pickle.loads( buf[p:p+lenMeta] )
		ic.dataMeta = kvdata['meta']
		ic.tune = kvdata['tune']
		p += lenMeta

		# Return histogram
		return ic

	def pack(self, compress=True, encode=True):
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
		buf_coef = str(numpy.getbuffer( self.dataCoeff ))
		buf_meta = str(pickle.dumps( { "meta":self.dataMeta, "tune":self.tune } ))

		# Build buffer
		buf = struct.pack("<BII", 1, len(buf_coef), len(buf_meta)) + buf_coef + buf_meta

		# Decode and decompress
		if compress:
			buf = InterpolatableCollection.F_COMPRESS( buf )
		if encode:
			buf = base64.b64encode( buf )

		# Return buffer
		return buf
