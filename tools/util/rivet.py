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

import re
import yaml
import glob

import os
from liveq.data.histo import Histogram
from liveq.utils.FLAT import FLATParser

def parsePlots(filename, additional={}):
	"""
	Load all the plot paths and their repsective configuration from
	the given data/plotinfo/*.plot file.
	"""
	plots = {}

	# Read FLAT file
	ff = FLATParser.parse(filename, index=False)

	# Process plot sections
	for f in ff:
		if f['n'] == "PLOT":
			# Get data
			data = f['d']
			# Inject additional
			data.update(additional)
			# Update record
			plots[f['t']] = data

	# Return plots
	return plots

def parseAnaInfo(filename):
	"""
	Load and parse analysis information
	"""
	anainfo = {}

	# Open file
	with open(filename, 'r') as f:
		# Read file
		buf = f.read()
		# Parse to yaml
		anainfo = yaml.load(buf)

	# Return analysis info
	return anainfo

def parseRefHisto(filename):
	"""
	Load all the reference histograms from the given file
	"""

class Anainfo:
	def __init__(self, rivetDatDir):
		"""
		Construct an anainfo object
		"""

		# Initialize lookup indices
		self.analyses = {}
		self.fitAnalysis = {}
		self.plots = {}
		self.plot_wildcards = []

		# Start by reading all the analysis information
		files = glob.glob("%s/anainfo/*.info" % rivetDatDir)
		print "Loading RIVET Analyses..."
		for f in files:

			# Get analysis name
			a_name = os.path.basename(f)[:-5]
			# Get analysis details
			a_data = parseAnaInfo(f)
			# Store
			self.analyses[a_name] = a_data

		# Then read all histograms
		files = glob.glob("%s/plotinfo/*.plot" % rivetDatDir)
		print "Loading RIVET Plots..."
		for f in files:

			# Get analysis name
			a_name = os.path.basename(f)[:-5]
			# Get all plots in this plotfile
			a_plots = parsePlots(f, { 'analysis': a_name })

			# Extract wildcards
			del_keys = []
			for k,v in a_plots.iteritems():
				if '*' in k:
					self.plot_wildcards.append({
							'rx': re.compile("^%s$" % k),
							'dict': v
						})
					del_keys.append(k)

			# Delete wildcard keys
			for k in del_keys:
				del a_plots[k]

			# Apply wildcards
			for w in self.plot_wildcards:
				for k,v in a_plots.iteritems():
					if w['rx'].match(k):
						# Include missing values from match
						for nk,nv in w['dict'].iteritems():
							if not nk in a_plots[k]:
								a_plots[k][nk] = nv

			# Keep plot and plot to analysis info
			self.plots.update(a_plots)

			# Keep plots in the analysis
			self.analyses[a_name]['plots'] = a_plots

		# Then read all reference data and estimate polyFit score
		files = glob.glob("%s/refdata/*.yoda" % rivetDatDir)
		print "Estimating PolyFit degree from REF data..."
		for f in files:

			# Get analysis name
			a_name = os.path.basename(f)[:-5]

			# Get all histograms
			histos = Histogram.allFromYODA(f)

			# For each histogram, perform polyFit analysis
			for k,h in histos.iteritems():

				# Check if this is a logarithmic plot
				isLogY = False
				if k in self.plots:
					if 'LogY' in self.plots[k]:
						isLogY = (self.plots[k] == 1)

				# Perform polyFit degree analysis
				(degree, score, stats) = h.polyFitScores(logY=isLogY)

				# Store results
				self.fitAnalysis[k.replace("/REF", "")] = [degree, score, stats]

				# Display warnings
				if score > 8.0:
					print "WARNING: Histogram %s could not be sufficiently polyFit'ed (chi2=%.2f,deg=%d)" % (k, score, degree)

def loadData(baseDir):
	"""
	Load analysis information from the given path
	"""
	return Anainfo(baseDir)

