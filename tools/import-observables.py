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

# This script imports all Observables from a Rivet source directory

# ----------
import sys
sys.path.append("../liveq-common")
# ----------

import json
import os
import util.rivet as rivet
import util.mcplots as mcplots
import util.TeX as tex
from util.config import Config

from liveq import handleSIGINT, exit
from liveq.exceptions import ConfigException
from liveq.models import Observable

# Prepare runtime configuration
runtimeConfig = { }

# Load configuration
try:
	Config.fromFile( "config/common.conf.local", runtimeConfig )
except ConfigException as e:
	print("ERROR   Configuration exception: %s" % e)
	exit(1)

# Hook CTRL+C
handleSIGINT()

# Ensure we have at least one parameter
if (len(sys.argv) < 3) or (not sys.argv[1]) or (not sys.argv[2]):
	print "Observables Import Script - Import histogram configuration from Rivet"
	print "Usage:"
	print ""
	print " import-observables.py <path to rivet source> <path to mcplots svn>"
	print ""
	sys.exit(1)

# Check if we have xmldir
if not os.path.isdir("%s/data/plotinfo" % sys.argv[1]):
	print "ERROR: Could not find %s/data/plotinfo!" % sys.argv[1]
	sys.exit(1)
if not os.path.isdir("%s/data/anainfo" % sys.argv[1]):
	print "ERROR: Could not find %s/data/anainfo!" % sys.argv[1]
	sys.exit(1)
if not os.path.isdir("%s/data/refdata" % sys.argv[1]):
	print "ERROR: Could not find %s/data/refdata!" % sys.argv[1]
	sys.exit(1)
if not os.path.isfile("%s/scripts/mcprod/configuration/rivet-histograms.map" % sys.argv[2]):
	print "ERROR: Could not find %s/scripts/mcprod/configuration/rivet-histograms.map" % sys.argv[2]
	sys.exit(1)
if not os.path.isfile("%s/www/mcplots.conf" % sys.argv[2]):
	print "ERROR: Could not find %s/www/mcplots.conf" % sys.argv[2]
	sys.exit(1)

# Load rivet analysis and plot information
rivetData = rivet.loadData("%s/data" % sys.argv[1])
mcplotsHistograms = mcplots.loadHistogramDetails(sys.argv[2])

# Keep all the observables from MCPlots and update
# them with the details from rivet plots.

# Import them
for k,v in mcplotsHistograms.iteritems():

	print "Importing %s..." % k,

	# Check for missing plots
	if not k in rivetData.plots:
		print "skip"
		print "WARNING: Plot %s does not exist in RIVET!" % k
		continue

	# Get plot record
	plotDetails = rivetData.plots[k]

	# Check if it exists
	if Observable.select().where(Observable.name == k).exists():

		# Update fid degress
		if k in rivetData.fitAnalysis:
			v = rivetData.fitAnalysis[k]
			if not v is None:
				t = Observable.get(Observable.name == k)
				t.fitDegree = v[0]
				t.save()
				print "updated"
				continue

		print "exists"
		continue

	# Print plot
	#print(json.dumps(v,sort_keys=True,indent=4, separators=(',', ': ')))

	# Create new entry
	t = Observable(name=k)
	t.setAccelerators( v['accel'] )
	t.short = v['observable']
	t.group = v['observable_name']
	t.subgroup = v['subgroup']

	t.process = v['process']
	t.params = v['params']
	t.cuts = v['cuts']

	# Plot title
	t.title = plotDetails['Title']
	try:
		t.titleImg = tex.toPNG(t.title)
	except IOError:
		print "(TeX Error)",
	del plotDetails['Title']

	# Store analysis
	t.analysis = plotDetails['analysis']
	del plotDetails['analysis']

	# Labels
	if 'XLabel' in plotDetails:
		t.labelX = plotDetails['XLabel']
		try:
			t.labelXImg = tex.toPNG(t.labelX)
		except IOError:
			print "(TeX Error)",
		del plotDetails['XLabel']
	if 'YLabel' in plotDetails:
		t.labelY = plotDetails['YLabel']
		try:
			t.labelYImg = tex.toPNG(t.labelY)
		except IOError:
			print "(TeX Error)",
		del plotDetails['YLabel']
	if 'LogY' in plotDetails:
		t.logY = int(plotDetails['LogY'])

	# Store fidDegree
	if k in rivetData.fitAnalysis:

		# Store fitDegree from a successful fit analysis
		v = rivetData.fitAnalysis[k]
		if not v is None:
			t.fitDegree = v[0]

	# Store plot details
	t.plotInfo = json.dumps(plotDetails)

	# Save record
	t.save()
	print "ok"


#print(json.dumps(mcplotsHistograms,sort_keys=True,indent=4, separators=(',', ': ')))
#print(json.dumps(rivetHistograms.plots,sort_keys=True,indent=4, separators=(',', ': ')))
#sys.exit(0)
