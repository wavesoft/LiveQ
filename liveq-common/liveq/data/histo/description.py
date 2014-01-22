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

import json
import logging

class HistoDescriptionLab:
	"""
	A HistoDescriptionLab class encapsulates a HistoDescription and provides
	the defaults for identifying collisions on histogram names
	"""

	def __init__(self, description, lab):
		"""
		Initialize a HistoDescriptionLab
		"""

		# Keep reference
		self.description = description

		# Fetch parameters from the lab
		processParameters = lab.getParameters()

		# Extract parameter information used for resolving
		# collisions in histogram names
		self.beam=""
		if 'beam' in processParameters:
			self.beam = processParameters['beam']
		self.process=""
		if 'process' in processParameters:
			self.process = processParameters['process']
		self.energy=""
		if 'energy' in processParameters:
			self.energy = processParameters['energy']
		self.params="-"
		if 'params' in processParameters:
			self.params = processParameters['params']
		self.specific = "-"
		if 'specific' in processParameters:
			self.specific = processParameters['specific']

	def describeHistogram(self, id):
		"""
		Describe the specified histogram
		"""

		# Try to lookup the histogram from database
		if not id in self.description.histodesc:
			return None

      	# Fetch histogram description
		hdesc = self.description.histodesc[id]
		desc = None

		# Try to find the appropripate description
		for h in hdesc:

			# Require match on the following fields:
			if h[1] != self.beam:
				continue
			if h[2] != self.process:
				continue
			if str(h[3]) != str(self.energy):
				continue
			if h[4] != self.params:
				continue

			# Found
			desc = h
			break

		# Check if we could not match an appropriate description
		if not desc:
			return None

		# Return description
		return {
				'id': id,
				'title': str(desc[7]),
				'observable': str(desc[0]),
				'group': str(desc[6]),
				'cuts': str(desc[5]),
				'beam': str(self.beam),
				'process': str(self.process),
				'energy': str(self.energy),
				'params': str(self.params),

				# Related files with these information
				'files': {
					'ref': "%s/ref/%s.dat" % (self.description.basedir, str(desc[8])),
					'title': "%s/tex/%s.png" % (self.description.basedir, str(desc[8])),
					'xlabel': "%s/tex/%s-x.png" % (self.description.basedir, str(desc[8])),
					'ylabel': "%s/tex/%s-y.png" % (self.description.basedir, str(desc[8]))
				}
			}


class HistoDescription:
	"""
	This class provides an interface for accessing histogram descrition information
	"""

	def __init__(self, descriptionPath):
		"""
		The constructor will initialize the HistoDescription class by loading the `description.json`
		file from the path specified.
		"""
		
		# Keep a reference of the base dir
		self.basedir = descriptionPath

		# Prepare the description structure
		self.histodesc = { }

		# Load json data
		logging.info("Loading histogram descriptions from %s/description.json" % self.basedir)
		with open( "%s/description.json" % self.basedir, "r") as f:
			# Load entire file in memory
			buf = f.read()
			# Parse JSON
			self.histodesc = json.loads(buf)


	def forLab(self, lab):
		"""
		Get configuration class for the given lab (instance)
		"""

		# Open description for the given lab
		return HistoDescriptionLab( self, lab )
