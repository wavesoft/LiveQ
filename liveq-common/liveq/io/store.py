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

import logging

class Store:
	"""
	Interface for store implementations
	"""

	def get(self, key, default=None):
		"""
		Return the data under the given key. If no such key is found, the default value specified is returned.
		"""
		raise NotImplementedError("The Store class did not implement the get() function")

	def set(self, key, value):
		"""
		Store the given value under the specified key in the store.
		"""
		raise NotImplementedError("The Store class did not implement the set() function")

