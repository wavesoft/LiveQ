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

import sys

import logging
import jobmanager.io.agents as agents
import jobmanager.io.jobs as jobs

from jobmanager.config import Config
from peewee import fn

from liveq.utils.fsm import StoredFSM, state_handler, event_handler
from liveq.utils.remotelock import RemoteLock
from liveq.models import Agent, AgentGroup

logger = logging.getLogger("scheduler")

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

		# Get group reference
		self.group = AgentGroup.get(uuid=group)
		self.gid = self.group.id

		# A bit more advanced query for fetching metrics
		values = Agent.raw(
			"SELECT \
			  TOT.total, FREE.free, IND.individual \
			FROM \
			  ( SELECT COUNT(id) AS total FROM `agent` WHERE `state` = 1 AND `group_id` = %i ) AS TOT,\
			  ( SELECT COUNT(id) AS free FROM `agent` WHERE `activeJob` = '' AND `state` = 1 AND `group_id` = %i ) AS FREE,\
			  ( SELECT COUNT(DISTINCT activeJob) AS individual FROM `agent` WHERE `state` = 1 AND `group_id` = %i AND `activeJob` != '') AS IND" 
			  % (self.gid,self.gid,self.gid)
			).execute().next()

		# Store metrics
		self.total = values.total
		self.free = values.free
		self.used = self.total - self.free
		self.individual = values.individual

		logger.info("Metrics %s { total=%i, free=%i, used=%i, individual=%i }" % (group, self.total, self.free, self.used, self.individual))

		# Calculate the fair-share for the next request
		self.fairShare = max( int(round( float(self.total) / (self.individual + 1) )), 1 )

	def release(self):
		"""
		Release semaphore if locked
		"""
		if self.semaphore != None:
			self.semaphore.release()

	def fitsAnother(self):
		"""
		Return TRUE if it's possible to squeeze another job
		"""

		# If we have free, it can fit
		if self.free > 0:
			return True

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
			  % self.gid
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

		# Fetch item from list
		job_id = job_id[0]

		# Try to fetch the job entry
		job = jobs.getJob( job_id )

		# If the job was not resolved, try next
		if not job:
			# Remove the faulty entry
			logger.warn("Could not load job %s. Removing from group" % job_id)
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


def markForJob(agents, job_id):
	"""
	Mark the array of agents in the list as being under the given job_id control
	"""

	# Just loop, update and save
	for agent in agents:
		agent.activeJob = job_id
		agent.save()

	# Return again the agents array
	return agents

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
	logger.info("Measuring resoures for group %s" % job.group)
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

	logger.info("Found %i free slots on group %s" % ( usedSlots, job.group ))

	# Check if we satisfied the job requirements
	if usedSlots >= totalSlots:

		# Successful handling of the job. Pop it
		logger.info("Job %s processed. Removing from group" % job.id)
		popQueuedJob()

		# Release lock and return resultset
		res.release()
		return (job, [], markForJob(slots, job.id))

	# Nope, check if we can also dispose some
	d_slots = res.getDisposable( totalSlots - usedSlots )
	if not d_slots:
		# Could not find any free slot
		res.release()
		return (None,None,None)

	# Store it to slots
	slots += d_slots

	logger.info("Found %i extra slots on by dispose %s" % ( usedSlots, job.group ))

	# Successful handling of the job. Pop it
	logger.info("Job %s processed. Removing from group" % job.id)
	popQueuedJob()

	# Release and return resultset
	res.release()
	return (job, d_slots, markForJob(slots, job.id))


##############################################################
# ------------------------------------------------------------
#  INTERFACE FUNCTIONS
# ------------------------------------------------------------
##############################################################

def markOffline( agent_id ):
	"""
	Mark the specified agent as Offline
	"""
	logger.info("Agent %s is marked offline" % agent_id)

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
	logger.info("Agent %s is marked online" % agent_id)

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
	logger.info("Agent %s release from job %s" % (agent_id, job.id))

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
	logger.info("Placing job %s on queue" % job.id)
	Config.STORE.lpush( "scheduler:queue", job.id )
	return True

def releaseJob( job ):
	"""
	Free the resources in use by the specified job. The job parameter
	is an instance of the job descriptor.
	"""
	
	# Clear the record on the agents that have active jobs
	logger.info("Releasing job %s" % job.id)
	numUpdated = Agent.update( activeJob="" ).where( Agent.activeJob == job.id ).execute()

def abortJob( job ):
	"""
	Return the IDs of the agents working on this job and then releaseJob
	"""

	# Firstly, lock the group
	res = measureResources( job.group )

	# Fetch agent instances that are working on the given job
	logger.info("Aborting job %s" % job.id)
	q = Agent.select().where( (Agent.activeJob == job.id ) & (Agent.state == 1) )
	agents = q[:]

	# Release job
	releaseJob( job )

	# Return the agents and release group
	res.release()
	return agents
