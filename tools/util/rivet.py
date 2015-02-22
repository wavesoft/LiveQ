
import re
import yaml
import glob

import os
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

class Anainfo:
	def __init__(self, rivetDatDir):
		"""
		Construct an anainfo object
		"""

		# Initialize lookup indices
		self.analyses = {}
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

def loadData(baseDir):
	"""
	Load analysis information from the given path
	"""
	return Anainfo(baseDir)

