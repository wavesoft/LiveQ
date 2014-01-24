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

import numpy
import re

class FLATParser:
	"""
	Simple function to parser histograms in FLAT format
	"""

	# Precompiled regex entry
	WHITESPACE = re.compile("\s+")

	@staticmethod
	def parse(filename):
		"""
		Function to read a FLAT file into python structures
		"""
		sections = {}
		section = None
		activesection = None

		# Dump the entire buffer in memory
		buf = ""
		with open(filename, 'r') as f:
			buf = r.read()

		# Start processing the buffer line-by-line
		for line in buf.splitlines():

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
					data = FLATParser.WHITESPACE.split(line)
					activesection['v'].append( numpy.array(data, dtype=numpy.float64) )

				else:

					# Store value
					activesection['d'][data[0]] = data[1]

		# Return sections
		return sections

