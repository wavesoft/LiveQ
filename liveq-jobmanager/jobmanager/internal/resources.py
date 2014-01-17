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
from liveq.utils.remotelock import RemoteLock

class GroupUsage:
	"""
	This class is used as a 'smart pointer' to the database groups. Instead of fetching
	all the entries and operating over them, this class will fetch and operate only on metrics.
	individual queries will occur only when needid.
	"""

	def __init__(self, group, semaphore=None):
		"""
		Fetch initial data 
		"""

		# Keep references
		self.semaphore = semaphore
		self.group = group

		# Fetch metrics
		self.slots = # Total number of slots
		self.free = # Free slots
		self.used = # Used slots
		self.individual = # The number of different agent IDs

	def containsJob(jid):
		"""
		Check if the group contains an active job with the given ID
		"""
		pass

	def acquireFree(self, numAgents):
		"""
		Acquire up to numAgents from the free slots and return
		the unique IDs from each agent.
		"""
		pass

	def trimAgents(self, perGroup, toMax):
		"""
		Trim `perGroup` agents from every group until we have `toMax`
		agents free.
		"""

	def release(self):
		"""
		Release semaphore if locked
		"""
		if self.semaphore != None:
			self.semaphore.release()


class GroupManager:
	"""
	This class provides the core functionality to allocate/resume and manage
	the user agent groups.
	"""
	
	def __init__(self):
		"""
		Initialize group manager
		"""
		self.logger = logging.getLogger("groupManager")

	def getGroupUsage(self, group, lock=False):
		"""
		Return the usage in the specified group.

		Optionally if you are planning to make changes you can request a semaphore lock
		that will prohibit other instances to modify the resources.
		"""

		# First thing is to acquire the lock (if told to do so)
		semaphore = None
		if lock:
			# Lock on group scope, allowing other groups to function in parallel
			semaphore = RemoteLock(Config.STORE, "groupmanager:%s" % group)
			semaphore.acquire(True)

		# Then create and return a GroupUsage instance
		return GroupUsage(group, semaphore)

	def reserveAgents(self, group, jobid, maxAgents=10, minAgents=1):
		"""
		Reserve up to ``max`` agents from the specified ``group``. This function will automatically
		rescale the agents on the specified group.

		This function returns a tuple of two arrays. The first array contains the uuids
		of the agents that should be stopped and the second one contains the uuids of the
		agents that should be used for the new job.
		"""
		
		# Get the usage of the group
		usage = self.getGroupUsage(group, lock=True)

		# Don't do anything if such job already exists
		if usabe.containsJob( jobid ):
			self.logger.warn("Job with ID %s already exists in group %s" % (jobid, group))
			usage.release()
			return None

		# 1) Check if we can freely reserve 'max' entries
		if usage.free >= maxAgents:

			# Acquire maxAgents and return their uuids.
			agents = usage.acquireFree(maxAgents)

			# Release and return agent IDs
			usage.release()
			return ([], agents)

		# 2) We will need to kick out running agents in order to
		#    get some free space.
		else:

			# Check if we are going to have at least minAgents
			# even after we proceed
			if usage.total - usage.individual < minAgents:
				# We can't do anything even if we let 1 agent per slot
				self.logger.warn("There is no free space avaiable for allocation new job")
				usage.release()
				return None

			# Calculate the new 'fair' share of slots 
			# that each job should have.
			fairShare = int(round(usage.total / (usage.individual+1)))

			# Calculate the trimdown to the existing services
			trimdown = max( int(round(fairShare / usage.individual)), 1 )

			# Get the IDs of the job agents that should be stopped
			dropAgents = usage.trimAgents( trimdown, fairShare )

			# Get the IDs of the free slots
			agents = usage.acquireFree(fairShare)

			# Release and return the agent ids
			usage.release()
			return (dropAgents, agents)
