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
import os
import atexit
import thread

from threading import Lock

# Register cleanup
@atexit.register
def redislockExitCleanup():

	# If there is nothing to reap, exit
	if not RedisLock.REAP_LIST:
		return

	# Start unlocking
	for e in RedisLock.REAP_LIST:
		e.release()

	# Empty list
	RedisLock.REAP_LIST = []

class RedisLock:
	"""
	This class provides locking functionality through a REDIS interface.
	"""

	#: A list of locked object to be released upon unexpected termination
	REAP_LIST = [ ]

	def __init__(self, instance, key):
		"""
		Initialize RedisLock

		Parametes:
			instance (instance) : A store instance that proides the .blpop(), .lpop(), .rpush(), and .llen() functions.
			key (string)		: The key name to use for locking purposes
		"""
		self.lockInstance = instance
		self.lockKey = key
		self.lockActive = False
		self.lockInterThread = Lock()

	def is_locked(self):
		"""
		Check if the lock is already locked by another thread/instance/machine
		"""

		# Get the pid of the entity locking the queue
		locker = self.lockInstance.get( "%s:owner" % self.lockKey )

		# If nobody is waiting, the the queue is not locked
		return not (not locker)

	def acquire(self, blocking=False, signal=None):
		"""
		Acquire a lock, blocking or non-blocking.

		When invoked with the blocking argument set to ``True`` (the default), block until the lock is unlocked, then set it to locked and return True.

		When invoked with the blocking argument set to ``False``, do not block. If a call with blocking set to ``True`` would block, return ``False`` immediately; otherwise, set the lock to locked and return ``True``.
		"""

		# If we are already locked, use inter-threading lock
		if self.lockActive:
			return self.lockInterThread.acquire(blocking)

		# Check if the queue is locked by somebody else		
		if self.is_locked():

			# If we are non-blocking do nothing
			if not blocking:
					return False

			# Otherwise, register us on the waiting list 
			self.lockInstance.rpush( "%s:observers" % self.lockKey, os.getpid() )

			# And wait for response
			self.lockInstance.blpop( "%s:lock" % self.lockKey )

			# Remove us from the observing list
			self.lockInstance.lpop( "%s:observers" % self.lockKey )

		# Make ourselves the new owners of the list 
		self.lockInstance.set( "%s:owner" % self.lockKey, os.getpid() )

		# Let future calls know that we acquired the lock (state sync)
		self.lockActive = True
		self.lockInterThread.acquire(False)

		# Add us on the reap list so we get released even if we crash
		RedisLock.REAP_LIST.append(self)

		# Return true
		return True

	def release(self):
		"""
		Release a lock.

		When the lock is locked, reset it to unlocked, and return. If any other threads are blocked waiting for the lock to become unlocked, allow exactly one of them to proceed.

		When invoked on an unlocked lock, a ``ThreadError`` is raised.

		There is no return value.
		"""

		# If we are not locked throw error
		if not self.lockActive:
			raise thread.error("release unlocked lock")

		# Remove us from the reap list
		RedisLock.REAP_LIST.remove(self)
		
		# Get the number of observers in the lock queue
		numObservers = self.lockInstance.llen( "%s:observers" % self.lockKey )

		# Begin transaction ---------
		pipe = self.lockInstance.pipeline()

		# Remove us from the owners
		pipe.delete( "%s:owner" % self.lockKey)

		# Unlock observers
		for i in range(0, numObservers):
			pipe.rpush( "%s:lock" % self.lockKey, os.getpid() )

		# Execute transaction -------
		pipe.execute()

		# Also release the interthread lock
		self.lockActive = False
		self.lockInterThread.release()

"""
import redis
r = redis.StrictRedis(host="127.0.0.1", port=6379, db=0)
from liveq.utils.redislock import RedisLock
l = RedisLock(r,"test")

"""
