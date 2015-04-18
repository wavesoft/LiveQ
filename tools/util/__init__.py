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

import string

def print_table( data, fields=None, headers=None ):
	"""
	Print an ascii table
	"""

	# Calculate columns width
	cw = []

	# First, build rows from data and/or fields
	rows = []
	if not fields is None:

		# Select the items to iterate onto
		for d in data:

			# Collect row fields
			row = []
			for f in fields:

				# Stringify field
				if not f in d:
					s = "None"
				else:
					s = str(d[f])

				# Get column index
				i = len(row)
				if i >= len(cw):
					cw.append(0)

				# Update max width
				if len(s) > cw[i]:
					cw[i] = len(s)

				# Put on rows
				row.append(s)

			# Collect rows
			rows.append(row)

	else:

		# Stringify all
		for d in data:

			# Stringify row fields
			row = []
			for f in d:

				# Stringify field
				s = str(f)

				# Get column index
				i = len(row)
				if i >= len(cw):
					cw.append(0)

				# Update max width
				if len(s) > cw[i]:
					cw[i] = len(s)

				# Put on rows
				row.append(s)

			# Collect rows
			rows.append(row)

	# Print headers if we have them first
	if not headers is None:

		# Print columns
		x = ""
		i = 0
		for h in headers:

			# Stringify
			h = str(h)

			# Update text length if needed
			if i >= len(cw):
				cw.append(0)
			if len(h) > cw[i]:
				cw[i] = len(h)

			# Put separator
			if x:
				x += " | "

			# Put text
			x += string.center(h, cw[i])

			# Got o next column index
			i += 1

		# Print row
		print "  %s" % x

		# Print separator
		x = ""
		for w in cw:

			# Put separator
			if x:
				x += "-+-"

			# Put underline
			x += "-" * w

		# Print row
		print " -%s-" % x

	# Print rows
	for row in rows:

		# Prepare row
		x = ""
		i = 0
		for field in row:

			# Put separator
			if x:
				x += " | "

			# Put string
			x += string.ljust(field, cw[i])

			# Got o next column index
			i += 1

		# Print row
		print "  %s" % x


