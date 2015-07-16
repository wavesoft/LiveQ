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

from numpy import sqrt, sum
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

	def binRadius(self):
		"""
		Get the radius of the interpolation bin.

		This is the half of the eucledian distance of the coordinates
		of the edges of any bin used by the interpolation binning
		mechanism.
		"""

		# Distances for each diemtion
		dist = []

		# Iterate over the keys
		for k in self.keys():

			# Setup default tune value calculation variables
			vRound = TuneAddressingConfig.TUNE_DEFAULT_ROUND

			# Get tune-tuning per tune parameter
			lk = k.lower()
			if lk in TuneAddressingConfig.TUNE_CONFIG:

				# Get parameters
				tv = TuneAddressingConfig.TUNE_CONFIG[lk]
				vRound = float(tv['round'])

			# Return distance
			dist.append( vRound ** 2 )

		# Return square root of all the distances
		return sum(sqrt( np.array(dist) ))

	def distanceTo(self, tune):
		"""
		Get the eucledian distance to another tune
		"""

		# Ensure tune lab integrity
		if self.labid != tune.labid:
			raise ValueError("Measuing tunes of different labs")

		# Get tune values
		x1 = self.getValues()
		x2 = tune.getValues()

		# Calculate eucledian distance of every parameter
		return sqrt( ((x1 - x2)**2).sum(axis=0) )

	def equal(self, tune):
		"""
		Check if this tune is equal to another
		"""

		# Ensure tune lab integrity
		if self.labid != tune.labid:
			raise ValueError("Comparing tunes of different labs")

		# Ensure values are the same
		x1 = self.getValues()
		x2 = tune.getValues()

		# Compare
		return np.all( x1 == x2 )

	def getNeighborhoodID(self, labid=None, offset=0):
		"""
		Generate a unique ID for the specified tune set that can be used
		to address locations in buffered memory.

		The optional parameter offset allows you to pick a neighbor node.
		"""

		# Use my local labID if not specified
		if labid is None:
			labid = self.labid

		# Start tune id with the lab id
		tid = str(labid)

		# Generate aliased keys for proper sorting
		real_key = {}
		ksorted = []
		for k in self.keys():

			lk = k.lower()
			sk = k

			# Get alias for sorting key
			if lk in TuneAddressingConfig.TUNE_CONFIG:
				sk = TuneAddressingConfig.TUNE_CONFIG[lk]['alias']

			# Store real key lookup
			real_key[sk] = k

			# Keep aliased key for sorting
			ksorted.append(sk)

		# Sort keys ascending
		ksorted = sorted(ksorted)

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
			k = real_key[ksorted[i]]
			v = self[k]

			# Setup default tune value calculation variables
			vDecimals = TuneAddressingConfig.TUNE_DEFAULT_DECIMALS
			vRound = TuneAddressingConfig.TUNE_DEFAULT_ROUND

			# Get tune-tuning per tune parameter
			lk = k.lower()
			if lk in TuneAddressingConfig.TUNE_CONFIG:

				# Get parameters
				tv = TuneAddressingConfig.TUNE_CONFIG[lk]
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
		if self._values is None:

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