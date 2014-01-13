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

class HistogramCollection(list):
	"""
	A collection of histograms that can be optimally interpolated
	together.
	"""

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
			list.append(self, Histogram.fromFit( coeff, meta) )


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
			raise RuntimeError("Please call beginUpdate() before changing the HistogramCollection!")
	
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
			raise RuntimeError("Please call beginUpdate() before changing the HistogramCollection!")

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



class Histogram:
	"""
	Simple histogram representation class that assumes
	that all bins in all data sets are in the same place
	and with the same width.
	"""
	
	def __init__(self, name="", bins=10, y=None, yErrPlus=None, yErrMinus=None, x=None, xErrPlus=None, xErrMinus=None, meta={}):
		"""
		Basic histogram representation
		"""

		# Store histogram info
		self.bins = bins
		self.name = name
		self.meta = meta

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

	def isNormalized(self, tollerance=0.1):
		"""
		Check if the specified histogram is normalized.
		"""

		# Calculate the trapez sum
		tot = self.area()

		# Check if the value is very close to one
		return (tot >= (1.0-tollerance)) and (tot <= (1.0+tollerance))

	def equal(self, histogram, tollerance=0.2):
		"""
		Check if the histogram is equal to specified
		"""

		# On zero tollerance compare each bin
		if tollerance == 0:

			if not numpy.all( self.x == histogram.x ):
				print "!!! Histogram X mismatch"
				return False
			if not numpy.all( self.y == histogram.y ):
				print "{{{ Chi2 = %f }}}" % self.chi2ToReference( histogram )
				print "!!! Histogram Y mismatch"
				return False
			if not numpy.all( self.xErrPlus == histogram.xErrPlus ):
				print "!!! Histogram xErrPlus mismatch"
				return False
			if not numpy.all( self.xErrMinus == histogram.xErrMinus ):
				print "!!! Histogram xErrMinus mismatch"
				return False
			if not numpy.all( self.yErrPlus == histogram.yErrPlus ):
				print "!!! Histogram yErrPlus mismatch"
				return False
			if not numpy.all( self.yErrMinus == histogram.yErrMinus ):
				print "!!! Histogram yErrMinus mismatch"
				return False
			if self.bins != histogram.bins:
				print "!!! Histogram bins mismatch"
				return False

		# Otherwise require a very small chi
		else:

			if (self.chi2ToReference(histogram) < tollerance):
				return True
			else:
				print "!!! Chi2 = %f > Tollerance = %f" % ( self.chi2ToReference( histogram ), tollerance )
				return False


		return True

	def normalize(self, copy=True, tollerance=0.1):
		"""
		Normalize the y-values so the area of the histogram is 1.0
		"""

		# Create copy if needed
		ref = self
		if copy:
			ref = self.copy()

		# Calculate the trapez sum
		tot = ref.area() 

		# If we are normalized, exit
		if (tot >= (1.0-tollerance)) and (tot <= (1.0+tollerance)):
			return ref

		# Calculate scale (also equal to y-Values)
		ref.y = ref.y / tot

		# Update errors
		ref.yErrMinus /= tot
		ref.yErrPlus /= tot

		# Return histogram
		return ref

	def area(self):
		"""
		Rreturn the trapezoidal numerical integration of the histogram.
		(Very close to the area of the histogram)
		"""

		# Integrate along the given axis using the composite trapezoidal rule,
		# using spacing the xError size
		return numpy.trapz( self.y, self.x )

	@staticmethod
	def merge(self, *args):
		"""
		Merge the statistics with the specified histogram.
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
	Return the polynomial fitting coefficients that can represent this histogram.
	Optionally it returns the metadata required to re-construct the histogram using Histogram.fromFit()
	function.
	"""
	def polyFit(self, deg=4, meta=True):

		# Coefficents for the plot
		coeff = numpy.polyfit( self.x, self.y, deg )
		coeffPlus = numpy.polyfit( self.x, self.y+self.yErrPlus, deg )
		coeffMinus = numpy.polyfit( self.x, self.y-self.yErrMinus, deg )

		# Calculate the combined coefficients
		combCoeff = numpy.concatenate( [coeff, coeffPlus, coeffMinus] )

		# If we don't have metadata, return
		if not meta:
			return combCoeff

		# Prepare metadata
		meta = {
			'x': [ self.x, self.xErrMinus, self.xErrPlus ],
			'bins': self.bins,
			'meta': self.meta
		}

		# Return coefficients and metadata
		return (combCoeff, meta)

	"""
	Re-create the histogram from the coefficients and metadata specified
	"""
	@staticmethod
	def fromFit(coeff, meta):

		# Extract x-values from metadata
		x = meta['x'][0]
		xErrMinus = meta['x'][1]
		xErrPlus = meta['x'][2]

		# Calculate the size of the coefficients array
		cl = len(coeff) / 3

		# Re-create bin values from fitted data
		y = numpy.polyval( coeff[0:cl], x )
		yErrMinus = numpy.polyval( coeff[cl:cl*2], x )
		yErrPlus = numpy.polyval( coeff[cl*2:cl*3], x )

		# Return histogram instance
		return Histogram(
			bins=meta['bins'],
			x=x,
			xErrMinus=xErrMinus,
			xErrPlus=xErrPlus,
			y=y,
			yErrMinus=yErrMinus-y,
			yErrPlus=y-yErrPlus,
			meta=meta['meta']
			)


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

		# Get metadata
		vMeta = { }
		if 'METADATA' in data:
			vMeta = data['METADATA']['d']

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
					yErrPlus=values[5::6],
					meta=vMeta
				)

		elif numValues == 5:
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
					yErrPlus=values[4::5],
					meta=vMeta
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
				x=numpy.array(x),
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

