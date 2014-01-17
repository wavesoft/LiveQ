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

class IntermediateHistogramCollection(dict):
	"""
	A class that provides a unified interface access to the generated histograms
	"""

	# Overridable default compression function for packing
	F_COMPRESS = pylzma.compress
	F_DECOMPRESS = pylzma.decompress

	def __init__(self, state=0):
		"""
		Initialize the IntermediateHistogramCollection
		"""
		# Initialize parent class
		dict.__init__(self)
		# Set state
		self.state = state

	def append(self, ihisto):
		"""
		Append an object in the collection and map them with their name
		"""

		# Store histogram by it's name
		self[ihisto.name] = ihisto

	@staticmethod
	def fromDirectory(baseDir, state=1, recursive=False):
		"""
		Create an IntermediateHistogramCollection from the contents of the specified directory.
		The optional parameter 'state' is used by the user and is preserved by the packing function.
		"""

		# Find FLAT files
		if recursive:

			# Prepare response
			flatFiles = []

			# Recursively walk base dir and collect only the .dat files
			# that also have a .params file. Everything else is reference
			# data or junk
			for root, dirs, files in os.walk(baseDir):
			    for f in files:
			    	if f.endswith(".dat"):
			    		if ("%s.params" % f[:-4]) in files:
			    			flatFiles.append( os.path.join( root, f ) )
			
		else:

			# Otherwise, run a flat glob
			flatFiles = glob.glob("%s/*.dat" % baseDir)

		# Prepare collection
		ans = IntermediateHistogramCollection()
		for ffile in flatFiles:

			# Try to loag the given histogram
			histo = IntermediateHistogram.fromFLAT( ffile )

			# Report errors
			if histo == None:
				logging.error("Unable to load intermediate histogram from %s" % ffile)
			else:
				ans[histo.name] = histo

		# Store state
		ans.state = state

		# Return collection
		return ans

	@staticmethod
	def fromPack(data):
		"""
		The reverse function of pack() that reads the packed data 
		and re-creates the IntermediateHistogramCollection object
		"""
		
		# Decode and decompress
		buf = IntermediateHistogramCollection.F_DECOMPRESS( base64.b64decode( data ) )

		# Get version, histogram count and state
		(ver, numHistos, state) = struct.unpack("!BIB", buf[:6])
		p = 6

		# Validate protocol version
		if ver != 1:
			raise ValueError("The protocol version %i is not supported for unpacking IntermediateHistogramCollection" % version)

		# Start parsing histograms
		ans = IntermediateHistogramCollection()
		for i in range(numHistos):

			# Read histogram header
			(hBins, hNevts, hXS, hNameLen) = struct.unpack("!ILdB", buf[p:p+17])
			p += 17

			# Read histogram name
			hName = buf[p:p+hNameLen]
			p += hNameLen

			# Read the numpy buffers
			npBufferLen = 8 * 8 * hBins
			npBuffer = numpy.frombuffer( buf[p:p+npBufferLen], dtype=numpy.float64 )
			p += npBufferLen

			# Create histogram
			ans[hName] = IntermediateHistogram(
					name=hName,
					bins=hBins,
					meta={
						'nevts': hNevts,
						'crosssection': hXS
					},
					xlow=npBuffer[:hBins],
					xfocus=npBuffer[hBins:hBins*2],
					xhigh=npBuffer[hBins*2:hBins*3],
					Entries=npBuffer[hBins*3:hBins*4],
					SumW=npBuffer[hBins*4:hBins*5],
					SumW2=npBuffer[hBins*5:hBins*6],
					SumXW=npBuffer[hBins*6:hBins*7],
					SumX2W=npBuffer[hBins*7:],
				)

		# Store state
		ans.state = state

		# Return answer
		return ans

	def pack(self):
		"""
		Generate a packed version of the data that can be streamed
		over network.

		Buffer format:

		/ Header
		+--------+-------------------------------------------+
		|  uchar | Protocol version (current: 1)             |
		|  uint  | Number of histograms in the file          |
		|  uchar | The collection state (user-defined)       |
		+--------+-------------------------------------------+
		/ Histogram
		+--------+-------------------------------------------+
		|  uint  | Number of bins in histogram               |
		|  ulong | The number of events in the histogram     |
		| double | The crosssection of the histogram         |
		|  uchar | Length of histogram name                  |
		|  char* | The histogram name                        |
		|   ..   | 8x bin-sized float64 numpy buffers        |
		+--------+-------------------------------------------+
		"""
		
		# Prepare buffer
		buf = struct.pack("!BIB", 1, len(self), self.state)

		# Start packing data
		for histo in self.values():

			# Put histogram header
			buf += struct.pack("!ILdB", 
					histo.bins,
					histo.nevts,
					histo.crosssection,
					len(histo.name)
				)
			buf += histo.name

			# Put histogram data
			npbuf = numpy.concatenate([
					histo.xlow, histo.xfocus, histo.xhigh,
					histo.Entries, histo.SumW, histo.SumW2,
					histo.SumXW, histo.SumX2W
				])
			buf += str( numpy.getbuffer( npbuf ) )

		# Compress & encode
		return base64.b64encode( IntermediateHistogramCollection.F_COMPRESS( buf ) )

	def subset(self, names):
		"""
		Create a subset of the given histogram collection, keeping only the histograms that
		match the names in the array provided
		"""

		# Create new, empty collection
		ans = IntermediateHistogramCollection(state=self.state)

		# Start copying the histograms we want
		for n in names:
			if n in self:
				ans[n] = self[n]

		# Return answer
		return ans


