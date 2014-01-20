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

#
# TODO: Rerwite this in order to use the yoda files that come with rivet, instead of the /dat folder
#       of MCPlots
#

import shutil
import os
import ConfigParser
import json
import re
import glob

# Precompiled regular expressions
RE_SPACESPLIT = re.compile( r"[ \t]+" )
RE_COMMASPLIT = re.compile( r"\s*,\s*")
RE_MENUSPLIT = re.compile( r"\s*\!\s*" )
RE_EMPTYLINE = re.compile(r"^\s*$")
RE_WHITESPACE = re.compile(r"\s+")

def parseFLAT(filename):
	"""
	Function to read a FLAT file into python structures
	"""
	sections = {}
	section = None
	activesection = None

	# Very simple FLAT file reader
	with open(filename, 'r') as f:

		# Read and chomb end-of-lie
		while True:

			# Read next line and chomp \n
			line = f.readline()
			if not line:
				break
			line = line[:-1]

			# Process lines
			if not line:
				# Empty line
				pass

			elif line.startswith("# BEGIN "):

				# Ignore labels found some times in AIDA files
				dat = line.split(" ")
				section = dat[2]
				sectiontype = 0

				# Allocate section record
				activesection = { "d": { }, "v": [ ] }

			elif line.startswith("# END ") and (section != None):
				# Section end
				sections[section] = activesection
				section = None

			elif line.startswith("#") or line.startswith(";"):
				# Comment
				pass

			elif section:
				# Data inside section

				# Try to split
				data = line.split("=",1)

				# Could not split : They are histogram data
				if len(data) == 1:

					# Split data values
					data = RE_WHITESPACE.split(line)
					activesection['v'].append(data)

				else:

					# Store value
					activesection['d'][data[0]] = data[1]

	# Return sections
	return sections

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

			# Store the observable record only if observable is not "-"
			if observable != "-":

				# Ensure histogram entry exists
				if not name in ans:
					ans[name] = [ ]

				# Store the observable this histogram provides
				ans[name].append( [observable, beam, process, energy, params, cuts] )


	# Return answer
	return ans

def analyzeDAT(baseDir):
	"""
	Load all the FLAT files from the given directory and populate the histogram fields
	according to their information.
	"""

	# Prepare response
	ans = { }
	ref = { }

	# Prepare files array
	flatFiles = []
	refFiles = []

	# Recursively walk base dir and collect only the .dat files
	# that also have a .params file (theoretical data). Everything 
	# else is reference data or parameters.
	for root, dirs, files in os.walk(baseDir):
	    for f in files:
	    	if f.endswith(".dat"):
	    		if ("%s.params" % f[:-4]) in files:
	    			# If it has a params file, it's a simulation file
	    			flatFiles.append( os.path.join( root, f ) )
	    		else:
	    			# If it has no .params file, it's a reference file
	    			refFiles.append( os.path.join( root, f ) )
	
	# Parse reference files
	for rf in refFiles:

		# Read the file
		fdata = parseFLAT(rf)
		try:

			# Read the histogram name
			hname = fdata['HISTOGRAM']['d']['AidaPath']

			# Ensure it's a REF file
			if not hname.startswith("/REF"):
				continue

			# Map histogram path to filename
			ref[hname[4:]] = rf

		except KeyError as e:
			print "!!! Could not load FLAT file %s: Missing section %s" % (ff, str(e))

	# Fetch the FLAT files
	for ff in flatFiles:

		# Read the file
		fdata = parseFLAT(ff)
		try:

			# Read the histogram name
			hname = fdata['HISTOGRAM']['d']['AidaPath']

			# Get plot metainfo
			plotMeta = fdata['PLOT']['d']
			plotTitle = plotMeta['Title']
			plotXLabel = plotMeta['XLabel']
			plotYLabel = plotMeta['YLabel']

			# Check for collisions
			if hname in ans:
				print ">>> COLLISION <<<"

			# Locate reference histogram
			refFile = None
			if hname in ref:
				refFile = ref[hname]

			# Store metainfo under histogram name
			ans[hname] = {
				'title': plotTitle,
				'xlabel': plotXLabel,
				'ylabel': plotYLabel,
				'ref': refFile
			}

		except KeyError as e:
			print "!!! Could not load FLAT file %s: Missing section %s" % (ff, str(e))

	# Return the metainfo obtained from FLAT files
	return ans

def renderTEX(TeX, image, overwrite=False):
	"""
	Render the given TEX equation to the given image
	"""

	# Check if file exists
	if os.path.isfile(image) and not overwrite:
		return

	# Convert spaces
	TeX = TeX.replace( " ", "\\: " )

	# Convert ROOT Macros
	for w in GREEK_TEX:
		TeX = TeX.replace("#%s" % w, "\\%s " % w)
		TeX = TeX.replace("#%s%s" % (w[0].upper(), w[1:]), "\\%s%s " % (w[0].upper(), w[1:]))

	# Render image
	os.system("./tex2png.sh '%s' '%s'" % ( 
			TeX.replace("'", "'\\''"), image.replace("'", "'\\''")
			))


histos = loadRivetHistograms( "/Users/icharala/Develop/mcplots/trunk/scripts/mcprod/configuration/rivet-histograms.map" )
mcplots = loadMCPlots( "/Users/icharala/Develop/mcplots/trunk/www/mcplots.conf" )
flatinfo = analyzeDAT( "/Users/icharala/Develop/LiveQ/tools/dat.local" )
out_dir = "ref.local"

# Get histogram keys
hkeys = histos.keys()

# Start processing histograms
for name in hkeys:

	# Check if such histogram was found
	print "- %s: " % name,

	# Fetch metainfo from flat
	if not name in flatinfo:
		del histos[name]
		print "No FLAT info"
		continue
	meta = flatinfo[name]

	# Get the observable name
	idx = 0
	hasSomething = False
	observables = histos[name]
	for observable in observables:
		obsname = observable[0]
		print "(%s: " % obsname,

		# Fetch abbreviation description from MCPlots config
		if not obsname in mcplots['abbreviations']:
			print "No abbreviation found"
			continue
		abbrInfo = mcplots['abbreviations'][obsname]

		# Prepare TeX images for this histogram
		histoTeXName = name[1:].replace("/", "_")
		histoTeXBase = "%s/tex/%s" % (out_dir, histoTeXName)

		# Collect reference data
		refDst = ""
		if meta['ref']:
			refDst = os.path.basename( meta['ref'] )
			dst = "%s/ref/%s" % (out_dir, refDst)
			if not os.path.isfile(dst):
				shutil.copyfile( meta['ref'], dst )

		# Render title, x-label and y-label to images
		print "TeX Title...",
		renderTEX( "{\\large %s}" % meta['title'], "%s.png" % histoTeXBase)
		print "TeX XLabel...",
		renderTEX( meta['xlabel'], "%s-x.png" % histoTeXBase )
		print "TeX YLablel...",
		renderTEX( meta['ylabel'], "%s-y.png" % histoTeXBase )

		# Put histogrm title and texBase name under this observable
		histos[name][idx] += [
				abbrInfo[0], # Group name
				abbrInfo[1], # HTML Name
				refDst, 	 # Reference histogram
				histoTeXName # LaTeX image base ID
			]

		hasSomething = True
		idx += 1
		print ")",

	# If we didn't have an observable, remove this from registry
	if not hasSomething:
		del histos[name]


	print " ok"

# Now we have all the extra info, dump description to file
with open("%s/description.json" % out_dir, "w") as f:
	f.write(json.dumps(histos, sort_keys=True, indent=2, separators=(',', ': ')))

