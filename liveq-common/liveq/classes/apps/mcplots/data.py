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
import glob
import numpy as np

from liveq.data.histo import Histogram, HistogramCollection

class MCPlotsData:
	"""
	Utility class to return information regarding Pythia tunes and config
	"""
	pass


def collectHistograms( baseDir, names=[] ):
	"""
	Read the .dat files in the specified directory and create a HistogramCollection
	object that contains all of them.
	"""

	# Find files
	flatFiles = glob.glob("%s/*.dat" % baseDir)
	aidaFiles = glob.glob("%s/*.aida" % baseDir)

	# Start creating the collection
	collection = HistogramCollection()
	collection.beginUpdate()

	# First, parse AIDA files
	for f in aidaFiles:

		# Fetch all histograms in the AIDA file
		histos = Histogram.allFromAIDA(f)

		# Process histograms
		for histoName,histo in histos.iteritems():

			# Store only if the name is in the dictionary
			# or the dictionary is empty
			if (len(names) == 0) or (histoName in names):

				# Store the specified histogram in the collection
				collection.append(histo)

	# Then, parse FLAT files
	for f in flatFiles:

		# Get histogram name
		histoName = os.path.basename(f)[:-4]

		# Process only if it's in the list
		if (len(names) == 0) or (histoName in names):

			# Fetch histogram in FLAT file
			histo = Histogram.fromFLAT(f)

			# Store the specified histogram in the collection
			collection.append(histo)

	# Finalize histogram collection update
	collection.endUpdate()

	# Return collection
	return collection