class IntermediateHistogram:
	"""
	A histogram class that contains additional statistical information used for merging
	intermediate data.
	"""

	def __init__(self, name="", bins=0, meta={}, xlow=None, xfocus=None, xhigh=None, Entries=None, SumW=None, SumW2=None, SumXW=None, SumX2W=None):
		"""
		Initialize the data of the intermediate histogram
		"""
		self.type = "HISTOSTATS"
		self.bins = bins
		self.name = name
		self.meta = meta

		# Extract useful info from metadata
		self.nevts = 0
		if 'nevts' in meta:
			self.nevts = int(meta['nevts'])
		self.crosssection = 0.0
		if 'crosssection' in meta:
			self.crosssection = float(meta['crosssection'])

		# Import values from the constructor or use defaults
		self.xlow=xlow
		if (xlow == None):
			self.xlow = numpy.zeros(self.bins)
		self.xfocus=xfocus
		if (xfocus == None):
			self.xfocus = numpy.zeros(self.bins)
		self.xhigh=xhigh
		if (xhigh == None):
			self.xhigh = numpy.zeros(self.bins)
		self.Entries=Entries
		if (Entries == None):
			self.Entries = numpy.zeros(self.bins)
		self.SumW=SumW
		if (SumW == None):
			self.SumW = numpy.zeros(self.bins)
		self.SumW2=SumW2
		if (SumW2 == None):
			self.SumW2 = numpy.zeros(self.bins)
		self.SumXW=SumXW
		if (SumXW == None):
			self.SumXW = numpy.zeros(self.bins)
		self.SumX2W=SumX2W
		if (SumX2W == None):
			self.SumX2W = numpy.zeros(self.bins)

	def clear(self):
		"""
		Reset the values of the bins
		"""

		# Reset bin values
		self.xlow = numpy.zeros(self.bins)
		self.xfocus = numpy.zeros(self.bins)
		self.xhigh = numpy.zeros(self.bins)
		self.Entries = numpy.zeros(self.bins)
		self.SumW = numpy.zeros(self.bins)
		self.SumW2 = numpy.zeros(self.bins)
		self.SumXW = numpy.zeros(self.bins)
		self.SumX2W = numpy.zeros(self.bins)

		# Reset profile
		self.isProfile = False
		self.SumYW = numpy.zeros(self.bins)
		self.SumY2W = numpy.zeros(self.bins)
		self.SumY2W2 = numpy.zeros(self.bins)

	def equals(self, h):
		"""
		Return true if we are equal to h
		"""

		TOLLERANCE = 1e-5

		v = numpy.abs( self.xlow - h.xlow )
		if numpy.any(v > TOLLERANCE):
			logging.warn(" ! xlow mismatch: %f/%f" % ( numpy.min(v), numpy.max(v) ))
			return False
		v = numpy.abs( self.xfocus - h.xfocus )
		if numpy.any(v > TOLLERANCE):
			logging.warn(" ! xfocus mismatch: %f/%f" % ( numpy.min(v), numpy.max(v) ))
			return False
		v = numpy.abs( self.xhigh - h.xhigh )
		if numpy.any(v > TOLLERANCE):
			logging.warn(" ! xhigh mismatch: %f/%f" % ( numpy.min(v), numpy.max(v) ))
			return False
		v = numpy.abs( self.Entries - h.Entries )
		if numpy.any(v > TOLLERANCE):
			logging.warn(" ! Entries mismatch: %f/%f" % ( numpy.min(v), numpy.max(v) ))
			return False
		v = numpy.abs( self.SumW - h.SumW )
		if numpy.any(v > TOLLERANCE):
			logging.warn(" ! SumW2 mismatch: %f/%f" % ( numpy.min(v), numpy.max(v) ))
			return False
		v = numpy.abs( self.SumW2 - h.SumW2 )
		if numpy.any(v > TOLLERANCE):
			logging.warn(" ! SumXW mismatch: %f/%f" % ( numpy.min(v), numpy.max(v) ))
			return False
		v = numpy.abs( self.SumXW - h.SumXW )
		if numpy.any(v > TOLLERANCE):
			logging.warn(" ! SumX2W mismatch: %f/%f" % ( numpy.min(v), numpy.max(v) ))
			return False
		v = numpy.abs( self.SumX2W - h.SumX2W )
		if numpy.any(v > TOLLERANCE):
			logging.warn(" ! SumX2W mismatch: %f/%f" % ( numpy.min(v), numpy.max(v) ))
			return False

		# All parameters passed the tollerance check
		return True


	def width(self):
		"""
		Return the bin widths
		"""
		return self.xhigh - self.xlow

	def height(self):
		"""
		Calculate the height of all bins
		"""
		return self.SumW / self.width()

	def error(self):
		"""
		Calculate the errors of all bins
		"""
		return numpy.sqrt( self.SumW2 ) / self.width()

	def toHistogram(self):
		"""
		Convert the intermediate histogram into a histogram
		"""

		xval = (self.xlow+self.xhigh)/2,

		return Histogram(
				name=self.name,
				bins=self.bins,
				meta=self.meta,

				# X Values
				x=xval,
				xErrMinus=xval-self.xlow,
				xErrPlus=self.xhigh-xval,

				# Y Values
				y=self.height(),
				yErrMinus=self.error(),
				yErrPlus=self.error()

			)

	@staticmethod
	def fromFLAT(filename):
		"""
		Create an intermediate histogram by reading the specified FLAT file
		"""

		# Parse into structures
		data = FLATParser.parse(filename)

		# Ensure we got at least a HISTOSTATS
		if not 'HISTOSTATS' in data:
			return None

		# Get some metrics
		vBins = data['HISTOSTATS']['v']
		numBins = len(vBins)
		numValues = len(vBins[0])

		# Get metadata dictionary
		vMeta = { }
		if 'METADATA' in data:
			vMeta = data['METADATA']['d']

		# Get histogram name
		name = data['HISTOSTATS']['d']['AidaPath']

		# Convert values into a flat 2D numpy array
		values = numpy.array(vBins, dtype=numpy.float64).flatten()

		# Extract parts and build histogram
		return IntermediateHistogram(
				name=name,
				bins=numBins,
				meta=vMeta,
				xlow=values[::8],
				xfocus=values[1::8],
				xhigh=values[2::8],
				Entries=values[3::8],
				SumW=values[4::8],
				SumW2=values[5::8],
				SumXW=values[6::8],
				SumX2W=values[7::8]
			)

