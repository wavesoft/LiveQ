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

# Histogram visualization utilities

import math
import numpy as np
import matplotlib.pyplot as plt
from liveq.data.histo.reference import loadReferenceHistogram

def plotHistograms(histograms, subset=[], ref=False, normalize=True):
	"""
	Plot the specified collection or array of histograms, or optionally
	only a subset of it.
	"""

	# Prepare unified view of the plots
	if len(subset) > 0:
		rc = int(math.ceil(math.sqrt(len(subset))))
	else:
		rc = int(math.ceil(math.sqrt(len(histograms))))

	# Minimum 2x2
	if rc < 2:
		rc = 2

	# Prepare axes
	fig, axes = plt.subplots(nrows=rc, ncols=rc)

	# Get iteration context
	iter_ctx = histograms
	if type(histograms) is dict:
		iter_ctx = histograms.values()

	# Build plots
	i = 0
	for h in iter_ctx:

		# Keep only subset
		if (len(subset) > 0) and not (h.name in subset):
			continue

		# Cast to histogram if has this option
		if hasattr(h, 'toHistogram'):
			hist = h.toHistogram()
		else:
			hist = h

		# Check if we should normalize
		if normalize:
			hist = hist.normalize()

		# Plot histogram
		ax = axes.flat[i]
		ax.errorbar(
			hist.x,
			hist.y,
			xerr=hist.xErrPlus,
			yerr=hist.yErrPlus
			)
		ax.set_title(h.name)

		# Include reference histogram if asked
		if ref:

			# Load reference histogram
			refhist = loadReferenceHistogram( h.name )
			if refhist:
				# Plot histogram
				ax = axes.flat[i]
				ax.errorbar(
					refhist.x,
					refhist.y,
					xerr=refhist.xErrPlus,
					yerr=refhist.yErrPlus
					)
			else:
				print "Could not load reference for %s" % h.name

		# Go to next plot
		i += 1

	# Tight and plot
	plt.tight_layout()
	plt.show()

