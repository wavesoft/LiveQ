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

import re

"""
Simple function to parser histograms in FLAT format
"""
class FLATParser:

	# Precompiled regex entry
	WHITESPACE = re.compile("\s+")

	"""
	Function to read a FLAT file into python structures
	"""
	@staticmethod
	def parse(fname):
		sections = {}
		section = None
		activesection = None

		# Very simple FLAT file reader
		with open(fname, 'r') as f:

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
						data = FLATParser.WHITESPACE.split(line)
						activesection['v'].append(data)

					else:

						# Store value
						activesection['d'][data[0]] = data[1]

		# Return sections
		return sections

