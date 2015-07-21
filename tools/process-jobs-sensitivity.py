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

import os
import sys
import json
import code
import time
import traceback

from SALib.sample import saltelli
from SALib.analyze import delta
from SALib.test_functions import Ishigami
from SALib.util import read_param_file
import numpy as np

from multiprocessing import Pool, Manager
from threading import Thread, Lock

#: Number of parallel workers
NUM_WORKERS = 8

def analyzeSampleSensitivity(args):
	"""
	Analysis map function
	"""

	index = args[0]
	problem = args[1]
	X = args[2]
	Y = np.array(args[3])
	queue = args[4]

	# Find sensitive parameters
	try:
		S = delta.analyze(problem, X, Y, print_to_console=False)
	except Exception as e:
		print "Error: %s" % str(e)
		queue.put( (index,None) )
		return

	# Return the 'most correlated' parameters
	queue.put( (index, S['S1']) )

if __name__ == "__main__":

	# Ensure we have at least one parameter
	if len(sys.argv) < 3:
		print "Analyze MCPlot job completion statistics"
		print "Usage:"
		print ""
		print " process-jobs-sensitivity.py <model input> <model output> [<parametrs>]"
		print ""
		sys.exit(1)

	# Check if we have directory
	if not os.path.isfile(sys.argv[1]):
		print "ERROR: Could not find model input file %s!" % sys.argv[1]
		sys.exit(1)
	if not os.path.isfile(sys.argv[2]):
		print "ERROR: Could not find model output file %s!" % sys.argv[2]
		sys.exit(1)

	fIn = sys.argv[1]
	fOut = sys.argv[2]

	fParameters = "sens.parameters"
	if (len(sys.argv) > 3):
		if not os.path.isfile(sys.argv[3]):
			print "ERROR: Could not find parameters file %s!" % sys.argv[3]
			sys.exit(1)
		fParameters = sys.argv[3]

	# Load parameters
	print " = Reading parameters"
	sens_problem = read_param_file('sens.parameters')
	print " -- Using %i dimentions" % sens_problem['num_vars']

	# Load histograms
	print " = Reading histograms"
	sens_histograms = []
	with open('sens.histograms', 'r') as f:
		for line in f:
			sens_histograms.append( line.strip() )
	print " -- Using %i histograms" % len(sens_histograms)

	# Load input
	print " = Reading input"
	sens_input = []
	with open(fIn, 'r') as f:
		for line in f:
			# Read input
			parts = line.strip().split(" ")
			sens_input.append([ float(x) for x in parts ])
	print " -- Read %i samples" % len(sens_input)
	X = np.array(sens_input)

	# Create n-dimentional outout
	sens_output = [ [] for x in sens_histograms ]

	# Load input
	print " = Reading output"
	with open(fOut, 'r') as f:
		for line in f:
			# Read input
			parts = line.strip().split(" ")
			values = [ float(x) for x in parts ]

			# Store output values to each output dimention
			for i in range(0, len(values)):
				sens_output[i].append(values[i])

	print " -- Read %i samples" % len(sens_output[0])

	# Validate
	if len(sens_output[0]) != len(sens_input):
		print " !! Mismatch input/output file data"
		sys.exit(1)

	# Process the data with a multi-threaded worker queue
	manager = Manager()
	outputQueue = manager.Queue()

	# Run a pool of 4 workers
	print " = Analyzing sensitivity with %i workers" % NUM_WORKERS
	pool = Pool(NUM_WORKERS)
	r = pool.map_async( 
		analyzeSampleSensitivity, 
		[(i, sens_problem, X, sens_output[i], outputQueue) for i in range(0, len(sens_output)) ]
	)

	# Wait all workers to complete and print queue output
	eCount = 0
	ans = { }
	while (not r.ready()) or (not outputQueue.empty()):

		# Get element
		try:
			# Drain when completed
			(index, S1) = outputQueue.get(False)
		except Exception:
			# Queue is empty, retry in a while
			time.sleep(0.1)
			continue

		# Get element count
		eCount += 1

		# Get histogram name
		histoName = sens_histograms[index]
		if S1 is None:
			print " --[%03i/%03i] Error processing histogram %s" % (eCount, len(sens_output), histoName)
			continue

		# Log
		print " --[%03i/%03i] Correlations of histogram %s" % (eCount, len(sens_output), histoName)

		# Find the maximum correlation value
		maxVal = np.max(S1)
		maxItem = list(S1).index(maxVal)
		print " --- Mostly correlated with %s (%f)" % ( sens_problem['names'][maxItem], maxVal )

		# Find one or more reasonably correlated variables
		corr = [ ]
		for j in range(0,len(S1)):
			if abs(S1[j] - maxVal) <= 0.12:
				print " --- Found with %s (%f)" % ( sens_problem['names'][j], S1[j] )
				corr.append({
						"property": sens_problem['names'][j],
						"strength": S1[j]
					})

		# Store on analysis index
		ans[histoName] = {
			"most": sens_problem['names'][maxItem],
			"all": corr
		}

	# Print results
	print "--------"
	print json.dumps(ans)
