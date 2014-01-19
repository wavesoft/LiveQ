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

import os
import ConfigParser
import json
import re

# Precompiled regular expressions
RE_SPACESPLIT = re.compile( r"[ \t]+" )
RE_COMMASPLIT = re.compile( r"\s*,\s*")
RE_MENUSPLIT = re.compile( r"\s*\!\s*" )
RE_EMPTYLINE = re.compile(r"^\s*$")

# TLatex to LaTeX macros 
GREEK_TEX = ('alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu',
		 'nu', 'xi', 'omicron', 'pi', 'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega',
		 'bar')

def loadMCPlots(confFile):
	"""
	Load mcplots configuration
	"""

	# Read config file(s)
	Config = ConfigParser.ConfigParser()
	Config.optionxform = str
	if not Config.read(confFile):
		return None

	# Process abbreviations section
	abbr = { }
	for o,v in Config.items("abbreviations"):
		abbr[o] = re.split(RE_MENUSPLIT, v)

	# Process styles section
	styles = { }
	for s,v in Config.items("styles"):
		styles[s] = re.split(RE_SPACESPLIT, v)

	# Process tunegroups section
	tunegroups = { }
	for tg, v in Config.items("tunegroups"):
		tunegroups[tg] = re.split(RE_COMMASPLIT, v)

	# Read sections 
	return {
		'abbreviations': abbr,
		'styles': styles,
		'tunegroups': tunegroups,
	}

def loadRivetHistograms(confFile):
	"""
	Load rivet histograms configuration 
	"""

	# Prepare histogram-name based indexed response
	ans = { }

	# Get the names of the observables that we collected while processing the file
	observables = [ ]

	# Read line-by line and split components
	with open( confFile ,"r" ) as f:
		for line in f:

			# Trim end-of-line
			line = line[:-1]

			# Skip comments and empty
			if (line.startswith("#")) or (re.match(RE_EMPTYLINE, line)):
				continue

			# Parse parts
			parts = re.split(RE_SPACESPLIT, line)

			# Convert the histogram name into something that
			# we can lookup from the histogram name
			nameParts = parts[4].split("_")
			name = "/" + "_".join(nameParts[:-1]) + "/" + nameParts[-1]

			# Get energy
			beam = parts[0]
			process = parts[1]
			energy = parts[2]
			params = parts[3]
			observable = parts[5]
			cuts = parts[6]

			# Store everything under that name & Energy
			if not name in ans:
				ans[name] = {}
			if not energy in ans[name]:
				ans[name][energy] = {}
			if not beam in ans[name][energy]:
				ans[name][energy][beam] = {}
			if not process in ans[name][energy][beam]:
				ans[name][energy][beam][process] = {}

			# Collect observables
			if not observable in observables:
				observables.append(observable)

			# Place objecect
			ans[name][energy][beam][process][params] = parts[5:]

	# Return answer
	return (ans, observables)

(histos, obs) = loadRivetHistograms( "/Users/icharala/Develop/mcplots/trunk/scripts/mcprod/configuration/rivet-histograms.map" )
mcplots = loadMCPlots( "/Users/icharala/Develop/mcplots/trunk/www/mcplots.conf" )


for o in obs:

	# Skip missing observables
	if o == "-":
		continue

	# Get LaTeX representation of the observable
	a_observable = mcplots['abbreviations'][o]
	png = "%s/%s.png" % ( "tex-images", o )

	# Convert spaces
	TeX = a_observable[2]
	TeX = TeX.replace( " ", "\\: " )

	# Get TeX representation
	for w in GREEK_TEX:
		TeX = TeX.replace("#%s" % w, "\\%s " % w)
		TeX = TeX.replace("#%s%s" % (w[0].upper(), w[1:]), "\\%s%s " % (w[0].upper(), w[1:]))

	print "[%s] : %s" % ( o, TeX )
	os.system("./tex2png.sh '%s' '%s'" % ( 
			TeX.replace("'", "'\\''"), png.replace("'", "'\\''") 
			))

# Process histograms
#print json.dumps(histos, sort_keys=True, indent=2, separators=(',', ': '))
