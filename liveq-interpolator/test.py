#!/usr/bin/python

import numpy as nm
from interpolator.scipy.interpolate import Rbf
from interpolator.data import HistogramCollection, Histogram

# Prepare histograms
hist_a = Histogram(bins=10)
hist_b = Histogram(bins=10)
hist_c = Histogram(bins=10)

# Create a collection
c = HistogramCollection()

# Put histograms in the collection
c.beginUpdate()
c.add(hist_a)
c.add(hist_b)
c.add(hist_c)
c.endUpdate()

hist_a.y[0] = 1.0
hist_b.y[0] = 2.0
hist_c.y[0] = 3.0

print repr(c.data)