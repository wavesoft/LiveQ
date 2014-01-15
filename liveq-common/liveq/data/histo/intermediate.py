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
import numpy

from liveq.utils.FLAT import FLATParser
from liveq.data.histo import Histogram

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

		# Import values from the constructor
		self.xlow=xlow
		self.xfocus=xfocus
		self.xhigh=xhigh
		self.Entries=Entries
		self.SumW=SumW
		self.SumW2=SumW2
		self.SumXW=SumXW
		self.SumX2W=SumX2W

		# Reset bin values if we have
		# at least one missing parameter
		if (xlow == None) or (xfocus == None) or (xhigh == None) or (Entries == None) or (SumW == None) or (SumW2 == None) or (SumXW == None) or (SumX2W == None):
			self.clear()

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

