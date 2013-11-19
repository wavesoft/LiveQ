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
import xml.etree.cElementTree as eTree

from liveq.utils.FLAT import FLATParser

class HistogramCollection:
	"""
	A collection of histograms that can be optimally
	interpolated.
	"""

	def __init__(self, data=None, bins=10, tune=None):
		"""
		Initialize the histogram collection
		"""

		#: Histogram objects
		self.historefs = []
		#: Histogram indexing info
		self.histoinfo = []
		#: Histogram data
		self.data = numpy.array([])
		#: Number of bins in our histograms
		self.bins = None
		#: Optional tune this collection is bound with
		self.tune = tune

		# Local variables
		self.updating = False

		# If we have data and bins, call set()
		if data != None:
			self.set(data, bins)

	@staticmethod
	def unpack(packedData):
		"""
		Return a new populated HistogramCollection by unpacking
		the specified packed data.
		"""
		
		# Convert buffer to array
		arr = numpy.fromBuffer( packedData )

		# Create new instance
		return HistogramCollection(
				bins=int(arr[0]),
				data=arr[1:]
			)

	def set(self, data, bins=10):
		"""
		Set a new data set and create histogram objects
		by cloning the specified histogram class as reference.
		"""

		# Replace objects
		self.data = data
		self.bins = bins
		self.historefs = []
		self.histoinfo = []

		# Create linked histograms
		i = 0
		while i < len(self.data):

			# Create histogram
			histo = Histogram(bins=bins)

			# Store references
			self.historefs.append(histo)
			self.histoinfo.append({
					'ref': histo,
					'index': i,
					'len': bins
				})

			# Link data
			histo.y = self.data[i:i+bins]
			i += bins
			histo.yErrPlus = self.data[i:i+bins]
			i += bins
			histo.yErrMinus = self.data[i:i+bins]
			i += bins


	def append(self, histogram):
		"""
		Add a histogram in the collection
		"""

		# Sanity checks
		if not self.updating:
			raise RuntimeError("Please call beginUpdate() before changing the HistogramCollection!")

		# Make sure all the bins are the same
		if self.bins == None:
			self.bins = histogram.bins
		elif self.bins != histogram.bins:
			raise TypeError("All histograms must have the same number of bins!")

		# Get some addressing info
		aIndex = len(self.data)
		aLen = len(histogram.y)

		# Store histogram reference
		self.historefs.append(histogram)

		# (We keep histogram reference once
		#  again for optimization purposes on the
		#  item iterator)
		self.histoinfo.append({
				'ref': histogram,
				'index': aIndex,
				'len': aLen 
			})

		# Merge data all together
		self.data = numpy.concatenate(
				(self.data,
				histogram.y,
				histogram.yErrPlus,
				histogram.yErrMinus)
			)

	def beginUpdate(self):
		"""
		"""
		# Sanity checks
		if self.updating:
			raise RuntimeError("Please call beginUpdate() only once!")

		# Mark us as under update
		self.updating = True

	def endUpdate(self):
		"""
		Bind histogram values 
		"""

		# Sanity checks
		if not self.updating:
			raise RuntimeError("Please call beginUpdate() before changing the HistogramCollection!")

		# Make histogram values references
		# to the data
		for histo in self.histoinfo:

			# Get histogram index & length
			i = histo['index']
			l = histo['len']

			# Extract references from data
			histo['ref'].y = self.data[i:i+l]
			i+=l
			histo['ref'].yErrPlus = self.data[i:i+l]
			i+=l
			histo['ref'].yErrMinus = self.data[i:i+l]

	def pack(self):
		"""
		Pack the contents of the histogram (faster than pickling)
		"""
		
		# Prefix the number of bins in the array
		arr = numpy.concatenate(( [ self.bins ], self.data ))

		# Return bufer
		np.getbuffer(arr)

	def __getitem__(self, index):
		"""
		Return the histogram object on the given index
		"""
		return self.historefs.__getitem__(index)

	def __iter__(self):
		"""
		Return the iterator in the histogram references
		"""
		return self.historefs.__iter__()

	def __len__(self):
		"""
		Return the number of histograms
		"""
		return self.historefs.__len__()


