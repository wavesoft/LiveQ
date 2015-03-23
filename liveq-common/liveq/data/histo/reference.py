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

from liveq.config.histograms import HistogramsConfig
from liveq.data.histo import Histogram

#: Cache of reference histograms
HISTOREF_CACHE = {}

def loadReferenceHistogram(histoPath):
	"""
	Load reference data for the given histogram
	"""
	global HISTOREF_CACHE

	# Strip heading '/REF'
	if histoPath.startswith("/REF"):
		histoPath = histoPath[4:]

	# Strip heading slash
	if histoPath[0] == "/":
		histoPath = histoPath[1:]

	# Convert slashes to underscores
	histoPath = histoPath.replace("/", "_")

	# If cached, use now
	if histoPath in HISTOREF_CACHE:
		return HISTOREF_CACHE[histoPath]

	# Lookup if such historam exists
	histoPath = "%s/%s.dat" % (HistogramsConfig.HISTOREF_PATH, histoPath)
	if not os.path.isfile(histoPath):
		return None

	# Load & Cache histogram
	histo = Histogram.fromFLAT( histoPath )
	HISTOREF_CACHE[histoPath] = histo
	return histo

def histoChi2Reference(histo):
	"""
	Compare the histogram specified with the reference version
	of the histogram and return the chi2 fit.
	"""

	# Get reference histogram
	ref = loadReferenceHistogram( histo.name )
	if not ref:
		return 0.0

	# Return chi2 fit to reference
	try:
		normHisto = histo.toHistogram()
		return normHisto.chi2ToReference( ref )
	except Exception as e:
		logging.error("Exception while calculating chi2 of histogram %s: %s" % (str(histo.name), str(e)))
		traceback.print_exc()
		return 0.0

def collectionChi2Reference(histoCollection):
	"""
	Compare all histograms of the specified collection and
	return the chi-squared score
	"""

	# Prepare properties
	chi2sum = 0
	chi2count = 0

	# Iterate in the collection
	for histo in histoCollection.values():
		chi2value = histoChi2Reference( histo )
		if chi2value > 0.0:
			chi2sum += chi2value
			chi2count += 1

	# Return average
	return chi2sum / chi2count
