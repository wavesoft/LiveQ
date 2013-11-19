#!/usr/bin/python

# ----------
import sys
sys.path.append("../liveq-common")
# ----------

import time
import math
import numpy as np
import matplotlib.mlab as mlab
import matplotlib.pyplot as plt
from random import random

from liveq.data.histo import HistogramCollection, Histogram
from liveq.data.tune import Tune

from interpolator.data.store import HistogramStore
from interpolator.config import Config
from liveq.exceptions import ConfigException

# Load configuration
try:
	Config.fromFile( "config/interpolator.conf.local", { } )
except ConfigException as e:
	print("ERROR   Configuration exception: %s" % e)
	sys.exit(1)


##############################################################################################################
##############################################################################################################
####
#### Tool Functions
####
##############################################################################################################
##############################################################################################################

# Pre-populate tune data for given lab
Tune.LAB_TUNE_KEYS[45] = [ 'a','b','c','d','e','f' ]

#: The base mathematical function for creation and difference
def histo_function(tune, attenuator, differentiator, vrange=100, voffset=0.5):
	return (abs(attenuator * (
			(
				math.sin( tune['a'] * 0.1 + 4.3 ) +
				math.sin( tune['b'] * 1.5 + 2.612 ) +
				math.sin( tune['c'] * 7.2 + 0.451 )
			) * math.cos( differentiator / 0.3 ) +
			(
				math.sin( tune['d'] * 4.3 + 12.6 ) +		
				math.sin( tune['e'] * 10.6 + 61.0 ) +
				math.sin( tune['f'] * 6.5 + 21.3 )
			) * math.sin( differentiator / 0.3 ) +
			math.sin( math.cos(differentiator) + differentiator * 10.3 )
		) / 3.0)) * vrange + voffset

#: Generate a set of histograms for the given tune
def build_histos(tune, numHistos=10, numBins=10, yErrMinus=0.05, yErrPlus=0.05, xErrMinus=0.05, xErrPlus=0.05):
	
	ans = HistogramCollection(tune=tune)
	ans.beginUpdate()
	
	for i in range(0,numHistos):
		binvalues = [ ]
		binsum = 0.0
		binpos = [ ]

		# Collect values
		for j in range(0,numBins):

			# Calculate shape
			f = float(j)/float(numBins)
			attenuator = math.sin( f * math.pi )

			# Get bin value
			v = histo_function(tune, attenuator, i)
			#print "(%r,%f(%f),%f) = %f" % (tune, attenuator,f,i,v)
			
			# Store bin info
			binvalues.append( v )
			binpos.append( f )
			binsum += v

		# Create histogram
		histo = Histogram( 
					bins=numBins,
					y=binvalues, 
					yErrPlus=np.repeat(yErrPlus, numBins),
					yErrMinus=np.repeat(yErrMinus, numBins),
					x=binpos,
					xErrPlus=np.repeat(xErrPlus, numBins),
					xErrMinus=np.repeat(xErrMinus, numBins),
				)

		# Normalize
		histo.normalize()

		# Append to list
		ans.append(histo)

	ans.endUpdate()
	return ans

#: Create an array of values 
def build_tunes(num, vmin=0.0, vmax=1.0, vnames=[ 'a','b','c','d','e','f' ]):
	ans = [ ]
	for i in range(0,num):
		tunevalues = { }
		for k in vnames:
			tunevalues[k] = (random() * (vmax-vmin)) + vmin
		ans.append( Tune(tunevalues, labid=45) )
	return ans

def plot_histos(histos, yscale='log'):

	# Calculate the column sizes for subplots
	whsize = int(math.ceil(math.sqrt(len(histos))))
	fig, axs = plt.subplots(nrows=whsize, ncols=whsize, sharex=False)
	axx = 0
	axy = 0

	# Color map
	ci = 0
	colors = [ 'b','g','r', 'c', 'm', 'y', 'k' ] 

	# If we got a histogramcollection get historefs
	if histos.__class__ is HistogramCollection:
		histos = histos.historefs

	# Prepare plots
	for histGroup in histos:

		# Pick subplot and go to next one
		if whsize > 1:
			ax = axs[axy, axx]
			axx += 1
			if axx >= whsize:
				axx = 0
				axy += 1
		else:
			ax = axs

		# Set scale
		ax.set_yscale(yscale)

		# If we got a histogramcollection get historefs
		if histGroup.__class__ is HistogramCollection:
			histGroup = histGroup.historefs

		# Make it a list if it's not
		if type(histGroup) != list:
			histGroup = [histGroup]

		# Make plots
		ci = 0
		for h in histGroup:

			# Pick color for the plot
			col = colors[ci]
			ci += 1
			if ci >= len(colors):
				ci = 0

			# Plot just the basic plot with the specified color
			ax.errorbar( 
				h.x, h.y, 
				yerr=[h.yErrMinus, h.yErrPlus], xerr=[h.xErrMinus, h.xErrPlus],
				color=col,
				label=h.name
				 )

	# Display plot
	plt.show()

##############################################################################################################
##############################################################################################################
####
#### Test code
####
##############################################################################################################
##############################################################################################################

c = []

t_before = int(round(time.time() * 1000))
t = build_tunes(100)
t_after = int(round(time.time() * 1000))
print " - Tune building: %i ms" % (t_after - t_before)

