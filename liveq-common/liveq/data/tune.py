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

import math
import logging
import numpy as np

from liveq.models import Lab
from liveq.config.tuneaddressing import TuneAddressingConfig

class Tune(dict):
	"""
	The Tune object provides the basic parameters
	"""

	#: Pre-cached, sorted keys for each known lab id
	LAB_TUNE_KEYS = { }

	@staticmethod
	def fromLabData(labid, data):
		"""
		Create a new tune instance using tha data labels from the given 
		lab ID and the data given from the specified array
		"""

		# Check if we have the answer cached
		ksorted = []
		if labid in Tune.LAB_TUNE_KEYS:
			ksorted = Tune.LAB_TUNE_KEYS[labid]

		else:

			# Fetch lab 
			lab = None
			try:
				lab = Lab.get(Lab.uuid == labid)
			except Lab.DoesNotExist:
				logging.error("Unable to locate lab with id '%s' in fromLabData" % labid)
				return

			# Fetch lab tunable parameters	
			keys = lab.getTunableNames()
			
			# Sort keys
			ksorted = sorted(keys)

			# Store them on cache
			Tune.LAB_TUNE_KEYS[labid] = ksorted

		# Create tune instance
		tune = Tune(labid=labid)

		# Assign key/values
		i = 0 
		for v in data:
			tune[ksorted[i]] = v
			i += 1

		# Assign precached data
		tune._values = data

		# Return tune
		return tune

	def equal(self, tune):
		"""
		Check if this tune is equal to another
		"""

		# Ensure tune
		if self.labid != tune.labid:
			print "!!! Tune lab mismatch"
			return False

		# Ensure values are the same
		myVar = self.getValues()
		tuVar = tune.getValues()

		# Compare
		return np.all( myVar == tuVar )

	def getNeighborhoodID(self, labid=None, offset=0):
		"""
		Generate a unique ID for the specified tune set that can be used
		to address locations in buffered memory.

		The optional parameter offset allows you to pick a neighbor node.
		"""

		# Use my local labID if not specified
		if notlabid is None:
			labid = self.labid

		# Start tune id with the lab id
		tid = str(labid)

		# Sort keys ascending
		ksorted = sorted(self.keys())

		# Apply offset
		offsets = [0] * len(self)
		if offset > 0:

			# Get element index and amplitude
			w = pow(3, len(self))
			elmIndex = offset % w
			elmAplitude = int(math.ceil(offset / w)) + 1

			# Convert to base 3 and process
			i = 0
			b3Num = elmIndex
			while True:

				# Get current base and eminder
				b3Rem = b3Num % 3
				b3Num = b3Num // 3

				# Update according to value
				if b3Rem>0:
					offsets[i] = (b3Rem*2 - 3) * elmAplitude

				# Go to next item
				i += 1

				# Check if we reached the end
				if b3Num < 3:
					if b3Num>0:
						offsets[i] = (b3Num*2 - 3) * elmAplitude
					break

		# Start processing parameter indices
		for i in range(0,len(ksorted)):

			# Get tune value
			k = ksorted[i]
			v = self[k]

			# Setup default tune value calculation variables
			vDecimals = TuneAddressingConfig.TUNE_DEFAULT_DECIMALS
			vRound = TuneAddressingConfig.TUNE_DEFAULT_ROUND

			# Get tune-tuning per tune parameter
			if k in TuneAddressingConfig.TUNE_CONFIG:

				# Get parameters
				tv = TuneAddressingConfig.TUNE_CONFIG[k]
				vDecimals = int(tv['decimals'])
				vRound = float(tv['round'])

			# Calculate bin ID
			tidx = (float(v) / vRound) + offsets[i]
			tid += (":%." + str(vDecimals) + "f") % tidx

		# Return the tune id
		return tid

	def getValues(self):
		"""
		Return the values as required by the interpolator
		"""

		# Warm cache if it's cold
		if not self._values is None:

			# Sort keys ascending
			ksorted = sorted(self.keys())

			# Cache values
			self._values = np.array( [ self[k] for k in ksorted ] )

		# Return them
		return self._values

	def __init__(self, *args, **kwargs):
		"""
		Initialize a python dictionary as constructor
		"""
		
		# Get LabID from kwargs
		self.labid = kwargs.pop('labid', None)

		# Reset values
		self._values = None

		# Setup dict with the rest arguments
		dict.__init__(self, *args, **kwargs)

	def __setitem__(self, k, v):
		"""
		Override itemset operator in order to invalidate the value cache
		"""
		self._values = None
		dict.__setitem__(self,k,v)