#!/usr/bin/env python
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

import os
import math
import numpy as np
import matplotlib.pyplot as plt
from util.config import Config
from util.histoviz import plotHistograms

from liveq import handleSIGINT, exit
from liveq.exceptions import ConfigException
from liveq.models import Tunable

from liveq.data.histo.intermediate import IntermediateHistogramCollection
from liveq.data.histo.reference import loadReferenceHistogram

# Prepare runtime configuration
runtimeConfig = { }

# Load configuration
try:
	Config.fromFile( "config/common.conf.local", runtimeConfig )
except ConfigException as e:
	print("ERROR   Configuration exception: %s" % e)
	exit(1)

# Validate arguments
if len(sys.argv) < 2:
	print "ERROR: Please specify a histogram dump to view!"
	print "Usage: view-histodump.py [subplots] ... [histodump]"
	sys.exit(1)

# Get filename
subset = sys.argv[1:]
dumpFilename = subset.pop()
if not os.path.exists(dumpFilename):
	print "ERROR: The dump file %s does not exist!" % dumpFilename
	print "Usage: view-histodump.py [subplots] ... [histodump]"
	sys.exit(1)

# Load dump from file
try:
	histograms = IntermediateHistogramCollection.fromPackFile( dumpFilename )
except Exception as e:
	print "ERROR: Exception while loading the histogram collection: %s" % str(e)
	sys.exit(2)

# Print details
print "     Histograms: %i" % len(histograms)

# Get a part of histograms to render
if len(subset) > 2:
	print "Plotting subset: %s" % "j".join(subset)

# Plot histograms
plotHistograms( histograms, subset, ref=True )
