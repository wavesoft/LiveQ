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

from jobmanager.config import Config

from liveq.utils.fsm import StoredFSM, state_handler, event_handler
from liveq.utils.remotelock import RemoteLock
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

		# Calculate the fair-share for the next request
		self.fairShare = max( int(round( float(self.total) / (self.individual + 1) )), 1 )

	def release(self):
		"""
		Release semaphore if locked
		"""
		if self.semaphore != None:
			self.semaphore.release()

	def fitsAnother():
		"""
		Return TRUE if it's possible to squeeze another job
		"""

		# Return false only when the system is saturated
		if self.individual >= self.total:
			return False
		else:
			return True

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

		# Calculate the trimdown to the existing services
		trimdown = max( int(round( float(self.fairShare) / self.individual )), 1 )

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
		semaphore = RemoteLock(Config.STORE, "scheduler:reslck-grp%s" % group)
		semaphore.acquire(True)

	# Then create and return a GroupUsage instance
	return GroupResources(group, semaphore)

def popQueuedJob():
	"""
	Remove the last entry form queue (after a successful peek)
	"""

	# Remove the last entry
	Config.STORE.rpop( "scheduler:queue" )

def peekQueueJob():
	"""
	Peek the next item without removing it
	"""

	# Loop until successful
	while True:

		# First, pop a job from store
		job_id = Config.STORE.lrange( "scheduler:queue", -1, -1 )

		# If no jobs are left, exit
		if not job_id:
			return None

		# Try to fetch the job entry
		job = jobs.getJob( job_id )

		# If the job was not resolved, try next
		if not job:
			# Remove the faulty entry
			Config.STORE.rpop( "scheduler:queue" )
			continue

		# Otherwise we do have an instance in place
		return job

def handleLoss( agent ):
	"""
	Handle the fact that we lost the given agent unexpecidly
	"""

	# Check if that was the last agent handling this job
	values = Agent.select( fn.Count("id").alias("count") ).where( (Agent.state == 1) & (Agent.activeJob == agent.activeJob) ).execute().next()

	# Check if we were left with nothing
	if values.count == 0:

		# Re-place job on queue with highest priority
		Config.STORE.rpush( "scheduler:queue", agent.activeJob )

	# Remove the job binding
	agent.activeJob = ""
	agent.save()


def process():
	"""
	Check if we have to process pending items in the scheduler.

	This function will do the appropriate reservations, but it will not invoke anything
	to the agents. It will simply return an tuple with the information required by the
	jobmanager to launch the job.

	In detail, the tuple has the following format:

		( <job instance>, <agent instances to cancel>, <agent instances to launch> )

	The job manager should first cancel the jobs and then launch on the free instances.
	If there was nothing to process, the function will return a tuple of tree Nones
	"""

	# Peek item on the right side
	job = peekQueueJob()

	# Check if there is nothing to process
	if job == None:
		return (None,None,None)

	# Fetch resource info for the group the job will be started into
	res = measureResources( job.group, lock=True )

	# Check if there is absolutely no free space
	if not res.fitsAnother():
		res.release()
		return (None,None,None)

	# Prepare some metrics
	totalSlots = res.fairShare
	usedSlots = 0

	# Try to occupy free slots
	slots = res.getFree( totalSlots )
	usedSlots += len( slots )

	# Check if we satisfied the job requirements
	if usedSlots >= totalSlots:

		# Successful handling of the job. Pop it
		popQueuedJob()

		# Release lock and return resultset
		res.release()
		return (job, [], slots)

	# Nope, check if we can also dispose some
	d_slots = res.getDisposable( totalSlots - usedSlots )
	if not d_slots:
		# Could not find any free slot
		res.release()
		return (None,None,None)

	# Store it to slots
	slots += d_slots

	# Release and return resultset
	res.release()
	return (job, d_slots, slots)


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

	# Handle the loss (and unlink from job)
	handleLoss( agent )

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
	agent.activeJob = ""
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
	
	# Clear the record on the agents that have active jobs
	numUpdated = Agent.update( activeJob="" ).where( Agent.activeJob == job.id ).execute()

def abortJob( job ):
	"""
	Return the IDs of the agents working on this job and then releaseJob
	"""

	# Firstly, lock the group
	res = measureResources( job.group )

	# Fetch agent instances that are working on the given job
	q = Agent.select().where( (Agent.activeJob == job.id ) & (Agent.state == 1) )
	agents = q[:]

	# Release job
	releaseJob( job )

	# Return the agents and release group
	res.release()
	return agents
