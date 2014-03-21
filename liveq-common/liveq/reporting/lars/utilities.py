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

from liveq.reporting.lars import LARS

class LARSRepeater:
	"""
	LiveQ LARS Repeater

	This class provides restricted access 
	"""

	def __init__(self, prefixes=None):
		"""
		Initialize the LARS repeater
		"""

		#: The list of prefixes accepted
		self.prefixes = prefixes

	def accept(self, prefix):
		"""
		Accept the given prefix in addition
		"""

		# Append on list
		self.prefixes.append(prefix)
		return self

	def send(self, payload):
		"""
		Receive the data from the given payload
		"""

		# Reject prefixes 
		if self.prefixes != None:
			for pfx in self.prefixes:
				# Check for matching prefix
				if payload[1:len(pfx)] = pfx:
					break
			# No match accepted
			return

		# Forward payload if it passed the filters
		LARS.forwardMessage(payload)
