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
import logging
import traceback

from liveq.models import Lab
from liveq.config.histograms import HistogramsConfig
from liveq.data.histo import Histogram

#: Reference histograms for every lab
LAB_REFERENCE_HISTOGRAMS = { }

#: Reference histograms for every level
LEVEL_REFERENCE_HISTOGRAMS = { }

class ReferenceHistograms:
	"""
	A class that provides comparison against a set of reference histograms
	stored in a directory.
	"""

	def __init__(self, baseDirectory):
		"""
		Initialize the reference histograms located in the specified path
		"""
		logging.info("Using labref on %s" % baseDirectory)

		#: The base directory where the histograms are located
		self.baseDirectory = baseDirectory

		#: Cached histogram objects for rapid accessing
		self.CACHE = { }

	def loadReferenceHistogram(self, histoPath):
		"""
		Return the histogram object for the specified AIDA Path
		"""

		# Strip heading '/REF'
		if histoPath.startswith("/REF"):
			histoPath = histoPath[4:]

		# Strip heading slash
		if histoPath[0] == "/":
			histoPath = histoPath[1:]

		# Convert slashes to underscores
		histoPath = histoPath.replace("/", "_")

		# If cached, use now
		if histoPath in self.CACHE:
			return self.CACHE[histoPath]

		# Lookup if such historam exists
		histoPath = "%s/%s.dat" % (self.baseDirectory, histoPath)
		if not os.path.isfile(histoPath):
			print "%s not found" % histoPath
			return None

		# Load & Normalize histogram
		histo = Histogram.fromFLAT( histoPath )
		histo.normalize(copy=False)

		# Store it on cache
		self.CACHE[histoPath] = histo
		return histo

	def histoChi2Reference(self, histo):
		"""
		Compare the histogram specified with the reference version
		of the histogram and return the chi2 fit.
		"""

		# If histogram is empty return 0.0
		if (histo.bins == 0):
			return 0.0

		# Get reference histogram
		ref = self.loadReferenceHistogram( histo.name )
		if not ref:
			return 0.0

		# Return chi2 fit to reference
		try:
			if not isinstance(histo, Histogram):
				normHisto = histo.toHistogram().normalize()
			else:
				normHisto = histo.copy().normalize()
			return normHisto.chi2ToReference( ref )
		except Exception as e:
			logging.error("Exception while calculating chi2 of histogram %s: %s" % (str(histo.name), str(e)))
			traceback.print_exc()
			return 0.0

	def collectionChi2Reference(self, histoCollection):
		"""
		Compare all histograms of the specified collection and
		return the chi-squared score
		"""

		# Prepare properties
		chi2sum = 0
		chi2count = 0
		chi2list = {}

		# Iterate in the collection
		for histo in histoCollection.values():
			chi2value = self.histoChi2Reference( histo )
			chi2list[histo.name] = chi2value
			if chi2value > 0.0:
				chi2sum += chi2value
				chi2count += 1

		# Return average and list
		return (chi2sum / chi2count, chi2list)

#: Create the default histogram feren
DEFAULT = ReferenceHistograms( "%s/%s" % (HistogramsConfig.HISTOREF_PATH, HistogramsConfig.HISTOREF_DEFAULT) )

#: Return a reference histogram for the specified lab
def forLab(lab):
	"""
	Return a ReferenceHistograms class for the specified lab UUID
	"""

	# Check if instnace of lab
	if isinstance(lab, Lab):
		uuid = lab.uuid
	else:
		uuid = str(lab)

	# Get cached version
	if uuid in LAB_REFERENCE_HISTOGRAMS:
		return LAB_REFERENCE_HISTOGRAMS[uuid]

	# Otherwise create new and cache
	histos = ReferenceHistograms( "%s/%s" % (HistogramsConfig.HISTOREF_PATH, uuid) )
	LAB_REFERENCE_HISTOGRAMS[uuid] = histos

	# And return it
	return histos

#: Return a reference histogram for the specified level
def forLevel(level):
	"""
	Return a ReferenceHistograms class for the specified level ID
	"""

	# Generate a uuid from level
	uuid = "level-%i" % level

	# Get cached version
	if uuid in LEVEL_REFERENCE_HISTOGRAMS:
		return LEVEL_REFERENCE_HISTOGRAMS[uuid]

	# Otherwise create new and cache
	histos = ReferenceHistograms( "%s/%s" % (HistogramsConfig.HISTOREF_PATH, uuid) )
	LEVEL_REFERENCE_HISTOGRAMS[uuid] = histos

	# And return it
	return histos

# Keep a reference of the default functions
loadReferenceHistogram = DEFAULT.loadReferenceHistogram
histoChi2Reference = DEFAULT.histoChi2Reference
collectionChi2Reference = DEFAULT.collectionChi2Reference
