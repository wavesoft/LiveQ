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

	def getJobResults(self, job_id):
		"""
		Return a summary of the results of the specified job
		"""

		# Try to get job record
		job = self.getJob(job_id)
		if not job:
			raise HLUserError("Could not access job %s" % job_id, "not-exists")

		# Get results metadata
		resultsMeta = job.getResultsMeta()

		# Process observables metadata
		observables = []
		if 'fitscores' in resultsMeta:

			# Get all histogram IDs
			histo_ids = resultsMeta['fitscores'].keys()

			# Get known histograms
			is_known = self.getKnownObservables()

			# Get observable details
			for histo in Observable.select( Observable.name, Observable.title, Observable.short ).where( Observable.name << histo_ids ):

				# Skip unknown histograms
				if not histo.name in is_known:
					continue

				# Get fit
				chi2 = resultsMeta['fitscores'][histo.name]

				# Store on observables
				observables.append({
					"id": histo.name,
					"title": histo.title,
					"fit": "%.4f" % chi2
					})

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

			"status": job.status,
			"events": job.events,
			"submitted": str(job.submitted),
			"lastEvent": str(job.lastEvent),
		}

