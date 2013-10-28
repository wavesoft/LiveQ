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

import numpy as np
import pickle

from interpolator.config import Config
from interpolator.scipy.interpolate import Rbf
	
class HistogramStore:
	"""
	Histogram I/O class that uses the store class
	"""

	@staticmethod
	def _pickle(o):
		"""
		TODO: Optimize performance
		"""
		return pickle.dumps(o)

	@staticmethod
	def _unpickle(dat):
		"""
		TODO: Optimize performance
		"""

		# No data -> Empty array
		if dat == None:
			return []

		# Load pickled array from memory object
		return pickle.loads(dat)

	@staticmethod
	def append(tune, collection):
		"""
		Put a histogram in the neighborhood
		"""
		
		# Get neighborhood ID
		nid = tune.getNeighborhoodID()

		# Fetch neighbors from neighborhood
		neighbors = HistogramStore._unpickle( Config.STORE.get("tune-" + nid) )

		# Append collection to the neighborhood
		collection.tune = tune
		neighbors.append(collection)

		# Put neighbors back to the neighborhood store
		Config.STORE.set("tune-" + nid, HistogramStore._pickle(neighbors) )

	@staticmethod
	def getNeighborhood(tune):
		"""
		Return the nodes from the given neighborhood
		"""

		# Get neighborhood ID
		nid = tune.getNeighborhoodID()

		# Fetch neighbors from neighborhood
		return HistogramStore._unpickle( Config.STORE.get("tune-" + nid) )

	@staticmethod
	def getInterpolator(tune):
		"""
		Return an initialized interpolator instance with the required
		data from the appropriate neighborhoods.

		TODO: Optimize (a lot)
		"""

		# Get neighborhood
		data = HistogramStore.getNeighborhood(tune)

		# Iterate over items and create interpolation indices and data variables
		datavalues = [ ]
		indexvars = [ ]
		for nb in data:

			# Fetch index cariables
			datavalues.append(nb)
			indexvars.append(nb.getValues())

		# Flip matrix of indexvars
		indexvars = np.swapaxes( np.array(indexvars), 0, 1 )

		# Create and return interpolator
		return Rdf( *indexvars, data=datavalues )

