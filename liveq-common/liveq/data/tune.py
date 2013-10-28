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

from liveq.config.tuneaddressing import TuneAddressingConfig

class Tune(dict):
	"""
	The Tune object provides the basic parameters
	"""

	def getNeighborhoodID(self, labid=None):
		"""
		Generate a unique ID for the specified tune set that can be used
		to address locations in buffered memory.
		"""

		# Use my local labID if not specified
		if labid == None:
			labid = self.labid

		# Start tune id with the lab id
		tid = str(labid)

		# Sort keys ascending
		ksorted = sorted(self.keys())

		# Start processing parameter indices
		for k in ksorted:

			# Get tune value
			v = self[k]

			# Setup default tune value calculation variables
			vDecimals = TuneAddressingConfig.TUNE_DEFAULT_DECIMALS
			vRound = TuneAddressingConfig.TUNE_DEFAULT_ROUND

			# Get tune-tuning per tune parameter
			if k in TuneAddressingConfig.TUNE_CONFIG:

				# Get parameters
				tv = TuneAddressingConfig.TUNE_CONFIG[k]
				vDecimals = tv['decimals']
				vRound = tv['round']

			# Append index value
			tid += (":%." + str(vDecimals) + "f") % (v / vRound)

		# Return the tune id
		return tid

	def getValues(self):
		"""
		Return the values as required by the interpolator
		"""

		# Sort keys ascending
		ksorted = sorted(self.keys())

		# Return a list of values sorted by key
		return [ self[k] for k in ksorted ]

	def __init__(self, *args, **kwargs):
		"""
		Initialize a python dictionary as constructor
		"""
		
		# Get LabID from kwargs
		self.labid = None
		if 'labid' in kwargs:
			self.labid = kwargs['labid']
			del kwargs['labid']

		# Setup dict with the rest arguments
		dict.__init__(self, *args, **kwargs)
