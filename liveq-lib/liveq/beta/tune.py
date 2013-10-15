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

import pickle
from cStringIO import StringIO

"""
A histogram in the tune database
"""
class TuneHistogram:

	"""
	Initialize a tune histogram
	"""
	def __init__(self):
		self.bins = [ ]

"""
A specific tune as a database object
"""
class Tune:

	"""
	Initialize a tune instance
	"""
	def __init__(self):
		self.parameters = { }
		self.histograms = [ ]


	"""
	Static method to create a tune instance from a picke object
	"""
	@staticmethod
	def fromPicke(datastream):
		dst = StringIO(datastream)
		up = pickle.Unpickler(dst)


	"""

	"""
	def 

	pass