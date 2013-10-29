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

import uuid

from liveq.config.store import StoreConfig

class StoredFSM:
	"""
	A finite-state machine that is backed by an entry on the store.

	.. note::
		This class assumes that the component that uses it has already initialized a
		:class:`StoreConfig` configuration.

	"""

	def __init__(self, id=None):
		"""
		Initialize StoredFSM
		"""

		# Make sure we have a StoreConfig initialized
		if StoreConfig.STORE == None:
			raise ConfigException("Using StoreFSM class wit no initialized StoreConfig!")

		# Allocate an ID if it's missing
		if not id:
			id = str(uuid.uuid4())

		# Store the FSM id
		self._id = id

		# Store the state information
		self.state = { }
		


class SimpleFSM:
	"""
	A (very) Simple Finite-State-Machine implementation.
	"""

	def __init__(self):
		"""
		Initialize Simple-FSM
		"""
		self.nextFunction = None

	def stepFSM(self):
		"""
		Continues with the next FSM entry
		"""
		if self.nextFunction != None:

			# Pop function
			f = self.nextFunction
			self.nextFunction = None

			# Run
			f()

	def schedule(self, function):
		"""
		Set the next function to execute
		"""
		if self.nextFunction != function:
			self.nextFunction = function

