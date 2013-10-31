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
import logging
import threading

import cPickle as pickle

from liveq.config.store import StoreConfig
from liveq.utils.remotelock import RemoteLock

def state_handler(stateName, **kwargs):
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

	# Create a wrapped function
	def wrap(f):

		# Get the event swithing parameters
		routing = { }
		for k,v in kwargs.iteritems():

			# Handle event-like names
			if k[0:2] == "on":

				# Setup routing info
				ename = k[2].lower() + k[3:]
				routing[ename] = v

		# Update state handler info
		f.stateHandler = {
				'name': stateName,
				'routing': routing
			}
		return f

	# Return the wrapped function
	return wrap

def event_handler(eventName, on=[]):
	"""
	A function decorator that register the given FSM function as a handler of the given event.

	Parameters:
		eventName (string)	: The name of the event this function will handle
		on (array)			: The name of the states on which this event is valid. If empty, it will be handled
							  when the FSM is in any state.

	"""

	# Create a wrapped function
	def wrap(f):
		f.eventHandler = {
				'name': eventName,
				'on': on
			}
		return f

	# Return the wrapped function
	return wrap

class StoredFSM:
	"""
	A finite-state machine that is fully synchronized with an entry in the store.

	.. warning::
		This class assumes that the application has already initialized a :class:`StoreConfig` 
		configuration instance.

	.. note::
		Currently the StoredFSM class works only with the :module:`REDIS <liveq.classes.store.redisdb>` interface,
		but it could also work with any key-value store that implements some basic function. Check :class:`RemoteLock`
		class for more information.

	"""

	#: Dict with the instantiated FSMs in this process
	FSM_INSTANCES = { }

	@classmethod
	def new(cls):
		"""
		Generate a new instace of FSM by calling :func:`get` function with 
		a new unique ID
		"""

		# Calculate id
		uid = uuid.uuid4().hex

		# Create new instance
		return cls.get(uid)

	@classmethod
	def get(cls, uid):
		"""
		Return a stored instance of this FSM or create a new one if an FSM 
		with the given ID was not found.
		"""

		# Create instance on the local table if the entry
		# does not exist
		if not uid in StoredFSM.FSM_INSTANCES:

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
	def dispatch(cls, uid, event, **kwargs):
		"""
		Dispatch an event to the FSM object with the given uid.

		This function is completely distributed. Any machine/process/thread or instance can
		dispatch a message and it will be handled only by one FSM.

		Only named arguments are accepted as parameters to this function. You can optionally use the keyword 'parameters'
		if you want to provide your own dictionary.

		The event parameters will be merged with the FSM context before the appropriate :func:`state_handler` is called. However
		:func:`event_handler`s have the ability to modify the parameters before they reach the context.

		.. note::
			It is important to design your state handlers to be completely stateless.
			They can safely rely on the attributes of the StoredFSM class and the static
			configuration variables, but they should not assume any other state to be shared
			between them.

		"""

		# Use 'parameters' dict if it's specified
		args = kwargs.pop('parameters', kwargs)
		
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


	def __init__(self, uid=None, entryState="init", context={}):
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

		# Instantiate logger
		self.__dict__['logger'] = logging.getLogger("fsm-%s" % self.__class__.__name__)

		# Store the FSM id
		self.__dict__['_fsmid'] = uid

		# Prepare the state variables
		self.__dict__['_state'] = entryState
		self.__dict__['_stateHandled'] = False
		self.__dict__['_context'] = context
		self.__dict__['_routing'] = { }
		self.__dict__['_stateHandlers'] = { }
		self.__dict__['_eventHandlers'] = { }
		self.__dict__['_static'] = { }

		# Setup interlocks
		self.__dict__['_inhandler'] = False

		# Register state handlers
		for name, method in self.__class__.__dict__.iteritems():

			# Register state handling function
			if hasattr(method, "stateHandler"):
				self.logger.debug("Registering STATE handler: [%s] -> %s()" % (method.stateHandler['name'], name))

				# Update state handlers
				self._stateHandlers[method.stateHandler['name']] = method.__get__(self)

				# Update routing table
				for onEvent, toState in method.stateHandler['routing'].iteritems():

					# Create missing dict for routing entry
					if not onEvent in self._routing:
						self._routing[onEvent] = {}

					# Register the state switch according to the event
					# Thus making an array[event][fromState] => toState
					self._routing[onEvent][method.stateHandler['name']] = toState


			# Register event handling function
			if hasattr(method, "eventHandler"):
				self.logger.debug("Registering EVENT handler: [%s] -> %s()" % (method.eventHandler['name'], name))

				# Create array for event handlers (can be many)
				if not method.eventHandler['name'] in self._eventHandlers:
					self._eventHandlers[method.eventHandler['name']] = []

				# Append handler
				self._eventHandlers[method.eventHandler['name']].append({
						'on': method.eventHandler['on'],
						'cb': method.__get__(self)
					})

		# Make sure we have at least the init handler
		if not entryState in self._stateHandlers:
			raise ValueError("No handler found for init state: %s" % entryState)


		# Create a lock instance that allows multiple machines to use the same FSM
		self.__dict__['_lock'] = RemoteLock( StoreConfig.STORE, "%s:%s" % (self.__class__.__name__, self._fsmid) )

	def __setattr__(self, name, value):
		"""
		Write all the variables to the ``_context`` dict instead of the classe's __dict__.

		All variables that start with underscore are placed on the ``_static`` dictionary that is not
		frozen nor thawed.
		"""

		# Protect __dict__ variables
		if name in __dict__:
			raise ValueError("Keyword %s is reserved for internal use" % name)

		# Update dicts
		if name[0] == '_':
			self._static[name] = value
		else:
			self._context[name] = value

	def __getattr__(self, name):
		"""
		Read all the variables from the ``_context`` dict instead of the classe's __dict__

		All variables that start with underscore are read from the ``_static`` dictionary that is not
		frozen nor thawed.
		"""

		# Fetch from appropriate dict
		if name[0] == '_':
			return self._static[name]
		else:
			return self._context[name]

	def __delattr__(self, name):
		"""
		Delete variables from the ``_context`` dict instead of the classe's __dict__

		All variables that start with underscore are deleted from the ``_static`` dictionary that is not
		frozen nor thawed.
		"""

		# Protect __dict__ variables
		if name in __dict__:
			raise ValueError("Keyword %s is reserved for internal use" % name)
		
		# Update dicts
		if name[0] == '_':
			del self._static[name]
		else:
			del self._context[name]

	def free(self):
		"""
		Delete all the entries on the database store
		"""
		self.logger.debug("Releasing FSM")

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

	def event(self, eventName, **kwargs):
		"""
		Forward the specified event to the FSM

		Calling this function is equivalent of doing ``StoredFSM.dispatch( self._fsmid, eventName, **kwargs )``
		"""
		self.logger.debug("Scheduling event %s" % eventName)

		# Get parameters
		args = kwargs.pop('parameters', kwargs)

		# Forward event
		self.__class__.dispatch( self._fsmid, eventName, parameters=args )

	def goto(self, stateName, **kwargs):
		"""
		Switch to the given state, optionally updating the specified context variables (in kwargs).
		"""

		# This function is called only while we are handling a function
		if not self._inhandler:
			raise RuntimeError("The goto() function can only be used by state and event handlers!")

		# Check if we have handlers for such state
		if not stateName in self._stateHandlers:
			raise ValueError("No known handlers can handle the specified state: %s" % stateName)

		self.logger.debug("Switching SATE to %s" % stateName)

		# Change state and context
		# (we are thawed already so don't worry about state preservation)
		self.__dict__['_state'] = stateName
		self._context.update(kwargs)

		# Reset handled state
		self.__dict__['_stateHandled'] = False

	def beforeFreeze(self):
		"""
		Overridable function that the subclassing entity can use in order
		to perform cleanups before freeze
		"""
		pass

	def _freeze(self, sync=True):
		"""
		Store the FSM context in the store
		"""
		self.logger.debug("Freezing FSM")

		# Acquire exlusive lock
		if sync:
			self._lock.acquire(True)

		# Call custom functions
		self.beforeFreeze()

		# Pickle dictionary
		pContext = pickle.dumps({
			'context': self._context,
			'state': self._state,
			'stateHandled': self._stateHandled
		})

		# Put it in the store
		StoreConfig.STORE.set( "%s:%s:context" % (self.__class__.__name__, self._fsmid), pContext )

		# Release exlusive lock
		if sync:
			self._lock.release()

	def afterThaw(self):
		"""
		Overridable function that the subclassing entity can use in order
		to perform initializations after thawing
		"""
		pass

	def _thaw(self, sync=True):
		"""
		Retrieve the FSM context from the store
		"""
		self.logger.debug("Thawing FSM")

		# Acquire exlusive lock
		if sync:
			self._lock.acquire(True)

		# Put it in the store
		pContext = StoreConfig.STORE.get( "%s:%s:context" % (self.__class__.__name__, self._fsmid) )

		# Pickle dictionary
		if pContext:
			dat = pickle.loads(pContext)
			self.__dict__['_context'] = dat['context']
			self.__dict__['_state'] = dat['state']
			self.__dict__['_stateHandled'] = dat['stateHandled']

		# Call custom functions
		self.afterThaw()

		# Release exlusive lock
		if sync:
			self._lock.release()

	def _runloop(self, cycles=0):
		"""
		The main loop that runs the required FSM actions.

		This function spawns an internal thread that manages all the states in real-time.
		The thread will exit when there are no transitions in stack. 

		The loop can be woke up again with an event.
		"""
		self.logger.debug("Entering FSM loop")

		# Try to acquire exclusive lock on the FSM
		# and return false if we failed to do so
		if not self._lock.acquire(False):
			self.logger.debug("Unable to acquire lock: Already locked")
			return False
		self.logger.debug("Acquired lock")

		# Start a new thread that is going to manage this FSM state switching
		# until there is no more activity (or until we reached a cycle limit)
		def loopThread():

			# Thaw the instance
			self._thaw(False)

			# Start event and state switching loop
			loopActive = True
			numCycles = 0
			while loopActive:

				# Assume default action
				loopActive = False

				# First, run the state handler if it's not yet run
				if not self._stateHandled:

					# Load state handler
					f = self._stateHandlers[self._state]

					# Enable handler functions
					self.__dict__['_inhandler'] = True

					# Reset handled state
					self.__dict__['_stateHandled'] = True

					# Run function
					try:
						self.logger.debug("Running STATE handler for %s" % self._state)
						f()
					except Exception as e:
						self.logger.error("Error calling handler of state [%s]" % self._state)

					# Disable handler functions
					self.__dict__['_inhandler'] = False

				# Then, start handling events
				eventData = StoreConfig.STORE.lpop( "%s:%s:events" % (self.__class__.__name__, self._fsmid) )
				if eventData:

					# If we handled an event, keep us on the loop
					loopActive = True

					# Unpickle event data
					try:

						# Unpickle data
						data = pickle.loads(eventData)

						# Get event details
						event = data['event']
						args = data['args']

						# 1) Lookup direct event handler
						foundHandler = False
						if event in self._eventHandlers:

							# Find the one(s) that can run in this state
							for h in self._eventHandlers[event]:

								# If they run in all states or if we are in the
								# appropriate state, run the handler
								if (not h['on']) or (self._state in h['on']):

									# Get function
									f = h['cb']

									# Enable handler functions
									self.__dict__['_inhandler'] = True

									# Update context with args
									self._context.update(args)

									# Run function
									try:
										self.logger.debug("Running EVENT handler for %s" % event)
										f()
									except Exception as e:
										self.logger.error("Error calling handler of event [%s]" % event)

									# Disable handler functions
									self.__dict__['_inhandler'] = False

									# Let next loop that we already handled the event
									foundHandler= True

						# 2) Perform automatic routing of states
						if not foundHandler:

							# Check if the event exists in autorouting
							if event in self._routing:

								# Check if we are in the appropriate event
								route = self._routing[event]
								if self._state in route:

									# Go to the next state
									self.__dict__['_state'] = route[self._state]
									self._context.update(args)

									# Reset handled state
									self.__dict__['_stateHandled'] = False

					except Exception as e:
						self.logger.error("Error loading event data: %s:%s" % (e.__class__.__name__, str(e)))

				# Check if we should remain in loop for other reasons too
				loopActive = loopActive or (not self._stateHandled)

				# Disable loop if we reached the maximum number
				# of cycles that we were asked to perform.
				numCycles += 1
				if (cycles > 0) and (numCycles > cycles):
					self.logger.debug("Reached cycle limit")
					loopActive = False

			# Put us back to sleep
			self._freeze(False)

			# Release lock
			self._lock.release()

		# Create and start the thread
		thread = threading.Thread(target=loopThread)
		thread.start()

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

