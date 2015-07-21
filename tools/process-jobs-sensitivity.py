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

from SALib.sample import saltelli
from SALib.analyze import sobol
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
		print "ERROR: Could not find model input file %s!" % sys.argv[2]
		sys.exit(1)
	if not os.path.isfile(sys.argv[2]):
		print "ERROR: Could not find model output file %s!" % sys.argv[2]
		sys.exit(1)

	fIn = sys.argv[1]
	fOut = sys.argv[2]

	fParameters = "sens.parameters"
	if (len(sys.argv) > 2):
		if not os.path.isfile(sys.argv[3]):
			print "ERROR: Could not find parameters file %s!" % sys.argv[2]
			sys.exit(1)
		fParameters = sys.argv[3]

	# Load parameters
	print " - Reading parameters"
	sens_problem = read_param_file('sens.parameters')

	# Load input
	print " - Reading input"
	with open(fIn, 'r') as f:
		while line = f.readline():
			# Read input
			parts = line.split(" ")
			sens_input = [ float(x) for x in parts ]

