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

from liveq.data.histo import Histogram
from liveq.data.histo.intermediate import IntermediateHistogram, IntermediateHistogramCollection
from liveq.data.histo.exceptions import IncompatibleMergeException

def isHistogramCompatible(histoA, histoB):
	
	# Check for number of bins
	if histoA.bins != histoB.bins:
		return False

	# Require nevts in the metadata
	if (not 'nevts' in histoA.meta) or (not 'nevts' in histoB.meta):
		return False

	# Require crosssection in the metadata
	if (not 'crosssection' in histoA.meta) or (not 'crosssection' in histoB.meta):
		return False

	# Otherwise it's OK
	return True

def intermediateMerge(histograms):
	"""
	Merge the given list of IntermediateHistograms and return the 
	resulting IntermediateHistogram that can be further merged again.
	"""

	# Validate format
	if not type(histograms) is list:
		return None

	# Calculate metrics
	numBins = histograms[0].bins
	name = histograms[0].name

	# Prepare final histogram metadata
	vMeta = dict(histograms[0].meta)
	#vMeta['seed'] = str(vMeta['seed'])

	# Prepare values for first pass
	i = 0
	nevts = 0
	nevts_vec = numpy.zeros(len(histograms))
	ffill_vec = numpy.zeros(len(histograms))
	xs_vec = numpy.zeros(len(histograms))

	# Collect METADATA for weights and summed histo METADATA
	for histo in histograms:

		# While in the loop, also check for validity
		if i > 0:

			# Check for compatibility
			if not isHistogramCompatible(histograms[0], histo):
				raise IncompatibleMergeException("One or more histograms provided are not compatible between them")

			# Take this oportunity to update the seed meta field
			#vMeta['seed'] += " %s" % histo.meta['seed']

		# Sum total number of events
		nevts += histo.nevts

		# Store number of events in vector
		nevts_vec[i] = histo.nevts

		# Number of histogram fills per event
		nfill = numpy.sum(histo.Entries)
		ffill_vec[i] = nfill / histo.nevts

		# Cross-section value of the sample used for the histogram
		xs_vec[i] = histo.crosssection

		# Next
		i += 1

	# Set normalization constant for sum_i w_i
	# (We don't support ALPGEN NpX samples)
	weight_norm = nevts

	# Evaluate weights and total cross-section (vectorized)
	weight_vec = nevts_vec / weight_norm
	xs = numpy.sum( weight_vec * xs_vec )

	# Update meta-info of the histogram
	vMeta['nevts'] = nevts
	vMeta['crosssection'] = xs

	# Summ histograms into another intermediate histogram
	i = 0
	dst = IntermediateHistogram(bins=numBins, name=name, meta=vMeta)
	for histo in histograms:

		# Get weight
		w = weight_vec[i]

		# Sum everything (vectorized)
		dst.Entries +=     histo.Entries
		dst.SumW 	+=   w*histo.SumW
		dst.SumW2 	+= w*w*histo.SumW2
		dst.SumXW 	+=   w*histo.SumXW
		dst.SumX2W 	+=   w*histo.SumX2W

		# Next
		i += 1

	# Return meta histogram
	return dst

def intermediateCollectionMerge(collections):
	"""
	Merge the given list of IntermediateHistogramCollection and return the 
	resulting IntermediateHistogramCollection that can be further merged again.
	"""

	# Create a response collection
	ans = IntermediateHistogramCollection()

	# Start merging using first collection in the list as reference
	for k,v in collections[0].iteritems():

		# Collect the histogram from other collections
		histos = [v]
		for c in collections[1:]:
			if not k in c:
				raise ValueError("Could not find histogram %s in specified collection for merging" % k)
			else:
				histos.append(c[k])

		# Append answer
		ans.append( intermediateMerge(histos) )

	# Return answer
	return ans

