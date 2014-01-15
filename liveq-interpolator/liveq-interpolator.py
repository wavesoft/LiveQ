#!/usr/bin/python
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

# ----------
import sys
sys.path.append("../liveq-common")
# ----------

import logging
import time
import signal
import sys

from interpolator.config import Config
#from jobmanager.component import InterpolatorComponent

from liveq import handleSIGINT
from liveq.events import GlobalEvents
from liveq.exceptions import ConfigException

#-------------
import random
import numpy as np
from liveq.data.histo import Histogram, HistogramCollection
from liveq.data.tune import Tune
from interpolator.data.store import HistogramStore
#-------------

# Prepare runtime configuration
runtimeConfig = { }

# Load configuration
try:
	Config.fromFile( "config/interpolator.conf.local", runtimeConfig )
except ConfigException as e:
	print("ERROR   Configuration exception: %s" % e)
	sys.exit(1)

# Hook sigint -> Shutdown
handleSIGINT()

#-------------

tune_keys = [ "Main:numberOfEvents","Main:timesToShow","Main:timesAllowErrors",
		      "Main:showChangedSettings","Main:showChangedParticleData","Next:numberShowEvent",
		      "Random:setSeed","Random:seed","Beams:idA","Beams:idB","Beams:eCM","HardQCD:all",
		      "PhaseSpace:pTHatMin","PhaseSpace:pTHatMax","PhaseSpace:mHatMin","PhaseSpace:mHatMax",
		      "ParticleDecays:limitTau0","ParticleDecays:tau0Max","Tune:pp" ]

tune_keys = ['a','b','c','d']

# Generate a random tune
def genTune(labid):
	
	# Generate random data
	data = { }
	for v in tune_keys:
		data[v] = random.random() * 100

	# Generate tune
	return Tune(data, labid=labid)

# Generate a number of histograms (observables)
def genObservables(number=50, bins=10):

	# Start collection
	hc = HistogramCollection()
	hc.beginUpdate()

	for i in range(0,number):

		# Create histogram
		h = Histogram(
				bins=bins,
				y = np.random.rand(100)*10,
				yErrPlus = np.random.rand(100),
				yErrMinus = np.random.rand(100)
			)

		# Add on collection
		hc.append( h )

	# Done with the update
	hc.endUpdate()
	return hc

#-------------

tune = genTune(1)
#nb = HistogramStore.getNeighborhood(tune)

#print "Neighborhood: %s" % repr(nb)

t_before = int(round(time.time() * 1000))
ip = HistogramStore.getInterpolator(tune)
t_after = int(round(time.time() * 1000))

print "Tune: %s" % tune
print "Interpolator: %s" % repr(ip)

print "Loading time: %i ms" % (t_after - t_before)

t_before = int(round(time.time() * 1000))
v = ip(*tune.getValues())
t_after = int(round(time.time() * 1000))

print "Interpolate time: %i ms" % (t_after - t_before)

print "==================================="
print "Num. Histograms: %i" % len(v)
#for histo in v:
#	print "------"
#	print "Yv: %s" % str(histo.y)
#	print "E+: %s" % str(histo.yErrPlus)
#	print "E-: %s" % str(histo.yErrMinus)
print "==================================="

sys.exit(0)

#-------------

"""
# Metrics
genMin = 0
genMax = 0
genSum = 0
setMin = 0
setMax = 0
setSum = 0

# Populate database with random data
for i in range(0,1000):

	print "Entry %i:" % i

	# Generate random data
	print " = Generate: ",
	t_before = int(round(time.time() * 1000))
	tune = genTune(1)
	data = genObservables()
	t_after = int(round(time.time() * 1000))

	diff = t_after - t_before
	genSum += diff
	if i == 0:
		genMin = diff
		genMax = diff
	else:
		if diff < genMin:
			genMin = diff
		if diff > genMax:
			genMax = diff
	print "ok (%i ms)" % diff

	# Store
	t_before = int(round(time.time() * 1000))
	HistogramStore.append( tune, data )
	t_after = int(round(time.time() * 1000))

	diff = t_after - t_before
	setSum += diff
	if i == 0:
		setMin = diff
		setMax = diff
	else:
		if diff < setMin:
			setMin = diff
		if diff > setMax:
			setMax = diff
	print " = Store: ok (%i ms)" % diff

# Print statistics
print "******"
print "Setting : %i - %i (Avg %.2f ms)" % (setMin, setMax, (setSum / 1000))
print "Generating : %i - %i (Avg %.2f ms)" % (genMin, genMax, (genSum / 1000))
"""
