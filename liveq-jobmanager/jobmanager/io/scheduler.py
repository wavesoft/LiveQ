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

import jobmanager.io.agents as agents
import jobmanager.io.jobs as jobs

from liveq.utils.fsm import StoredFSM, state_handler, event_handler
from liveq.models import Agent, AgentGroup

class GroupResources:
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

		# Get the group id
		gid = self.gid = group.id

		# A bit more advanced query for fetching metrics
		values = Agent.raw(
			"SELECT \
			  TOT.total, FREE.free, IND.individual \
			FROM \
			  ( SELECT COUNT(id) AS total FROM `agent` WHERE `state` = 1 AND `group_id` = %i ) AS TOT,\
			  ( SELECT COUNT(id) AS free FROM `agent` WHERE `activeJob` = '' AND `state` = 1 AND `group_id` = %i) AS FREE,\
			  ( SELECT COUNT(DISTINCT activeJob) AS individual FROM `agent` WHERE `state` = 1 AND `group_id` = %i) AS IND" 
			  % (gid,gid,gid)
			).execute().next()

		# Store metrics
		self.total = values.total
		self.free = values.free
		self.used = self.total - self.free
		self.individual = values.individual

		# Calculate the active fair-share
		self.fairShare = int(round( self.total / self.individual ))

	def release(self):
		"""
		Release semaphore if locked
		"""
		if self.semaphore != None:
			self.semaphore.release()

	def getFree(self, count):
		"""
		Return the free agent instances up to count times
		"""

		# Place query
		query = Agent.select().where( (Agent.group == self.group) & (Agent.state == 1) & (Agent.activeJob == "") ).limit(count)

		# Fetch all elements
		return query[:]

	def getDisposable(self, count):
		"""
		Return up to count disposable agents for removal in order to re-start a new job
		"""

		# Check if such acton is not possible
		if self.individual >= self.total:
			return []

		# Find jobs that occupy more than one agent in the given group
		values = Agent.raw(
			"SELECT * \
			 FROM \
			  (SELECT COUNT(id) AS njobs, activeJob AS job FROM `agent` WHERE `group_id` = %i GROUP BY job) T \
			 WHERE \
			  T.njobs > 1"
			  % (1)
			)

		# Calculate the fair-share for an extra job
		fairShare = max( int(round( float(self.total) / (self.individual + 1) )), 1 )

		# Calculate the trimdown to the existing services
		trimdown = max( int(round( float(fairShare) / self.individual )), 1 )

		# Start trimming until we reach quota
		ans = []
		numTrimmed = 0
		for qualifiedJob in values:

			# Get the job id
			jid = qualifiedJob.job

			# If we need less agents than trimdown, reduce it
			if (count - numTrimmed) < trimdown:
				trimdown = count - numTrimmed
				if trimdown == 0:
					break

			# If we are about to remove all the elements on the job,
			# keep at least one
			if trimdown >= qualifiedJob.njobs:
				trimdown = qualifiedJob.njobs - 1

			# Fetch the entries for disposable jobs
			query = Agent.select().where( (Agent.group == self.group) & (Agent.state == 1) & (Agent.activeJob == jid) ).limit(trimdown)
			trimAgents = query[:]

			# Append the agent objects in the answer
			ans += trimAgents

			# Increment the number of trimmed objects
			numTrimmed += len(trimAgents)
			if numTrimmed >= count:
				return ans

		# We might have reserved less than needed, return answer
		return ans


def measureResources(group, lock=False):
	"""
	Measure the resources, required for calculating the job metrics

	Optionally if you are planning to make changes you can request a semaphore lock
	that will prohibit other instances to modify the resources.
	"""

	# First thing is to acquire the lock (if told to do so)
	semaphore = None
	if lock:
		# Lock on group scope, allowing other groups to function in parallel
		semaphore = RemoteLock(Config.STORE, "scheduler:lock-grp%s" % group)
		semaphore.acquire(True)

	# Then create and return a GroupUsage instance
	return GroupResources(group, semaphore)

def popQueuedJob():
	"""
	Pop a job from the queue
	"""

	# Loop until successful
	while True:

		# First, pop a job from store
		job_id = Config.STORE.rpop( "scheduler:queue" )

		# If no jobs are left, exit
		if not job_id:
			return None

		# Try to fetch the job entry
		job = jobs.getJob( job_id )

		# If the job was not resolved, try next
		if not job:
			continue

		# Otherwise we do have an instance in place
		return job

##############################################################
# ------------------------------------------------------------
#  INTERFACE FUNCTIONS
# ------------------------------------------------------------
##############################################################

def markOffline( agent_id ):
	"""
	Mark the specified agent as Offline
	"""

	# Get the agent record that matches the given ID
	agent = agents.getAgent(agent_id)

	# Mark it as offline
	agent.state = 0
	agent.save()

def markOnline( agent_id ):
	"""
	Mark the specified agent as Offline
	"""

	# Get the agent record that matches the given ID
	agent = agents.getAgent(agent_id)

	# Mark it as online
	agent.state = 1
	agent.save()

def releaseFromJob( agent_id, job ):
	"""
	Release the specified agent from the given job. The job parameter
	is an instance of the job descriptor.
	"""

	# Get the agent record that matches the given ID
	agent = agents.getAgent(agent_id)

	# Remove the job binding
	agent.job = None
	agent.save()

def requestJob( job ):
	"""
	Request an interest for starting the given job. The job parameter
	is an instance of the job descriptor.
	"""
	
	# Place job on queue
	Config.STORE.lpush( "scheduler:queue", job.id )

def releaseJob( job ):
	"""
	Free the resources in use by the specified job. The job parameter
	is an instance of the job descriptor.
	"""
	pass
