#!/usr/bin/python

# ----------
import sys
sys.path.append("../liveq-common")
# ----------



"""
import numpy as np
from interpolator.scipy.interpolate import Rbf

from liveq.data.histo import HistogramCollection, Histogram
from liveq.data.tune import Tune

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
