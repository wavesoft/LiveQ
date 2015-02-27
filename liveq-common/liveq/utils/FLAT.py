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

def parseFLATBuffer(buf, index=True):
	"""
	Parse FLAT buffer and return the structured data
	"""
	sections_list = []
	section = None
	activesection = None

	# Pick appropriate return format
	sections = None
	if index:
		sections = {}
	else:
		sections = []

	# Start processing the buffer line-by-line
	for line in buf.splitlines():

		# Process lines
		if not line:
			# Empty line
			pass

		elif "# BEGIN " in line:

			# Ignore labels found some times in AIDA files
			dat = line.split(" ")
			section = dat[2]
			sectiontype = 0

			# Get additional section title
			title = ""
			if len(dat) > 3:
				title = " ".join(dat[3:])

			# Allocate section record
			activesection = { "d": { }, "v": [ ], "t": title }

		elif ("# END " in line) and (section != None):
			# Section end
			if index:
				sections[section] = activesection
			else:
				activesection['n'] = section
				sections.append(activesection)
			section = None

		elif line.startswith("#") or line.startswith(";"):
			# Comment
			pass

		elif section:
			# Data inside section

			# "SPECIAL" section is not parsable here
			if section == "SPECIAL":
				continue

			# Try to split
			data = line.split("=",1)

			# Could not split : They are histogram data
			if len(data) == 1:

				# Split data values
				data = FLATParser.WHITESPACE.split(line.strip())

				# Check for faulty values
				if len(data) < 3:
					continue

				# Otherwise collect
				activesection['v'].append( numpy.array(data, dtype=numpy.float64) )

			else:

				# Store value
				activesection['d'][data[0]] = data[1]

	# Return sections
	return sections


class FLATParser:
	"""
	Simple function to parser histograms in FLAT format
	"""

	# Precompiled regex entry
	WHITESPACE = re.compile("\s+")

	@staticmethod
	def parseFileObject(fileobject, index=True):
		"""
		Function to read a FLAT file (by the file object descriptor) into python structures
		"""

		# Read entire file and use parseBuffer
		return parseFLATBuffer(fileobject.read(), index)


	@staticmethod
	def parse(filename, index=True):
		"""
		Function to read a FLAT file into python structures
		"""

		# Open file
		with open(filename, 'r') as f:
			# Use FileObject parser to read the file
			return parseFLATBuffer(f.read(), index)

	def parseBuffer(buf, index=True):
		"""
		Parse FLAT file from buffer
		"""
		return parseFLATBuffer(buf, index)