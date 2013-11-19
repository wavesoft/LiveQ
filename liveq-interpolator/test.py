#!/usr/bin/python

# ----------
import sys
sys.path.append("../liveq-common")
# ----------

import time
import math
import numpy as np
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

# Pre-populate tune data for given lab
Tune.LAB_TUNE_KEYS[45] = [ 'a','b','c','d','e','f' ]

#: A function to generate histograms
def histo_function(tune, attenuator, differentiator, vrange=100, voffset=0.5):
	return (abs(attenuator * (
			(
				math.sin( tune['a'] * 0.1 + 4.3 ) +
				math.sin( tune['b'] * 1.5 + 2.612 ) +
				math.sin( tune['c'] * 7.2 + 0.451 )
			) * math.cos( differentiator ) +
			(
				math.sin( tune['d'] * 4.3 + 12.6 ) +		
				math.sin( tune['e'] * 10.6 + 61.0 ) +
				math.sin( tune['f'] * 6.5 + 21.3 )
			) * math.sin( differentiator ) +
			math.sin( math.cos(differentiator) + differentiator )
		) / 3.0)) * vrange + voffset

#: Generate a set of histograms for the given tune
def build_histos(tune, numHistos=10, numBins=10):
	
	ans = HistogramCollection(bins=numBins)
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
					yErrPlus=np.repeat(0.0001, numBins),
					yErrMinus=np.repeat(0.0001, numBins),
					x=binpos,
					xErrPlus=np.repeat(0.0001, numBins),
					xErrMinus=np.repeat(0.0001, numBins),
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

# ######## START FEEDING THE INTERPOLATOR #################

class CSVFile:

	"""
	Create a CSV file
	"""
	def __init__(self, filename):
		self.f = open(filename, "w")

	"""
	Dump a histogram on the CSV file
	"""
	def dumpHistograms(self, histos, titles, header="Histograms"):

		# Write overall header
		self.f.write(",\n")
		self.f.write(",%s\n" % header)

		# Write header
		csv_line = ""
		for k in histos[0].x:
			csv_line += ",%s" % str(k)
		self.f.write("%s\n" % csv_line)

		# Write histogram values
		i = 0
		for title in titles:
			csv_line = "%s" % title
			for k in histos[i].y:
				csv_line += ",%s" % str(k)
			i += 1
			self.f.write("%s\n" % csv_line)



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
