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

from webserver.models import *
from webserver.common.users.exceptions import HLUserError

class HLUser_Job:
	"""
	Job API to the Users Class
	"""

	def getJob(self, job_id):
		"""
		Check if the specified job belongs to the specified user
		and return the job record.
		"""

		# Check if the specified job from the jobQueue belongs
		# to the user with our current ID
		try:
			return JobQueue.select() \
				.where( JobQueue.id == int(job_id) ) \
				.where( JobQueue.user_id == int(self.id) ) \
				.get()
		except JobQueue.DoesNotExist:
			return None

	def getJobDetails(self, job_id):
		"""
		Return the details for the specified job
		"""

		# Try to get job
		job = self.getJob(job_id)
		if not job:
			raise HLUserError("Could not access job %s" % job_id, "not-exists")

		# Serialize
		job_dict = job.serialize()

		# Get details regarding the agents
		agents = []
		for a in Agent.select().where( Agent.activeJob == job_id ):
			
			# Serialize agent record
			agent = a.serialize()
			
			# Split the agent UUID
			idparts = agent['uuid'].split("/")
			if len(idparts) > 0:
				agent['uuid'] = idparts[1]

			# Append to agents
			agents.append( agent )

		# Get relevant paper
		paper = {}
		try:
			paper = Paper.get( Paper.id == job.paper_id ).serialize()
		except Paper.DoesNotExist:
			pass

		# Keep only the tunables that the user knows
		tunables = {}
		is_known = self.getKnownTunables()
		for k,v in job_dict['userTunes'].iteritems():
			if k in is_known:
				tunables[k] = v

		# Update records
		job_dict['agents'] = agents
		job_dict['paper'] = paper
		job_dict['userTunes'] = tunables
		
		# Return results
		return job_dict


	def getQuickJobResults(self, job_id):
		"""
		Return quick job details without too much querying
		"""

		# Try to get job record
		if isinstance(job_id, JobQueue):
			job = job_id
		else:
			job = self.getJob(job_id)
			if not job:
				raise HLUserError("Could not access job %s" % job_id, "not-exists")

		# Get results metadata
		resultsMeta = job.getResultsMeta()

		# Process observables metadata
		observables = []
		fit = job.fit
		if 'fitscores' in resultsMeta:

			# Get average of known observables
			fitAverageCalc = 0
			fitAverageCount = 0
			is_known = self.getKnownObservables()
			for k,chi2 in resultsMeta['fitscores'].iteritems():
				if k in is_known:
					fitAverageCalc += chi2
					fitAverageCount += 1

			# Update fit
			if fitAverageCount == 0:
				fit = 0
			else:
				fit = fitAverageCalc / fitAverageCount

		# Prepare response record
		return {
			"jid": job.id,
			"fit": fit,
			"status": job.status,
			"events": job.events,
			"submitted": str(job.submitted),
			"lastEvent": str(job.lastEvent),
		}

	def getJobResults(self, job_id):
		"""
		Return a summary of the results of the specified job
		"""

		# Try to get job record
		if isinstance(job_id, JobQueue):
			job = job_id
		else:
			job = self.getJob(job_id)
			if not job:
				raise HLUserError("Could not access job %s" % job_id, "not-exists")

		# Get results metadata
		resultsMeta = job.getResultsMeta()

		# Process observables metadata
		observables = []
		fit = job.fit
		if 'fitscores' in resultsMeta:

			# Get all histogram IDs
			histo_ids = resultsMeta['fitscores'].keys()

			# Get known histograms
			is_known = self.getKnownObservables()

			# Get observable details
			fitAverageCalc = 0
			fitAverageCount = 0
			for histo in Observable.select( Observable.name, Observable.title, Observable.short ).where( Observable.name << histo_ids ):

				# Skip unknown histograms
				if not histo.name in is_known:
					continue

				# Get fit
				chi2 = resultsMeta['fitscores'][histo.name]
				fitAverageCalc += chi2
				fitAverageCount += 1

				# Store on observables
				observables.append({
					"id": histo.name,
					"title": histo.title,
					"fit": "%.4f" % chi2
					})

			# Update fit
			if fitAverageCount == 0:
				fit = 0
			else:
				fit = fitAverageCalc / fitAverageCount

		# Process tunables
		tunables = []
		for k, v in job.getTunableValues().iteritems():

			# Collect flat version of tunables which is easier to render
			# (at least with the mustache template engine)
			tunables.append({
				"name": k,
				"value": v
			})

		# Prepare response record
		return {
			"tunables": tunables,
			"observables": observables,

			"jid": job.id,
			"fit": fit,
			"status": job.status,
			"events": job.events,
			"submitted": str(job.submitted),
			"lastEvent": str(job.lastEvent),
		}

	def getUserCompletedJobs(self, page=0, page_items=50):
		"""
		Return the user runs
		"""

		# Return all the latest results
		query = JobQueue.select().where(
					JobQueue.user_id == self.id,
					JobQueue.status << [JobQueue.COMPLETED, JobQueue.CLONED] 
				) \
				.order_by( JobQueue.id.desc() ) \
				.paginate( page, page_items )

		# Return serialized items
		items = []
		for q in query:
			items.append( self.getQuickJobResults(q) )
		return items


	def getUserLastJob(self):
		"""
		Return the user's last result only
		"""

		# Return all the latest results
		query = JobQueue.select().where(
					JobQueue.user_id == self.id,
					JobQueue.status << [JobQueue.COMPLETED, JobQueue.CLONED]
				) \
				.order_by( JobQueue.id.desc() )

		# Return serialized items
		if query.exists():
			return self.getJobResults( query.get() )
		else:
			return None

