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

from liveq.data.histo import Histogram
from liveq.data.histo.intermediate import IntermediateHistogram

def rebinToReference( histo, ref ):
	"""
	Rebinning function that supports various different kinds of histograms,
	such as 'Histogram' or 'IntermediateHistogram'
	"""

	# We should cap the bins to the reference histogram bins
	if ref.__class__ is IntermediateHistogram:
		refXLow = ref.xlow
		refXHigh = ref.xlhigh
		refBins = ref.bins
	elif ref.__class__ is Histogram:
		refXLow = ref.x - ref.xErrMinus
		refXHigh = ref.x + ref.xErrPlus
		refBins = ref.bins
	else:
		raise ValueError("Unknown type of reference histogram")

	# Validate histo class
	if not  (histo.__class__ is IntermediateHistogram) and \
		not (histo.__class__ is Histogram):
		raise ValueError("Unknown type of input histogram")

	# Cap edges
	# TODO: Assume edges match

	# If same number of bins, we don't have to do anything
	if refBins == histo.bins:
		return

	# Handle cases where we just empty the histogram
	if (refBins == 0) and (histo.bins != 0):

		# Empty bins
		histo.bins = 0
		histo.clear()
		return

	# Handle cases where we previously had no bins
	if (histo.bins == 0) and (refBins != 0):

		# Create blank bins
		histo.bins = refBins
		histo.clear()

		# Import bin information from reference (x values)
		if histo.__class__ is IntermediateHistogram:
			histo.xlow = refXLow
			histo.xhigh = refXHigh
			histo.xfocus = (refXLow + refXHigh) / 2.0
		elif histo.__class__ is Histogram:
			histo.x = (refXLow + refXHigh) / 2.0
			histo.xErrMinus = histo.x - refXLow
			histo.xErrPlus = refXHigh - histo.x

		# We are good
		return

	# Distribute bins
	i = 0; j = 0; mFrom = None; mTo = None
	while i < refBins:

		# Reference bin edges
		r0 = refXLow[i]
		r1 = refXHigh[i]

		# The matching bin edges
		if histo.__class__ is IntermediateHistogram:
			x0 = histo.xlow[j]
			x1 = histo.xhigh[j]
		elif histo.__class__ is Histogram:
			x0 = histo.x[j] - histo.xErrMinus[j]
			x1 = histo.x[j] + histo.xErrPlus[j]

		# Match beginning if we don't have one
		if (mFrom is None) and (r0 == x0):
			mFrom = [i, j]

		# Inner loop
		if not (mFrom is None):
			while j < histo.bins:

				# The matching bin edges
				if histo.__class__ is IntermediateHistogram:
					x0 = histo.xlow[j]
					x1 = histo.xhigh[j]
				elif histo.__class__ is Histogram:
					x0 = histo.x[j] - histo.xErrMinus[j]
					x1 = histo.x[j] + histo.xErrPlus[j]

				# If the high edge is higher than the
				# reference high edge, continue with
				# the outer loop
				if x1 > r1:
					break

				# Match ending if we don't have one
				if (mTo is None) and (r1 == x1):
					mTo = [i, j]

					# Check if we need to remap
					if (mTo[1] != mFrom[1]) or (mTo[0] != mFrom[0]):

						# Expand or divide?
						if (mTo[1]-mFrom[1]) > (mTo[0]-mFrom[0]):
							#print "Merge %i,%i to %i,%i" % (mFrom[0], mFrom[1], mTo[0], mTo[1])

							# Merge bins {mFrom[1] - mTo[1]} in order to fit
							# the edges of bins {mFrom[0] - mTo[0]}

							if histo.__class__ is IntermediateHistogram:
								k0 = histo.xlow[mFrom[1]]
								k1 = histo.xhigh[mTo[1]]

								#print " - Edges: %f - %f" % (k0, k1)

								# Merge entries
								m_Entries = []
								m_SumW = []
								m_SumW2 = []
								m_SumXW = []
								m_SumX2W = []

								# Collect entry values
								for k in range(mFrom[1], mTo[1]+1):
									#print " - Collect %i" % k
									m_Entries.append( histo.Entries[k] )
									m_SumW.append( histo.SumW[k] )
									m_SumW2.append( histo.SumW2[k] )
									m_SumXW.append( histo.SumXW[k] )
									m_SumX2W.append( histo.SumX2W[k] )

								# Merge entries
								s = mFrom[1]; e = mTo[1]; l = e-s+1
								#print "Merge: %r" % m_Entries
								histo.Entries[s] = numpy.sum( m_Entries )
								histo.SumW[s] = numpy.sum( m_SumW )
								histo.SumW2[s] = numpy.sum( m_SumW2 )
								histo.SumXW[s] = numpy.sum( m_SumXW )
								histo.SumX2W[s] = numpy.sum( m_SumX2W )

								#print " - Merge to %i" % s
								#print " - Left edge (%f) should be %f" % (histo.xlow[s], k0)
								#print " - Right edge from %f to %f" % (histo.xhigh[s], k1)
								#print " - Focus point from %f to %f" % (histo.xfocus[s], (k0+k1)/2.0)

								# Update bin edge and focus
								histo.xhigh[s] = k1
								histo.xfocus[s] = (k0+k1)/2.0

								# Delete intermediate entries
								for k in range(mFrom[1]+1, mTo[1]+1):
									#print " - Delete & lshift %i" % k
									histo.xlow = numpy.delete( histo.xlow, k)
									histo.xfocus = numpy.delete( histo.xfocus, k)
									histo.xhigh = numpy.delete( histo.xhigh, k)
									histo.Entries = numpy.delete( histo.Entries, k)
									histo.SumW = numpy.delete( histo.SumW, k)
									histo.SumW2 = numpy.delete( histo.SumW2, k)
									histo.SumXW = numpy.delete( histo.SumXW, k)
									histo.SumX2W = numpy.delete( histo.SumX2W, k)

									# Shift trim indices
									histo.bins -= 1
									j -= 1

							elif histo.__class__ is Histogram:
								k0 = histo.x[mFrom[1]] - histo.xErrMinus[mFrom[1]]
								k1 = histo.x[mTo[1]] + histo.xErrPlus[mTo[1]]
								kx = (k0+k1) / 2.0

								# Merge entries
								m_y = []
								m_yErrPlus = []
								m_yErrMinus = []

								# Collect entry values
								for k in range(mFrom[1], mTo[1]+1):
									m_y.append( histo.y[k] )
									m_yErrPlus.append( histo.yErrPlus[k] )
									m_yErrMinus.append( histo.yErrMinus[k] )

								# Merge entries
								s = mFrom[1]; e = mTo[1]; l = e-s+1
								histo.y[s] = numpy.sum( m_y ) / 2
								histo.yErrPlus[s] = numpy.sum( m_yErrPlus ) / l
								histo.yErrMinus[s] = numpy.sum( m_yErrMinus ) / l

								# Update edges
								histo.x[s] = kx
								histo.xErrMinus[s] = kx - k0
								histo.xErrPlus[s] = k1 - kx

								# Delete intermediate entries
								for k in range(mFrom[1]+1, mTo[1]+1):
									#print " - Delete & lshift %i" % k
									histo.y = numpy.delete( histo.y, k)
									histo.yErrMinus = numpy.delete( histo.yErrMinus, k)
									histo.yErrPlus = numpy.delete( histo.yErrPlus, k)
									histo.x = numpy.delete( histo.x, k)
									histo.xErrMinus = numpy.delete( histo.xErrMinus, k)
									histo.xErrPlus = numpy.delete( histo.xErrPlus, k)

									# Shift trim indices
									histo.bins -= 1
									j -= 1

						else:

							# Split bins {mFrom[1] - mTo[1]} in order to match
							# the sub-bins from {mFrom[0] - mTo[0]}
							print "Divide %i,%i to %i,%i" % (mFrom[0], mFrom[1], mTo[0], mTo[1])

							# Currently not implemented
							raise ValueError("Dividing bins is not currently supported!")


					# Reset
					mFrom = [i+1,j+1]
					mTo = None

					# Continue
					j += 1
					break

				# Continue with next
				j += 1

		# Continue with next
		i += 1

	# Return histogram
	return histo

