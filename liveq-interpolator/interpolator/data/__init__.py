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

import numpy

class HistogramCollection:
	"""
	A collection of histograms that can be optimally
	interpolated.
	"""

	def __init__(self):
		"""
		Initialize the histogram collection
		"""
		self.updating = False

		#: Histogram objects
		self.historefs = []

		#: Histogram indexing info
		self.histoinfo = []

		#: Histogram data
		self.data = numpy.array([])

	def set(self, data, bins=10):
		"""
		Set a new data set and create histogram objects
		by cloning the specified histogram class as reference.
		"""

		# Replace objects
		self.data = data
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


	def add(self, histogram):
		"""
		Add a histogram in the collection
		"""

		# Sanity checks
		if not self.updating:
			raise RuntimeError("Please call beginUpdate() before changing the HistogramCollection!")

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
				'len': aLen * 3
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

	def __getitem__(self, index):
		"""
		Return the histogram object on the given index
		"""
		return self.historefs.__getitem__(self, index)

	def __iter__(self):
		"""
		Return the iterator in the histogram references
		"""
		return self.historefs.__iter__(self)


class Histogram:
	"""
	Simple histogram representation class that assumes
	that all bins in all data sets are in the same place
	and with the same width.
	"""
	
	def __init__(self, bins=10, bininfo=[]):
		"""
		Basic histogram representation
		"""

		# Bin position and width info (static)
		self.bins = bins
		self.bininfo = bininfo

		# Bin values (active)
		self.y = numpy.resize([], bins)
		self.yErrPlus = numpy.resize([], bins)
		self.yErrMinus = numpy.resize([], bins)
