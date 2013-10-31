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
import cPickle as pickle

from liveq.config.store import StoreConfig
from liveq.utils.redislock import RedisLock


def state_handler(f, stateName, **kwargs):
	"""
	A function decorator that registers the given FSM function as a handler of the given state.

	Parameters:
		stateName (string):	The name of the state this function is handling
		**kwargs 		  : You can also specify as extra parameters the state routing information.
							For esample: onDead="disconnected" means that when the event 'dead' is arrived,
							the state will be switched to "disconnected".
							If you want more advanced control over the events, use the :func:`event_handler`
							decorator.

	"""
	f.stateHandler = stateName
	return f

def event_handler(f, eventName):
	"""
	A function decorator that register the given FSM function as a handler of the given event.
	"""
	f.eventHandler = eventName
	return f

class StoredFSM:
	"""
	A finite-state machine that is fully synchronized with an entry in the store.

	.. warning::
		This class assumes that the component that uses it has already initialized a
		:class:`StoreConfig` configuration.

	"""

	#: Dict with the instantiated FSMs in this process
	FSM_INSTANCES = { }

	@classmethod
	def get(cls, uid):
		"""
		Return a stored instance of this FSM or create a new one if an FSM 
		with the given ID was not found.
		"""

		# Create instance on the local table if the entry
		# does not exist
		if not uid in FSM_INSTANCES:

			# Create an FSM instance with the given ID
			inst = cls(uid)

			# (No need to thaw anything. The context can be just blank. The
			#  moment an event arrives it will be thawed before the event handling)

			# Store it on the registry
			StoredFSM.FSM_INSTANCES[uid] = inst

			# Return new instance
			return inst

		else:

			# Return stored instance
			return StoredFSM.FSM_INSTANCES[uid]



	@classmethod
	def dispatch(cls, uid, event, *args):
		"""
		Dispatch an event to the FSM object with the given uid.

		This function is completely distributed. Any machine/process/thread or instance can
		dispatch a message and it will be handled only by one FSM.

		.. note::
			It is important to design your state handlers to be completely stateless.
			They can safely rely on the attributes of the StoredFSM class and the static
			configuration variables, but they should not assume any other state to be shared
			between them.

		"""
		
		# Prepare event data
		eventData = pickle.dumps({
				'event': event,
				'args': args
			})

		# Put it on the event stack and let the FSM pick it 
		# when it can handle it
		StoreConfig.STORE.rpush( "%s:%s:events" % (cls.__name__, uid), eventData )

		# Get an instance of the FSM that can handle this event
		fsm = cls.get( uid )

		# Try to handle the event (this will fail if another machine
		# is already in the _runloop)
		fsm._runloop()


	def __init__(self, uid=None):
		"""
		Initialize StoredFSM.

		Parameters:
			uid (string): The unique ID for this FSM

		"""

		# Make sure we have a StoreConfig initialized
		if StoreConfig.STORE == None:
			raise ConfigException("Using StoredFSM class wit no initialized StoreConfig!")

		# Allocate an ID if the parameter missing
		if not uid:
			uid = uuid.uuid4().hex

		# Store the FSM id
		self._fsmid = uid

		# Prepare the state variables
		self._state = None
		self._context = { }

		# Register state handlers
		self._stateHandlers = { }
		self._eventHandlers = { }
		for name, method in self.__class__.__dict__.iteritems():

			# Register state handling function
			if hasattr(method, "stateHandler"):
				self._stateHandlers[method.stateHandler] = method.__get__(self)

			# Register event handling function
			if hasattr(method, "eventHandler"):
				self._eventHandlers[method.eventHandler] = method.__get__(self)

		# Create a lock instance that allows multiple machines to use the same FSM
		self._lock = RedisLock( StoreConfig.STORE, "%s:%s" % (self.__class__.__name__, self._fsmid) )

	def __setattr__(self, name, value):
		"""
		Write all the variables to the _context dict instead of the classe's __dict__
		"""
		self._context[name] = value

	def __getattr__(self, name):
		"""
		Read all the variables from the _context dict instead of the classe's __dict__
		"""
		return self._context[name]

	def __delattr__(self, name):
		"""
		Delete variables from the _context dict instead of the classe's __dict__
		"""
		del self._context[name]

	def release(self):
		"""
		Delete all the entries on the database store
		"""

		# Create a pipeline to reduce the load
		pipe = StoreConfig.STORE.pipeline()
		bid = "%s:%s" % (self.__class__.__name__, self._fsmid)

		# Remove FSM keys
		pipe.delete( "%s:context" % bid)
		pipe.delete( "%s:events" % bid)

		# Remove lock keys
		if self._lock.lockActive:
			self._lock.release()
		pipe.delete( "%s:owner" % bid)
		pipe.delete( "%s:observers" % bid)
		pipe.delete( "%s:lock" % bid)

		# Execute transaction
		pipe.execute()

		# Delete me from the instance registry
		del StoredFSM.FSM_INSTANCES[uid]


	def _freeze(self, sync=True):
		"""
		Store the FSM context in the store
		"""

		# Acquire exlusive lock
		if sync:
			self._lock.acquire(True)

		# Pickle dictionary
		pContext = pickle.dumps({
			'context': self._context,
			'state': self._state
		})

		# Put it in the store
		StoreConfig.STORE.set( "%s:%s:context" % (self.__class__.__name__, self._fsmid), pContext )

		# Release exlusive lock
		if sync:
			self._lock.release()

	def _thaw(self, sync=True):
		"""
		Retrieve the FSM context from the store
		"""

		# Acquire exlusive lock
		if sync:
			self._lock.acquire(True)

		# Put it in the store
		pContext = StoreConfig.STORE.get( "%s:%s:context" % (self.__class__.__name__, self._fsmid) )

		# Pickle dictionary
		dat = pickle.loads(pContext)
		self._context = dat['context']
		self._state = dat['state']

		# Release exlusive lock
		if sync:
			self._lock.release()

	def _runloop(self):
		"""
		Run an FSM state
		"""

		# Try to acquire exclusive lock on the FSM
		# and return false if we failed to do so
		if not self._lock.acquire(False):
			return False

		# Thaw the instance
		self._thaw(False)

		# Load state handler
		f = self._stateHandlers[self._state]

		# Run function
		try:
			f(self._context)
		except Exception as e:
			pass

		# Put us back to sleep
		self._freeze(False)

		# Release lock
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

