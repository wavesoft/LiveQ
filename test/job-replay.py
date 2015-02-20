#!/usr/bin/python
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

# ----------
import sys
sys.path.append("../liveq-common")
# ----------

import logging
import time
import signal
import sys
import hashlib
import uuid
import glob

from config import Config

import liveq.data.histo.io as io

from liveq.models import Lab
from liveq.data.histo.intermediate import IntermediateHistogramCollection
from liveq.data.histo.interpolate import InterpolatableCollection

from liveq import handleSIGINT, exit
from liveq.events import GlobalEvents
from liveq.exceptions import ConfigException
from liveq.component import Component

import math
import numpy as np
import matplotlib.pyplot as plt

# Prepare runtime configuration
runtimeConfig = { }

# Load configuration
try:
	Config.fromFile( "config.local", runtimeConfig )
except ConfigException as e:
	print("Configuration exception: %s" % e)
	exit(1)

class OfflineSequencer:

	def __init__(self, lab="3eb1263a77f35ba11d334cc8e29fc0c3", baseDir="histogram", prefix=""):
		"""
		Initialize the offline sequencer
		"""

		# Base directory and prefix
		self.baseDir = baseDir
		self.prefix = prefix

		# Glob files
		self.files = sorted(glob.glob("%s/%s*.dat" % (baseDir, prefix)))
		self.fileIndex = 0

		# Open lab
		self.lab = None
		if lab:
			self.lab = Lab.get(Lab.uuid == lab)

		# Fetch first part in the sequence to get metrics
		firstFile = self.parseFile(self.files[0])
		self.numHistos = len(firstFile)
		self.numFiles = len(self.files)
		self.histogramNames = []
		for histo in firstFile:
			self.histogramNames.append(histo.name)

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
			if self.lab:
				histos = histos.subset( self.lab.getHistograms() )

			# Convert to histogram and normalize
			for k, h in histos.iteritems():
				# Pack buffers
				result.append( h.toHistogram().normalize(copy=False) )

		# Return histograms
		return result

	def step(self):
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

class LivePlotter:

	def __init__(self, sequencer):
		"""
		"""

		# Store sequencer
		self.sequencer = sequencer

		# Calculate matrix size
		self.cols = int(math.ceil(math.sqrt(sequencer.numHistos)))
		self.rows = int(math.ceil( float(sequencer.numHistos) / self.cols ))

		# Setup plot
		plt.ion()
		plt.show()

		# Prepare figures and axes
		self.fig, self.axs = plt.subplots(nrows=self.rows, ncols=self.cols)

	def step(self):
		"""
		"""

		histos = self.sequencer.step()

		x = 0
		y = 0

		for h in histos:

			# Get plot
			plot = self.axs[x,y]

			# Plot histogram
			plot.clear()
			if (len(h.x) > 1) and (len(h.y) > 1):
				plot.errorbar( 
					h.x, h.y, 
					xerr=[h.xErrPlus, h.xErrMinus], 
					yerr=[h.yErrPlus, h.yErrMinus],
					ecolor='red'
					)

			# Update title
			plot.set_title( h.name )

			# Proceed to next plot
			x += 1
			if x >= self.cols:
				x = 0
				y += 1

		# Redraw histogram
		plt.draw()


seq = OfflineSequencer(baseDir="histo-1")
plotter = LivePlotter(seq)

for i in range(0,800):
	plotter.step()
	plt.pause(0.1)

