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

class HistoDescriptionLab:
	"""
	A HistoDescriptionLab class encapsulates a HistoDescription and provides
	the defaults for identifying collisions on histogram names
	"""

	def __init__(self, description, lab):
		"""
		Initialize
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
		self.params=""
		if 'params' in processParameters:
			self.params = processParameters['params']

	def getStatic(self):
		"""
		Return the static configuration required by the interface for rendering correctly
		the histogram responses.
		"""
		pass

	def getHistogram(self, name):
		"""
		Describe the specified histogram
		"""
		pass


class HistoDescription:
	"""
	This class provides a human representation for the histogram
	"""

	def __init__(self, descriptionFile):
		"""
		Load the histogram descriptions from the given JSON description file
		"""
		pass
