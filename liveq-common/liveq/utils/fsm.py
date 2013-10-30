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
from liveq.utils.redislock import RedisLock

class StoredFSMController:
	"""
	This class controls the event dispatching to the :class:`class StoredFSM` classes
	that reside in the FSM store.
	"""

	@staticmethod
	def dispatch(uid, event, **kwargs):
		"""
		Dispatch an event to the specified FSM instance.
		"""
		pass

class StoredFSM:
	"""
	A finite-state machine that is fully synchronized with an entry in the store.

	.. warning::
		This class assumes that the component that uses it has already initialized a
		:class:`StoreConfig` configuration.

	"""

	def __init__(self, uid=None):
		"""
		Initialize StoredFSM.

		Parameters:
			uid (string): The unique ID for this FSM

		"""

		# Make sure we have a StoreConfig initialized
		if StoreConfig.STORE == None:
			raise ConfigException("Using StoreFSM class wit no initialized StoreConfig!")

		# Allocate an ID if the parameter missing
		if not uid:
			uid = str(uuid.uuid4())

		# Store the FSM id
		self._fsmid = "fsm:%s" % uid

		# Store the state handlers
		self._state = None
		self._context = { }
		self._stateHandlers = { }

		# Create a lock instance that allows multiple machines to use the same FSM
		self._lock = RedisLock( StoreConfig.STORE, self._fsmid )

	def sync(self):
		"""
		Synchronize the local state and the state of the saved VM
		"""

	def _runstate(self):
		"""
		Run an FSM state
		"""

		# Acquire exclusive lock on the FSM
		self._lock.acquire(True)

		# Get context
		self._context = StoredFSMController.getContext(self._fsmid)

		# Load state handler
		f = self._stateHandlers[self._state]

		# Run function
		try:
			f(self._context)
		except Exception as e:
			pass

		# Store context
		StoredFSMController.setContext(self._fsmid, self._context)

		# Release FSM
		self._lock.release()

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

