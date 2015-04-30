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

import traceback

from liveq.utils.FLAT import FLATParser
from liveq.data.histo import Histogram
from liveq.data.histo.interpolate import InterpolatableCollection

class IntermediateHistogramCollection(dict):
	"""
	A class that provides a unified interface access to the generated histograms.
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
		self.state = int(state)

	def append(self, ihisto):
		"""
		Append an object in the collection and map them with their name
		"""

		# Store histogram by it's name
		self[ihisto.name] = ihisto

	@staticmethod
	def fromTarfile(tarObject, state=1):
		"""
		Create an IntermediateHistogramCollection from an MCPlots job tarfile.
		The first paramter must be a reference to an already open tarfile object
		"""

		# Prepare collection
		ans = IntermediateHistogramCollection()

		# Read relevant entries
		for fn in tarObject.getnames():

			# Get only generator data objects (contain the name 'pythia' in path)
			if (not 'pythia' in fn) or (not fn.endswith(".dat")):
				continue

			# Try to load histogram by the file object
			fInst = tarObject.extractfile(fn)
			try:
				histo = IntermediateHistogram.fromFLAT( fInst )
				fInst.close()
			except Exception as e:
				fInst.close()
				logging.error("Exception while loading file %s (%s)" % (tarObject.name, str(e)))
				continue

			# Report errors
			if histo == None:
				logging.error("Unable to load intermediate histogram from %s:%s" % (tarObject.name, fn))
			else:
				ans[histo.name] = histo

		# Store state
		ans.state = state

		# Return collection
		return ans

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
			# that also have a .params file (theoretical data). Everything 
			# else is reference data or parameters.
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

			# Skip files that have gone away in the meantime
			if not os.path.isfile(ffile):
				logging.error("File has gone away %s" % ffile)
				continue

			# Try to loag the given histogram
			try:
				histo = IntermediateHistogram.fromFLAT( ffile )
			except Exception as e:
				logging.error("Exception while loading file %s" % ffile)
				continue

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
	def fromPack(buf, decompress=True, decode=True):
		"""
		The reverse function of pack() that reads the packed data 
		and re-creates the IntermediateHistogramCollection object
		"""

		# Decode and decompress
		if decode:
			buf = base64.b64decode(buf)
		if decompress:
			buf = IntermediateHistogramCollection.F_DECOMPRESS( buf )

		# Get version, histogram count and state
		(ver, numHistos, state) = struct.unpack("<BIB", buf[:6])
		p = 6

		# Validate protocol version
		if ver != 1:
			raise ValueError("The protocol version %i is not supported for unpacking IntermediateHistogramCollection" % version)

		# Start parsing histograms
		ans = IntermediateHistogramCollection()
		for i in range(numHistos):

			# Read histogram header
			(hBins, hNevts, hXS, hNameLen) = struct.unpack("<ILdB", buf[p:p+17])
			p += 17

			# Read histogram name
			hName = buf[p:p+hNameLen]
			p += hNameLen

			# Read the numpy buffers
			npBufferLen = 8 * 8 * hBins
			npBuffer = numpy.frombuffer( buf[p:p+npBufferLen], dtype=numpy.float64 )
			npBuffer.setflags(write=True)
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

	@staticmethod
	def fromPackFile(filename, decompress=True, decode=True):
		"""
		The read a packed dataset from the specified file
		"""

		# Open file
		with open(filename, 'rb') as f:

			# Read and unpack
			return IntermediateHistogramCollection.fromPack( f.read() )

	def pack(self, encode=True, compress=True):
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

		/!\ Note: This buffer is NOT 64-bit aligned!
		"""

		# Format values
		if self.state == None:
			self.state = 0
		
		# Prepare buffer
		buf = struct.pack("<BIB", 1, len(self), int(self.state))

		# Start packing data
		for histo in self.values():

			# Put histogram header
			buf += struct.pack("<ILdB", 
					histo.bins,
					histo.nevts,
					histo.crosssection,
					len(histo.name)
				)
			buf += str( histo.name )

			# Put histogram data
			npbuf = numpy.concatenate([
					histo.xlow, histo.xfocus, histo.xhigh,
					histo.Entries, histo.SumW, histo.SumW2,
					histo.SumXW, histo.SumX2W
				])
			buf += str( numpy.getbuffer( npbuf ) )

		# Compress & encode
		if compress:
			buf = IntermediateHistogramCollection.F_COMPRESS( buf )
		if encode:
			buf = base64.b64encode(buf)

		# Return buffer
		return buf

	def packToFile(self, filename, encode=True, compress=True):
		"""
		Pack and store to the specified file
		"""

		# Open file
		with open(filename, 'wb') as f:

			# Dump
			f.write( self.pack(encode, compress) )


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

	def toInterpolatableCollection(self, tune, histograms=None, fitDegree=None):
		"""
		Convert the intermediate histogram into a collection that can be interpolated

		Optionally, you can specify only a subset of histograms to convert.
		"""

		# Create histogram collection with the given tune
		# as tune reference.
		ans = InterpolatableCollection( tune=tune )

		# Pile-up the histograms
		for k,hist in self.iteritems():
			if (not histograms) or (k in histograms):
				ans.append( hist.toHistogram() )

		# Generate fits for interpolation
		ans.regenFits(fitDegree=fitDegree)

		# Return answer
		return ans

	def countEvents(self):
		"""
		Summarize the total number of events in the histograms
		"""

		# Find a histogram with event information
		for hist in self.values():
			if hist.nevts > 0:
				return hist.nevts

		# Return 
		return 0


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
		if (xlow is None):
			self.xlow = numpy.zeros(self.bins)
		self.xfocus=xfocus
		if (xfocus is None):
			self.xfocus = numpy.zeros(self.bins)
		self.xhigh=xhigh
		if (xhigh is None):
			self.xhigh = numpy.zeros(self.bins)
		self.Entries=Entries
		if (Entries is None):
			self.Entries = numpy.zeros(self.bins)
		self.SumW=SumW
		if (SumW is None):
			self.SumW = numpy.zeros(self.bins)
		self.SumW2=SumW2
		if (SumW2 is None):
			self.SumW2 = numpy.zeros(self.bins)
		self.SumXW=SumXW
		if (SumXW is None):
			self.SumXW = numpy.zeros(self.bins)
		self.SumX2W=SumX2W
		if (SumX2W is None):
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

	def rebinWithRef(self, referenceHistogram):
		"""
		Re-bin the histogram (if needed) using the reference histogram specified
		"""

		# We should cap the bins to the reference histogram bins
		refX = referenceHistogram.x
		refXMin = referenceHistogram.xErrMinus
		refXPls = referenceHistogram.xErrPlus
		refBins = referenceHistogram.bins

		# Cap edges
		# TODO: Assume edges match

		print " - Rebinning %s:" % self.name,

		# If same number of bins, we don't have to do anything
		if refBins == self.bins:
			print "[Match]"
			return

		# Handle cases where we just empty the histogram
		if (refBins == 0) and (self.bins != 0):
			# Empty bins
			self.bins = 0
			self.clear()
			print "[Emptied]"
			return

		# Handle cases where we previously had no bins
		if (self.bins == 0) and (refBins != 0):
			# Create blank bins
			self.bins = refBins
			self.clear()
			print "[Defined c=%i]"
			return

		# Distribute bins
		i = 0; j = 0; mFrom = None; mTo = None
		while i < refBins:

			# Reference bin edges
			r0 = refX[i] - refXMin[i]
			r1 = refX[i] + refXPls[i]

			# The matching bin edges
			x0 = self.xlow[j]
			x1 = self.xhigh[j]

			# Match beginning if we don't have one
			if (mFrom is None) and (r0 == x0):
				mFrom = [i, j]

			# Inner loop
			if not (mFrom is None):
				while j < self.bins:

					# The matching bin edges
					x0 = self.xlow[j]
					x1 = self.xhigh[j]

					# If the high edge is higher than the
					# reference high edge, continue with
					# the outer loop
					if x1 > r1:
						break

					# Match ending if we don't have one
					if (mTo is None) and (r1 == x1):
						mTo = [i, j]

						# Check if we need to remap
						if (mTo[1] != mFrom[1]) or (mTo[0] != mFrom[0]):

							# Expand or divide?
							if (mTo[1]-mFrom[1]) > (mTo[0]-mFrom[0]):
								print "[Merge %i,%i to %i,%i]" % (mFrom[0], mFrom[1], mTo[0], mTo[1]),

								# Merge bins {mFrom[1] - mTo[1]} in order to fit
								# the edges of bins {mFrom[0] - mTo[0]}

								k0 = self.xlow[mFrom[1]]
								k1 = self.xhigh[mTo[1]]
								#print " - Edges: %f - %f" % (k0, k1)

								# Merge entries
								m_Entries = []
								m_SumW = []
								m_SumW2 = []
								m_SumXW = []
								m_SumX2W = []

								# Collect entry values
								for k in range(mFrom[1], mTo[1]+1):
									#print " - Collect %i" % k
									m_Entries.append( self.Entries[k] )
									m_SumW.append( self.SumW[k] )
									m_SumW2.append( self.SumW2[k] )
									m_SumXW.append( self.SumXW[k] )
									m_SumX2W.append( self.SumX2W[k] )

								# Update edge bins
								s = mFrom[1]; e = mTo[1]; l = e-s+1
								#print "Merge: %r" % m_Entries
								self.Entries[s] = numpy.sum( m_Entries )
								self.SumW[s] = numpy.sum( m_SumW )
								self.SumW2[s] = numpy.sum( m_SumW2 )
								self.SumXW[s] = numpy.sum( m_SumXW )
								self.SumX2W[s] = numpy.sum( m_SumX2W )

								#print " - Merge to %i" % s

								# Update bin edge and focus
								#print " - Left edge (%f) should be %f" % (self.xlow[s], k0)
								#print " - Right edge from %f to %f" % (self.xhigh[s], k1)
								self.xhigh[s] = k1
								#print " - Focus point from %f to %f" % (self.xfocus[s], (k0+k1)/2.0)
								self.xfocus[s] = (k0+k1)/2.0

								# Delete intermediate entries
								for k in range(mFrom[1]+1, mTo[1]+1):
									#print " - Delete & lshift %i" % k
									self.xlow = numpy.delete( self.xlow, k)
									self.xfocus = numpy.delete( self.xfocus, k)
									self.xhigh = numpy.delete( self.xhigh, k)
									self.Entries = numpy.delete( self.Entries, k)
									self.SumW = numpy.delete( self.SumW, k)
									self.SumW2 = numpy.delete( self.SumW2, k)
									self.SumXW = numpy.delete( self.SumXW, k)
									self.SumX2W = numpy.delete( self.SumX2W, k)

									# Shift trim indices
									self.bins -= 1
									j -= 1

							else:

								# Split bins {mFrom[1] - mTo[1]} in order to match
								# the sub-bins from {mFrom[0] - mTo[0]}
								print "Divide %i,%i to %i,%i" % (mFrom[0], mFrom[1], mTo[0], mTo[1])

								# Currently not implemented
								raise ValueError("Dividing bins is not currently supported!")


						# Reset
						mFrom = [i+1,j+1]
						mTo = None

						# Continue
						j += 1
						break

					# Continue with next
					j += 1

			# Continue with next
			i += 1
			
		print ""

	def toHistogram(self):
		"""
		Convert the intermediate histogram into a histogram
		"""

		xval = self.xlow + self.xhigh
		xval /= 2.0

		# Update metadata
		self.meta['nevts'] = self.nevts
		self.meta['crosssection'] = self.crosssection

		return Histogram(
				name=self.name,
				bins=self.bins,
				meta=self.meta,

				# X Values
				x=xval,
				xErrMinus=(xval-self.xlow).flatten(),
				xErrPlus=(self.xhigh-xval).flatten(),

				# Y Values
				y=self.height(),
				yErrMinus=self.error(),
				yErrPlus=self.error()

			)

	@staticmethod
	def empty(name):
		"""
		Create an empty intermediate histogram witih the given name
		"""

		# Return an empty histogram
		return IntermediateHistogram(name=name)

	@staticmethod
	def fromFLAT(filename):
		"""
		Create an intermediate histogram by reading the specified FLAT file
		"""

		# Parse into structures depending on if file is a string
		# or a file object
		if isinstance(filename, str) or isinstance(filename, unicode):
			data = FLATParser.parse(filename)
		else:
			data = FLATParser.parseFileObject(filename)

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

		# Get LogY from PLOT
		logY = False
		if 'PLOT' in data:
			if 'LogY' in data['PLOT']['d']:
				logY = (int(data['PLOT']['d']['LogY']) == 1)
		vMeta['logY'] = logY

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