class Histogram:
	"""
	Simple histogram representation class that assumes
	that all bins in all data sets are in the same place
	and with the same width.
	"""
	
	def __init__(self, name="", bins=10, y=None, yErrPlus=None, yErrMinus=None, x=None, xErrPlus=None, xErrMinus=None):
		"""
		Basic histogram representation
		"""

		# Store bin info
		self.bins = bins
		self.name = name

		# Initialize bin values
		if y == None:
			y = numpy.zeros(bins)
		if yErrPlus == None:
			yErrPlus = numpy.zeros(bins)
		if yErrMinus == None:
			yErrMinus = numpy.zeros(bins)

		# Initialize bins
		if x == None:
			x = numpy.zeros(bins)
		if xErrPlus == None:
			xErrPlus = numpy.zeros(bins)
		if xErrMinus == None:
			xErrMinus = numpy.zeros(bins)

		# Store values
		self.y = y
		self.yErrPlus = yErrPlus
		self.yErrMinus = yErrMinus
		self.x = x
		self.xErrPlus = xErrPlus
		self.xErrMinus = xErrMinus

	def copy(self):
		"""
		Create a copy of this histogram
		"""

		# Create new object with cloned info
		return Histogram(
				name=self.name,
				bins=self.bins,
				y=numpy.copy(self.y),
				yErrPlus=numpy.copy(self.yErrPlus),
				yErrMinus=numpy.copy(self.yErrMinus),
				x=numpy.copy(self.x),
				xErrPlus=numpy.copy(self.xErrPlus),
				xErrMinus=numpy.copy(self.xErrMinus)
			)

	def isNormalized(self):
		"""
		Check if the specified histogram is normalized.
		"""

		# Check if the sum is "close to" 1
		tot = numpy.sum(self.y)

		# Return
		return (tot >= 0.9999) and (tot <= 1.00001)


	def normalize(self, copy=True):
		"""
		Normalize the y-values so they sum to 1.
		"""
		# NOTE: I have no idea what I am doing
		# TODO: Read about this

		# Calculate current sum
		tot = numpy.sum(self.y)

		# Calculate scale (also equal to y-Values)
		self.y = self.y / tot

		# Update errors
		self.yErrMinus *= self.y
		self.yErrPlus *= self.y

	def sumArea(self):
		"""
		Return the summarized area of the histogram
		"""
		
		# Get bin's xerr
		binW = (self.xErrMinus + self.xErrPlus)/2

		# Calc bin areas
		binArea = (binW * self.y)

		# Return sum
		return numpy.sum(binArea)

	@staticmethod
	def merge(self, *args):
		"""
		Merge the statistics with the specified histogram.
		"""
		pass

	def pack(self):
		"""
		Return a packed representation of the histogram that
		can be unpacked from the javascript client.
		"""
		pass

	def chi2ToReference(self, refHisto, uncertainty=0.05):
		"""
		Calculate the chi-squared between the current histogram
		and the given (reference) histogram in the specifeid uncertainty.

		TODO: Parallellize on numpy
		"""

		# Validate binsize
		if refHisto.bins != self.bins:
			raise ValueError("The specified reference histogram does not have the same bin size!")

		# Prepare vars
		Chi2 = 0;
		N = 0;

		# handle bins
		for i in range(0, self.bins):

			# Require same bins filled. If data is filled and MC is not filled,
			# we do not know what the chi2 of that bin is. Return error.
			# (b.isEmpty() && !r.isEmpty()) return -1;
			if (self.y[i] == 0) and (refHisto.y[i] == 0):
				return -11

			# Skip empty bins (if data is empty but theory is filled, it's ok. We
			# are allowed to plot theory outside where there is data, we just 
			# cannot calculate a chi2 there).
			if (self.y[i] == 0) or (refHisto.y[i] == 0):
				continue

			# compute one element of test statistics:
			#                     (Theory - Data)^2
			# X = --------------------------------------------------------
			#      Sigma_data^2 + Sigma_theory^2 + (uncertainty*Theory)^2

			Theory = self.y[i]
			Data = refHisto.y[i]

			if Theory > Data:
				Sigma_theory = self.yErrMinus[i]
				Sigma_data = refHisto.yErrPlus[i]
			else:
				Sigma_theory = self.yErrPlus[i]
				Sigma_data = refHisto.yErrMinus[i]

			nomin = (Theory - Data) * (Theory - Data)
			denom = Sigma_data * Sigma_data + Sigma_theory * Sigma_theory + (uncertainty*Theory) * (uncertainty*Theory)

			if denom == 0:
				raise ValueError("Unexpected division by zero!")

			X = nomin/denom

			Chi2 += X
			N += 1

		# TODO: Calculate NDOF properly (decrease by 1) if histograms
		#       area was normalized to the constant
		if N == 0:
			raise ValueError("No bins to compare!")

		return Chi2/N

	"""
	Return the fitting coefficients that can represent this histogram 
	in an abstract way.
	"""
	def fit(self, degree=2):
		pass

	"""
	Re-create the histogram from the coefficients specified
	"""
	def fromFit(self, coeff, degree=2):
		pass

	@staticmethod
	def fromFLAT(filename):
		"""
		Create a histogram by reading the specified FLAT file
		"""

		# Parse into structures
		data = FLATParser.parse(filename)

		# Ensure we got at least a HISTOGRAM
		if not 'HISTOGRAM' in data:
			return None

		# Get some metrics
		vBins = data['HISTOGRAM']['v']

		numBins = len(vBins)
		numValues = len(vBins[0])

		# Convert values into a flat 2D numpy array
		values = numpy.array(vBins, dtype=numpy.float64).flatten()
		name = data['HISTOGRAM']['d']['AidaPath']

		# If we have:
		# 6 values we have : xLow, xFocus, xHigh, y, yErrMin, yErrMax
		# 5 values we have : xLow, xHigh, y, yErrMin, yErrMax

		if numValues == 6:
			# Extract parts and build histogram
			return Histogram(
					bins=numBins,
					name=name,
					xErrMinus=values[1::6]-values[::6],
					x=values[1::6],
					xErrPlus=values[2::6]-values[1::6],
					y=values[3::6],
					yErrMinus=values[4::6],
					yErrPlus=values[5::6]
				)

		elif numValues == 6:
			# Calculate xMid
			xMid = (values[::5] + values[1::5]) / 2.0

			# Extract parts and build histogram
			return Histogram(
					bins=numBins,
					name=name,
					x=xMid,
					xErrMinus=xMid-values[::5],
					xErrPlus=values[1::5]-xMid,
					y=values[2::5],
					yErrMinus=values[3::5],
					yErrPlus=values[4::5]
				)


	@staticmethod
	def fromAIDA(filename, setName=None):
		"""
		Create a histogram by reading the specified AIDA file
		"""

		# Load tree from XML
		tree = eTree.parse(filename)
		root = tree.getroot()

		# Allocate measurement arrays
		bins = 0
		x = [ ]
		xErrPlus = [ ]
		xErrMinus = [ ]
		y = [ ]
		yErrPlus = [ ]
		yErrMinus = [ ]

		# Process data sets
		for dpSet in root:
			if dpSet.tag == 'dataPointSet':

				# Get attrib
				sName = dpSet.attrib['name']
				sDim = dpSet.attrib['dimension']
				sPath = dpSet.attrib['path']
				sTitle = dpSet.attrib['title']

				# Chomp path
				if sPath[-1] == '/':
					sPath = sPath[:-1]

				# Look for set name
				if (setName == None) or (setName == sName):
					print "Importing %s" % sName
				
					# Process data points
					for dPoint in dpSet:
						if dPoint.tag == 'dataPoint':

							# Reset dimention index
							dimIndex = 0

							# Count number of bins
							bins += 1

							# Process measurements
							for dMeasurement in dPoint:
								if dMeasurement.tag == 'measurement':

									# Get values
									v = numpy.float64(dMeasurement.attrib['value'])
									eMinus = numpy.float64(dMeasurement.attrib['errorMinus'])
									ePlus = numpy.float64(dMeasurement.attrib['errorPlus'])

									# Store x-values (first dimention)
									if dimIndex == 0:
										x.append(v)
										xErrMinus.append(eMinus)
										xErrPlus.append(ePlus)

									# Store y-values (second dimention)
									elif dimIndex == 1:
										y.append(v)
										yErrMinus.append(eMinus)
										yErrPlus.append(ePlus)

									# Change dimention
									dimIndex += 1

					# Exit data set loop
					break

		# Create and return histogram
		return Histogram(
				name="%s/%s" % (sPath, sName),
				bins=bins,
				y=numpy.array(y),
				yErrMinus=numpy.array(yErrMinus),
				yErrPlus=numpy.array(yErrPlus),
				x=numpy.array(y),
				xErrMinus=numpy.array(xErrMinus),
				xErrPlus=numpy.array(xErrPlus)
			)

	@staticmethod
	def allFromAIDA(filename):
		"""
		Create a dictionary of histograms by reading all the dataPointSets in the AIDA file.
		"""

		# Load tree from XML
		tree = eTree.parse(filename)
		root = tree.getroot()

		# Prepare the response dict
		ans = { }

		# Process data sets
		for dpSet in root:
			if dpSet.tag == 'dataPointSet':

				# Reset measurement arrays
				bins = 0
				x = [ ]
				xErrPlus = [ ]
				xErrMinus = [ ]
				y = [ ]
				yErrPlus = [ ]
				yErrMinus = [ ]

				# Get attrib
				sName = dpSet.attrib['name']
				sDim = dpSet.attrib['dimension']
				sPath = dpSet.attrib['path']
				sTitle = dpSet.attrib['title']

				# Chomp path
				if sPath[-1] == '/':
					sPath = sPath[:-1]

				print "Importing %s" % sName
			
				# Process data points
				for dPoint in dpSet:
					if dPoint.tag == 'dataPoint':

						# Reset dimention index
						dimIndex = 0

						# Count number of bins
						bins += 1

						# Process measurements
						for dMeasurement in dPoint:
							if dMeasurement.tag == 'measurement':

								# Get values
								v = numpy.float64(dMeasurement.attrib['value'])
								ePlus = numpy.float64(dMeasurement.attrib['errorPlus'])
								eMinus = numpy.float64(dMeasurement.attrib['errorMinus'])

								# Store x-values (first dimention)
								if dimIndex == 0:
									x.append(v)
									xErrMinus.append(eMinus)
									xErrPlus.append(ePlus)

								# Store y-values (second dimention)
								elif dimIndex == 1:
									y.append(v)
									yErrMinus.append(eMinus)
									yErrPlus.append(ePlus)

								# Change dimention
								dimIndex += 1

				# Store dataset
				name = "%s/%s" % (sPath, sName)
				ans[name] = Histogram(
					name=name,
					bins=bins,
					y=numpy.array(y),
					yErrMinus=numpy.array(yErrMinus),
					yErrPlus=numpy.array(yErrPlus),
					x=numpy.array(y),
					xErrMinus=numpy.array(xErrMinus),
					xErrPlus=numpy.array(xErrPlus)
				)

		# Create and return histogram
		return ans

