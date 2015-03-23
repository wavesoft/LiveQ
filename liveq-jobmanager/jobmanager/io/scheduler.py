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
import time
import json

import logging
import jobmanager.io.agents as agents
import jobmanager.io.jobs as jobs

from jobmanager.config import Config
from peewee import fn, RawQuery

from liveq.utils.fsm import StoredFSM, state_handler, event_handler
from liveq.utils.remotelock import RemoteLock
from liveq.models import Agent, AgentGroup
from liveq.reporting.lars import LARS

logger = logging.getLogger("scheduler")

#: An array that contains the job IDs that were completed
#: after a process in the scheduler. 
#:
#: The contents of this array can be fetched through the getCompletedJobs()
#: function.
#:
pendingCompletedJobs = [ ]

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

		# Calculate the cooldown time after a failure
		time_retry = time.time() - Config.FAIL_DELAY

		# Keep references
		self.semaphore = semaphore

		# Get group reference
		self.group = AgentGroup.get(uuid=group)
		self.gid = self.group.id

		# Count total
		values = Agent.select( fn.Count("id") ).where( 
					(Agent.state == 1) & (Agent.group == self.group) 
				).tuples().execute().next()
		self.total = values[0]

		# Count free
		values = Agent.select( fn.Count("id") ).where( 
					(Agent.state == 1) & (Agent.group == self.group) & (Agent.activeJob == 0) 
				  & (Agent.fail_timestamp < time_retry) & (Agent.fail_count < Config.FAIL_LIMIT)
				).tuples().execute().next()
		self.free = values[0]
		self.used = self.total - self.free

		# Count individual
		values = Agent.select( fn.Count( fn.Distinct( Agent.activeJob ) ) ).where( 
					(Agent.state == 1) & (Agent.group == self.group) & (Agent.activeJob != 0) 
				).tuples().execute().next()
		self.individual = values[0]

		# Debug metrics
		logger.info("Metrics %s { total=%i, free=%i, used=%i, individual=%i }" % (group, self.total, self.free, self.used, self.individual))

		# Calculate the fair-share for the next request
		if self.individual > 0:
			self.fairShare = max( int(round( float(self.total) / (self.individual + 1) )), 1 )
		else:
			self.fairShare = self.total

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

		# Calculate the cooldown time after a failure
		time_retry = time.time() - Config.FAIL_DELAY

		# Place query
		query = Agent.select().where( 
				(Agent.group == self.group) & (Agent.state == 1) & (Agent.activeJob == 0)
			  & (Agent.fail_timestamp < time_retry) & (Agent.fail_count < Config.FAIL_LIMIT)
			).limit(count)

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
		values = Agent.select( fn.Count( Agent.id ).alias("njobs"), Agent.activeJob ).where( (Agent.group == self.group) & (Agent.state == 1) ).group_by( Agent.activeJob )

		# Calculate the trimdown to the existing services
		if self.individual > 0:
			trimdown = max( int(round( float(self.fairShare) / self.individual )), 1 )
		else:
			return [ ]

		# Start trimming until we reach quota
		ans = []
		numTrimmed = 0
		for qualifiedJob in values:

			# Skip nodes with less than 2 available slots
			if qualifiedJob.njobs < 2:
				continue

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
			query = Agent.select().where( (Agent.group == self.group) & (Agent.state == 1) & (Agent.activeJob == qualifiedJob.activeJob) ).limit(trimdown)
			trimAgents = query[:]

			# Since activeJob will be overwritten, use a different
			# variable name to keep the previous job ID
			for agent in trimAgents:
				agent.jobToCancel = agent.activeJob

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
	Handle the fact that we lost the given agent unexpecidly.

	This function returns TRUE if by removing this agent the job is complete
	and can be finalized.
	"""
	
	# Check if it has an active job
	if not agent.activeJob:
		return

	# Get job ID & Remove job from agent
	job_id = agent._data['activeJob']
	agent.activeJob = 0
	agent.setRuntime( None )
	agent.save()

	# Return a job instance
	job = jobs.getJob(job_id)
	if not job:
		return

	# Let the job know that it lost an agent
	job.removeAgentInfo(agent)

	# Remove agent data from the job and check
	# how many agents are left in the array
	agentDataCount = job.removeAgentData( job_id )

	# Send status
	job.sendStatus("A worker from our group has gone offline. We have %i slots left" % values.count, {"RES_SLOTS":values.count})

	# Check if it's completed, or re-schedule
	return completeOrReschedule(job)


def markForJob(agents, job_id, agent_runtimes):
	"""
	Mark the array of agents in the list as being under the given job_id control
	"""

	# Just loop, update and save
	for agent in agents:
		# Set job ID
		agent.activeJob = job_id
		# Set runtime configuration
		if len(agent_runtimes) > 0:
			agent.setRuntime( agent_runtimes.pop(0) )
		# Save
		agent.save()

	# Return again the agents array
	return agents

def getCompletedJobs():
	"""
	Return the jobs that were completed while processing an action in the scheduler
	and reset the internal state.
	"""
	global pendingCompletedJobs

	# Get instance and clean local state
	jobs=pendingCompletedJobs
	pendingCompletedJobs=[ ]

	# Return jobs completed
	return jobs

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
		job.sendStatus("No free workers to place job. Will try later.", {"RES_SLOTS": "0"})
		res.release()
		return (None,None,None)

	# Send job status
	job.sendStatus("Got group resource metrics: free=%i, total=%i, workers=%i" % (res.free, res.total, res.individual), {
			"RES_TOTAL": res.total,
			"RES_FREE": res.free,
			"RES_UNIQUE": res.individual
		})

	# Prepare some metrics
	totalSlots = res.fairShare
	usedSlots = 0

	# Try to occupy free slots
	slots = res.getFree( totalSlots )
	usedSlots += len( slots )

	logger.info("Found %i free slots on group %s" % ( usedSlots, job.group ))

	# Check if we satisfied the job requirements
	if usedSlots >= totalSlots:

		# Send status
		job.sendStatus("Job will start on %i free workers" % usedSlots, {"RES_SLOTS":usedSlots})

		# Successful handling of the job. Pop it
		logger.info("Job %s processed. Removing from group" % job.id)
		popQueuedJob()

		# Release lock
		res.release()

		# Calculate runtime config
		return (job, [], markForJob(slots, job.id, job.getBatchRuntimeConfig( slots )))

	# Nope, check if we can also dispose some
	d_slots = res.getDisposable( totalSlots - usedSlots )
	if not d_slots:
		# Could not find any disposable slot

		# Check if we have occupied at least one slot by free slots
		if usedSlots > 0:

			# Send status
			job.sendStatus("Job will start on %i free workers" % usedSlots, {"RES_SLOTS":usedSlots})

			# Activate the already acquired number of slots
			res.release()
			return (job, [], markForJob(slots, job.id, job.getBatchRuntimeConfig( slots )))

		else:
			res.release()
			return (None,None,None)

	# Store it to slots
	slots += d_slots

	# Send status
	job.sendStatus("Stopping jobs on %i workers, in order to place our request" % len(d_slots), {"RES_DISPOSING": len(d_slots)})
	logger.info("Found %i extra slots on by dispose %s" % ( len(d_slots), job.group ))

	# Successful handling of the job. Pop it
	logger.info("Job %s processed. Removing from group" % job.id)
	popQueuedJob()

	# Send status
	job.sendStatus("Job will start on %i workers" % len(slots), {"RES_SLOTS":len(slots)})

	# Release and return resultset
	res.release()
	return (job, d_slots, markForJob(slots, job.id, job.getBatchRuntimeConfig( slots )))


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
	agent.activeJob = 0
	agent.setRuntime( None )
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
	numUpdated = Agent.update( activeJob=0 ).where( Agent.activeJob == job.id ).execute()

def completeOrReschedule( job ):
	"""
	Check if the specified job is completed and if not, re-schedule for execution.
	This function returns TRUE if the job is completed or FALSE otherwise
	"""
	global pendingCompletedJobs

	# Check if that was the last agent handling this job
	values = Agent.select( fn.Count("id").alias("count") ).where( (Agent.state == 1) & (Agent.activeJob == job.id) ).execute().next()

	logger.info("Complete or reschedule job %s with %i agents?" % (job.id, values.count))

	# Check if we were left with nothing
	if values.count == 0:

		# Check if the job is completed
		if job.isCompleted():
			logger.info("Job %s is completed" % job.id)

			# Mark the job as completed, by placing it on the
			# pendingCompletedJobs array, whose contents will
			# be fetched in the process loop
			pendingCompletedJobs.append( job )

			# Job is completed
			return True

		else:
			logger.info("Job %s is not completed, rescheduling" % job.id)

			# Make as stale
			job.setStatus( jobs.STALLED )

			# Send status
			job.sendStatus("There are no free workers in the queue. The job is re-scheduled with high priority")

			# Re-place job on queue with highest priority
			Config.STORE.rpush( "scheduler:queue", job.id )

			# Job is re-scheduled
			return False

	# If we do have workers, the job is still running, return False
	else:
		logger.info("Job %s has more active workers" % job.id)
		return False

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
