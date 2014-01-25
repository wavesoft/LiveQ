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

from liveq.data.histo import Histogram
from liveq.data.histo.collection import HistogramCollection
from liveq.data.histo.interpolate import InterpolatableCollection
from liveq.data.tune import Tune

from interpolator.data.store import HistogramStore
from interpolator.config import Config
from interpolator.scipy.interpolate import Rbf

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
Tune.LAB_TUNE_KEYS[45] = [ 'a','b','c'] #,'d','e','f' ]

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

			# Clip y-value
			y = np.clip( h.y, 0.000001, np.max(h.y) )

			# Plot just the basic plot with the specified color
			ax.errorbar( 
				h.x, y, 
				yerr=[h.yErrMinus, h.yErrPlus], xerr=[h.xErrMinus, h.xErrPlus],
				color=col,
				label=h.name
				 )

	# Display plot
	plt.show()

def getInterpolator(collections, function='linear'):

	# Iterate over items and create interpolation indices and data variables
	datavalues = [ ]
	indexvars = [ ]
	for hc in collections:

		# Fetch index cariables
		datavalues.append(hc)
		indexvars.append(hc.tune.getValues())

	# Flip matrix of indexvars
	indexvars = np.swapaxes( np.array(indexvars), 0, 1 )

	# Nothing available
	if len(indexvars) == 0:
		return None

	# Create and return interpolator
	return Rbf( *indexvars, data=datavalues, function=function )

def avgChi2(c1, c2):

	if len(c1) != len(c2):
		raise ValueError("The two collections don't have the same number of histograms")

	vsum = 0
	for i in range(0,len(c1)):

		# Get instances
		h1 = c1[i]
		h2 = c2[i]

		# Chalculate CHI2 between those two
		v = h1.chi2ToReference(h2)
		vsum += v

	# Return value
	return (vsum / len(c1))

##############################################################################################################
##############################################################################################################
####
#### Test code
####
##############################################################################################################
##############################################################################################################

"""
num = 50
fv = 1.0
maxVal = 3.14

@np.vectorize
def run_fn(x,y):
	#return (1.0/math.sqrt(1.0 + x**2 + y**2)) - (4 * x ** 2 * y * math.e ** math.sqrt(x**2 + y ** 2))
	return np.sin(0.01*math.log(x+maxVal+.01)*fv) * np.sin(y/fv)

@np.vectorize
def run_ipol(a,b,p):
	return p(a,b)

delta = 0.025
x = np.arange(-maxVal, maxVal, delta)
y = np.arange(-maxVal, maxVal, delta)
X, Y = np.meshgrid(x, y)

# Run function for the given grid data
Z1 = run_fn(X.flatten(), Y.flatten()).reshape(X.shape)

# Populate scattered grid
v_index = np.random.random([2,num]) * maxVal * 2 - maxVal
v_data = run_fn(v_index[0], v_index[1])

# Create interpolator and build interpolator grid
ipol = Rbf(*v_index, data=v_data, function='multiquadric')
Z2 = run_ipol(X.flatten(), Y.flatten(), ipol).reshape(X.shape)

# Begin figure
plt.figure()

# Plot the reference contour
CS = plt.contour(X, Y, Z1, colors='k')
plt.clabel(CS, inline=1, fontsize=10)

# Plot the interpolator contour
CS2 = plt.contour(X, Y, Z2, colors='b')
plt.clabel(CS2, inline=1, fontsize=10)
plt.scatter(v_index[0], v_index[1], marker='o', c='b', alpha=0.5)

plt.title("RBF %s interpolation, %i samples" % (ipol.function, num))
plt.show()
"""

"""
# Ignore ranking warnings from numpy
import warnings
warnings.simplefilter('ignore', np.RankWarning)

# Run over the histogram collection
import glob
import os
files = glob.glob("/Users/icharala/Develop/LiveQ/tools/rivet.local/*.dat")

ranks = np.zeros(20)
nranks = 0

j = 0
for f in files:

	# Load histo
	print "[%i/%i] %s..." % (j, len(files), os.path.basename(f)),
	histo = Histogram.fromFLAT(f)
	j += 1

	# Validate
	if not histo:
		print "could not load"
		continue
	if histo.bins < 5:
		print "too few bins"
		continue

	# Extimate best rank values
	nranks += 1
	for i in range(1,21):

		try:
			(coeff, meta) = histo.polyFit(deg=i)
			histo2 = Histogram.fromFit(coeff, meta)
		except:
			print " [error] "
			break

		try:
			rank = histo.chi2ToReference(histo2)
		except ValueError:
			rank = 100

		if rank < 1:
			ranks[i-1] += 1

	# OK
	print "ok"

# Summarize
ranks /= nranks

for i in range(0,20):
	print "%i = %f" % (i+1, ranks[i])
"""