t_before = int(round(time.time() * 1000))
for tune in t:
	c.append(build_histos(tune))
t_after = int(round(time.time() * 1000))
print " - Histo building: %i ms" % (t_after - t_before)

t_before = int(round(time.time() * 1000))
v,d = HistogramStore._pickle( c )
t_after = int(round(time.time() * 1000))
print " - Pickling: %i ms" % (t_after - t_before)

print "Lens: %i, %i" % (len(v), len(d))

t_before = int(round(time.time() * 1000))
c2 = HistogramStore._unpickle( v, d)
t_after = int(round(time.time() * 1000))
print " - Unpickling: %i ms" % (t_after - t_before)

print "Check : %r" % all([c[i].equal(c2[i]) for i in range(0, len(c))])

"""
h1 = Histogram.fromFLAT('C:\\Users\\icharala\\Local\\Shared\\ref-data\\pythia-8-default.dat')
h2 = Histogram.fromFLAT('C:\\Users\\icharala\\Local\\Shared\\ref-data\\ALEPH_1996_S3486095.dat')

kParts = h1.name.split("/")

hRef = Histogram.fromAIDA("C:\\Users\\icharala\\Local\\Shared\\ref-data\\data\\%s.aida" % kParts[1], kParts[2])

print "---[ %s ]----------" % hRef.name
print hRef.isNormalized()

print "---[ %s ]----------" % h2.name
print h2.isNormalized()

print "---[ %s ]----------" % h1.name
print "nEvts=%s" % h1.meta['nevts']
print h1.isNormalized()
"""


"""
# ######## START FEEDING THE INTERPOLATOR #################

ipol = False

# Populate histogram database
if not ipol:
	t = build_tunes(1)
	i = 0
	for tune in t:
		hCollection = build_histos(tune)

		t_before = int(round(time.time() * 1000))
		coeff = np.polyfit( hCollection[0].x, hCollection[0].y, 2 )
		print coeff

		t_after = int(round(time.time() * 1000))
		print " - Fitting: %i ms" % (t_after - t_before)

		#HistogramStore.append(tune, hCollection)
		#print "#%i" % i
		i += 1

# Otherwise interpolate
else:

	csv = [ ]

	t = build_tunes(10)
	idx = 0
	avgv = [ ]
	for tune in t:

		# Tune name
		csv_line = ",Tune #%i" % idx
		csv.append(csv_line)

		# Tune values
		csv_line = ",Tunes:"
		for k,v in tune.iteritems():
			csv_line += ",%s:%f" % (k,v)
		csv.append(csv_line)
		csv.append("")

		# Get interpolator
		ipolator = HistogramStore.getInterpolator(tune)
		if ipolator:

			# Interpolate values
			histograms = ipolator(*tune.getValues())

			# Get real-data histograms
			realHistos = build_histos(tune)

			# Compare one by one
			avg = 0
			for i in range(0, len(realHistos)):

				chi2 = realHistos[i].chi2ToReference(histograms[i])
				avg += chi2
				print "%i: [#%i] %f" % (idx, i, chi2)

				# Get histograms
				rhY = realHistos[i].y
				ipolY = histograms[i].y

				# Put headers
				csv_line = ""
				for j in range(0, len(rhY)):
					csv_line += ",Bin#%i" % j
				csv.append(csv_line)

				# Put data
				csv_line = "Real"
				for j in range(0, len(rhY)):
					csv_line += ",%f" % rhY[j]
				csv.append(csv_line)

				csv_line = "Interpolated"
				for j in range(0, len(ipolY)):
					csv_line += ",%f" % ipolY[j]
				csv.append(csv_line)

			# Store average
			avgv.append( avg / len(realHistos) )

		# Index
		idx += 1

	# Calculate overall average
	avg = sum(avgv) / len(avgv)
	print "Average: %f" % avg

	# Save CSV
	with open('out.csv', 'w') as f:
		for line in csv:
			f.write(line + "\r")


"""


"""
import numpy as np
from interpolator.scipy.interpolate import Rbf

# Create tune
tune = Tune({ "a": 1, "sec": 3, "third": 4 },labid="this-is-my-lab")
print "TUNE=%s" % tune.getID()

# Prepare histograms
hist_a = Histogram(bins=10, y=np.array([1,2,3,4,5,6,7,8,9,10]))
hist_b = Histogram(bins=10, y=np.array([11,12,13,14,15,16,17,18,19,20]))
hist_c = Histogram(bins=10, y=np.array([21,22,23,24,25,26,27,28,29,30]))

# Create a collection
col_a = HistogramCollection()
col_b = HistogramCollection()
col_c = HistogramCollection()

# Put histograms in the collection
col_a.beginUpdate()
col_a.add(hist_a)
col_a.endUpdate()

col_b.beginUpdate()
col_b.add(hist_b)
col_b.endUpdate()

col_c.beginUpdate()
col_c.add(hist_c)
col_c.endUpdate()

print repr(col_a.data)
print repr(col_b.data)
print repr(col_c.data)

# Interpolator index
a = np.array([1,2,3])
b = np.array([1,2,3])
c = np.array([1,2,3])

# Create interpolator
rbf = Rbf(a,b,c,[col_a,col_b,col_c])

# Get interpolation
col_i = rbf(*tune.getValues())

print repr(col_i.data)
"""
