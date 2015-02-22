import re
import glob

# Precompiled regular expressions
RE_SPACESPLIT = re.compile( r"[ \t]+" )
RE_COMMASPLIT = re.compile( r"\s*,\s*")
RE_MENUSPLIT = re.compile( r"\s*\!\s*" )
RE_EMPTYLINE = re.compile(r"^\s*$")
RE_WHITESPACE = re.compile(r"\s+")

# TLatex to LaTeX macros 
GREEK_TEX = ('alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu',
		 'nu', 'xi', 'omicron', 'pi', 'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega',
		 'bar')


def toLaTeX(tlatex):
	"""
	Minimalistic TLatex to LaTeX conversion
	"""

	# Convert spaces
	tlatex = tlatex.replace( " ", "\\: " )

	# Convert ROOT Macros for greek letters
	for w in GREEK_TEX:
		tlatex = tlatex.replace("#%s" % w, "\\%s " % w)
		tlatex = tlatex.replace("#%s%s" % (w[0].upper(), w[1:]), "\\%s%s " % (w[0].upper(), w[1:]))

	# Render image
	return tlatex

class MCPlotsConfig:

	def __init__(self, confFile):

		# Configuration groups
		self.abbr = { }
		self.styles = { }
		self.tunegroups = { }
		self.beamgroups = { }

		# Read line-by line and split components
		section = ""
		with open( confFile ,"r" ) as f:
			for line in f:

				# Trim end-of-line
				line = line[:-1].strip()

				# Skip comments and empty
				if (line.startswith("#")) or (re.match(RE_EMPTYLINE, line)):
					continue

				# Check for section switch
				if line.startswith("["):
					section = line[1:-1]
					continue
				if not section:
					continue

				# Handle sections
				if section == "abbreviations":
					
					# Split key/value
					p_kv = line.split("=")
					p_list = map(str.strip, p_kv[1].split("!"))

					# Format style for LaTeX compatibility
					if (len(p_list) > 2) and p_list[2]:
						p_list[2] = toLaTeX(p_list[2])

					# Split list
					self.abbr[p_kv[0].strip()] = p_list

				elif section == "styles":

					# Space split
					p_kv = line.split("=")
					p_list = re.split(RE_SPACESPLIT, p_kv[1])
					# Split list
					self.styles[p_kv[0].strip()] = p_list

				elif section == "tunegroups":

					# Space split
					p_kv = line.split("=")
					p_list = map(str.strip, p_kv[1].split(","))
					# Split list
					self.tunegroups[p_kv[0].strip()] = p_list

				elif section == "beamgroups":

					# Space split
					p_kv = line.split("=")
					p_list = map(str.strip, p_kv[1].split(","))
					# Split list
					self.beamgroups[p_kv[0].strip()] = p_list


def loadRivetHistogramsMap(confFile):
	"""
	Parser for the rivet-histograms.map configuration file
	"""

	# Prepare histogram-name based indexed response
	ans = { }

	# Read line-by line and split components
	with open( confFile ,"r" ) as f:
		for line in f:

			# Trim end-of-line
			line = line[:-1].strip()

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
				if name in ans:
					handled = False

					# Append missing energies
					if not (beam, energy) in ans[name]['accel']:
						ans[name]['accel'].append((beam, energy))
						handled = True

					# Warn for unhandled cases
					if not handled:
						print "WARNING: Unhandled collision for %s" % name

				else:

					# Store the observable this histogram provides
					ans[name] = {
						'observable' : observable, 
						'accel' 	 : [(beam, energy)],
						'process'	 : process,
						'params' 	 : params,
						'cuts' 		 : cuts
					}


	# Return answer
	return ans

def loadHistogramDetails(baseDir):
	"""
	Load histogram IDs and their respective details.
	"""
	print "Loading MCPlots Observables..."

	# Load MCPlots config
	config = MCPlotsConfig("%s/www/mcplots.conf" % baseDir)

	# Load relevant histograms for MCPlots
	histoMap = loadRivetHistogramsMap("%s/scripts/mcprod/configuration/rivet-histograms.map" % baseDir)

	# Append additional information to the rivet histograms
	for k,v in histoMap.iteritems():

		# Log errors
		if not v['observable'] in config.abbr:
			print "WARN: Observable %s not in abbreviations" % v['observable']
			continue

		# Populate remaining details
		abbr = config.abbr[v['observable']]
		histoMap[k]['subgroup'] = abbr[0]
		histoMap[k]['observable_name'] = abbr[1]
		histoMap[k]['observable_tex'] = abbr[2]

		histoMap[k]['process_name'] = config.abbr[histoMap[k]['process']][1]

	# Return histograms
	return histoMap