"""
buf = "XQAAgAAAAISEZM8FJZFdt68n8AfwbCc0AMdzbxv+tfON2cpEoilvr7f0laXvGIEDPkFiePx2GXMq6ggA2bPqns8bDWBDQTsYhTRFVBlZEHKKOcz/bHABdkZ78Buk94Xk6a7HFlqyS+XvKW6IMpyLtdiqZS11mvA6GVLAqIh499mw2dvWfzMuJiEXnrQHPe9DZaOM6B6b55te+hTz3i2ZkZAcLt0jUYKMqCpdlcpsItAOXvvSqH5Ss6PDYTpuTz2K2f1pFG6wBI2LHwctEboAoojuQbP6RpgG7zTO7LaLOMBKIa1pyRUDUNYKYYp44G4UwMWHNSzOIyD1ZmxVw4u2WIB1UnhUETjbTrl///pHWD19iwtcjthw3IjBYnQVm01fQa4w+ihkHy7+x0vH9N/avnVolpyA9CVe0l4J7DmwJpBczMCP6BP2j7ArGn8nOX8okqL0lS/HMONN3aExxdj2YI5OVhkRvaEDukfqwxVMnB0QO35/ybx1OiBfOz4uuOviHd6Im4ewOMWcyHYcA5FVnB7MnNNtXL5MNusOzIyElTUzIlLBlKkfM0LqQcrCceGiVc41WlxQEMaZxk9VhO6yBjIyk2tG4olG9fPKitikOcxHhLOT5r41hHtzkViIWOVqOLPO0ZZ0ZU9SKvejSj918MpSJiAmkKf9VXcEzut37RdMLWBbssegGKwUj2ahDwK5251WEyTue8h78nXx7qeodQHZRJkmHyGcY1kBkYra+aQ+V7L4JYSMKnEaFrmOmXGaR7lnLlqJoRhKthq9CoUWxnxhV08lQuZKhQEPowmaIIx/szN+FZ7oFzMR5X+DqtQzO3s3g2TUExk9XsPKS3YHGvbrHtBmDdgzbBI6iwX0JSu463PQzRDvk6IXGZV1VqRUh2Nh4hLqK+3X+4oM/VWy0wibCXcoL73PcPVBHgJmE2nVXmdBn2Qfq4jnsoOgbs15ed2/g65I3sGnc0EhMgmO63O6hCtlKX9lMRzOglXez1ZPsUZ8kVd+zM8sLxGxq55y34mGUkTHzXBygMGvJ1orvR0N7ow8bt4144p1OWUvs02U0o/5Cy3ezyHJ1qjRIv/ZItIRTFPimMrxKImQF56JAWKW2vBiSHF5xHGNE8kbEBYmDBBUQtN2w1iJX5ZQF8Yr4+foFKiNeR94hQ4gLamYYNJVQvNcE6qG5z+GJelsDc+csLVi0gBEk1s7SsiBX0DiA1SvOLxjjTaeRP5I2956R2lt256xrzZ+nYyVfv6oPmTJME96CVGLBDPiBW8mu+McYRuCopNoGKfzywasKLenoaLZwESSz66wzZup0l0DTmpu/DwuPvIZXM3polynrjIsTZgmx8vlmZJkEMqpCLYp8BzzIBjzVgoolZoSpy13grOU8yyfoYyamISVHDiSwuqMxx3dwQLR1Nogxj4BTXCMAbyS8l5bh6q3y90QhSe4Vt/G9+b31eeHqB2l5C7umJZBGF/mSvyEPLDoO7tAZNF6E9T7Za9+SQePQCKHA+xDu5nnHqvJ2suY8nxJ94y+gy/L1IUGi9BTYNql4yRjVmrX+P6CSe+v13t560H6ZXKNXYVkDCimQ0Poa5pPUz3i+WZ61blFKe+ZC/dg7IYEkxy/Yp04QUCUZUVRUpwWWzPPfZT0Ype2SICRgnnlzQcWabZHe2761nP8zaeX"

ic = InterpolatableCollection.fromPack(buf)
ic.regenHistograms()

print ic.keys()

plot_histos([ic.values()])
"""

from interpolator.data.store import HistogramStore

t = Tune({'StringZ:bLund': 0.8, 'TimeShower:alphaSvalue': 0.14, 'StringZ:aLund': 0.3}
, labid="3e63661c13854de7a9bdeed71be16bb9")
histos = HistogramStore.getNeighborhood(t)
ans = [[],[]]
for h in histos:
	h.regenHistograms()
	print "Regen: %r" % h.keys()
	h1 = h.values()[0]
	h2 = h.values()[1]
	print "Bounds: %f - %f" % (np.min(h2.y), np.max(h2.y))
	if math.isnan(np.min(h2.y)):
		print "NAN!"
		continue
	ans[0].append(h1)
	ans[1].append(h2)

plot_histos(ans)

"""
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

print "Lengths: %i, %i" % (len(v), len(d))

t_before = int(round(time.time() * 1000))
c2 = HistogramStore._unpickle( v, d)
t_after = int(round(time.time() * 1000))
print " - Unpickling: %i ms" % (t_after - t_before)

print "Check : %r" % all([c[i].equal(c2[i]) for i in range(0, len(c))])

t_before = int(round(time.time() * 1000))
ipol = getInterpolator( c )
t_after = int(round(time.time() * 1000))
print " - Building interpolator: %i ms" % (t_after - t_before)

samples = build_tunes(5)
for s in samples:

	t_before = int(round(time.time() * 1000))
	vIpol = ipol.interpolate( s.getValues(), c[0].dataMeta )
	t_after = int(round(time.time() * 1000))
	print " - Interpolating: %i ms" % (t_after - t_before)

	vReal = build_histos( s )

	plot_histos([ [vIpol[0], vReal[0]], [vIpol[1], vReal[1]], [vIpol[2], vReal[2]], [vIpol[3], vReal[3]] ])

"""

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
