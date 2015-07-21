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
import traceback

from SALib.sample import saltelli
from SALib.analyze import delta
from SALib.test_functions import Ishigami
from SALib.util import read_param_file
import numpy as np

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
	with open(fIn, 'r') as f:
		for line in f:
			# Read input
			parts = line.strip().split(" ")
			values = [ float(x) for x in parts ]

			# Store output values to each output dimention
			i = 0
			for v in values:
				sens_output[i].append(v)
				i += 1
	print " -- Read %i samples" % len(sens_output[0])

	# Validate
	if len(sens_output[0]) != len(sens_input):
		print " !! Mismatch input/output file data"
		sys.exit(1)

	# Run analyses
	ans = {}
	print " = Running analyses"
	for i in range(0, len(sens_histograms)):

		# Find the appropriate number of samples
		Y = np.array(sens_output[i])
		histoName = sens_histograms[i]
		print " -- Correlations of %s" % histoName

		# Find sensitive parameters
		try:
			S = delta.analyze(sens_problem, X, Y, print_to_console=False)
		except Exception as e:
			traceback.print_exc()
			import code
			code.interact(local=locals())

		S1 = S['S1']


		# Find the maximum correlation value
		maxVal = np.max(S1)

		# Find one or more reasonably correlated variables
		corr = [ ]
		for j in range(0,len(S1)):
			if abs(S1[j] - maxVal) <= 0.15:
				print " --- Found with %s (%f)" % ( sens_problem['names'][j], S1[j] )
				corr.append({
						"property": sens_problem['names'][j],
						"strength": S1[j]
					})

		# Store on analysis index
		ans[histoName] = corr

	# Print results
	print "--------"
	print json.dumps(ans)
