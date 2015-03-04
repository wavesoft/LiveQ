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

import glob
import logging

from liveq.data.histo.intermediate import IntermediateHistogramCollection

class OfflineSequence:
	"""
	Offline pre-recorded sequence of data responses that can be 
	use for training courses.
	"""

	def __init__(self, baseDir="histogram", prefix="", histoTrim=None):
		"""
		Initialize the offline sequencer
		"""

		# Base directory and prefix
		self.baseDir = baseDir
		self.prefix = prefix
		self.empty = False

		# Get a logger
		self.logger = logging.getLogger("sequencer")

		# Glob files
		self.files = sorted(glob.glob("%s/%s*.dat" % (baseDir, prefix)))
		self.fileCount = len(self.files)
		self.fileIndex = 0
		self.logger.info("Loading %i stages for sequence '%s'" % (self.fileCount, prefix))

		# If file is empty, mark empty and return
		if self.fileCount == 0:
			self.empty = True
			return

		# Set histogram trim
		self.setHistogramTrim( histoTrim )

	def setHistogramTrim(self, histoTrim):
		"""
		Set histogram trim
		"""

		# Reset properties
		self.histoTrim = histoTrim
		self.empty = True
		self.numHistos = 0
		self.histogramNames = []

		# Skip on empty file
		if self.fileCount == 0:
			return

		# Fetch first file record
		firstFile = self.parseFile(self.files[0])

		# Measure matched histograms in file
		for histo in firstFile:
			if not histoTrim or histo.name in histoTrim:
				self.histogramNames.append(histo.name)
				self.numHistos += 1
				self.empty = False

	def parseFile(self, fName):
		"""
		Parse the contents of the given file
		"""

		# Get file contents
		result = []
		with open(fName, "r") as f:
			lines = f.readlines()

			# Create a histogram collection from the data buffer
			histos = IntermediateHistogramCollection.fromPack( lines[0] )

			# Keep only the subset we are interested in
			if self.histoTrim:
				histos = histos.subset( self.histoTrim )

			# Convert to histogram and normalize
			for k, h in histos.iteritems():
				# Pack buffers
				result.append( h.toHistogram().normalize(copy=False) )

		# Return histograms
		return result

	def reset(self):
		"""
		Reset counters
		"""
		self.fileIndex = 0

	def next(self):
		"""
		Get next buffer or return None
		"""

		# Check bounds
		if self.fileIndex >= len(self.files):
			return None

		# Get filename
		fName = self.files[self.fileIndex]
		self.fileIndex += 1

		# Parse and return file
		return self.parseFile(fName)
