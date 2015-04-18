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

import json
import math

from peewee import fn

from webserver.models import *
from webserver.common.users.exceptions import HLUserError
from webserver.common.fancytitles import createFancyTitle

def cost_estimation_function( citations, maxCost=1000, maxCitations=100, minCost=25 ):
	"""
	Increase the cost logarithmically up to maxCost within the span of maxCitations
	"""

	# Calculate cost
	cost = int( (math.log10((citations / maxCitations)+0.1)+1) * maxCost ) + minCost

	# Wrap to max
	if cost > maxCost:
		cost = maxCost

	# Return cost
	return cost

class HLUser_Papers:
	"""
	Papers API to the Users Class
	"""

	def focusPaper(self, paper_id):
		"""
		Make the paper with the specified paper ID to be user's active paper
		"""

		# Fetch paper
		try:
			paper = Paper.get( Paper.id == int(paper_id) )
		except Paper.DoesNotExist:
			raise HLUserError("The specified paper does not exist!", "not-found")

		# Validate permissions
		if paper.owner != self.dbUser:
			raise HLUserError("You can only focus your paper!", "not-authorized")

		# Sync
		self.reload()

		# Update user's active paper
		self.activePaper_id = paper_id
		self.dbUser.activePaper_id = paper_id
		self.dbUser.save()

		# Send notification
		self.userEvents.send({
			"type"   : "success",
			"title"  : "Active paper",
			"message": "You are now working on paper <em>%s</em>." % paper.title
			})

	def countPapers(self):
		"""
		Count how namy papers does the user have
		"""

		# Count users
		counters = Paper.select( fn.Count(Paper.id).alias("papers") ).where( Paper.owner == self.dbUser ).get()
		if counters is None:
			return 0

		# Return counters
		return counters.papers

	def deletePaper(self, paper_id):
		"""
		Delete a particular paper
		"""

		# Fetch paper
		try:
			paper = Paper.get( Paper.id == int(paper_id) )
		except Paper.DoesNotExist:
			self.logger.warn("Cannot update paper %s: Not found!" % paper_id)
			return False

		# Validate permissions
		if paper.owner != self.dbUser:

			# You can read only team review papers
			if paper.status != Paper.TEAM_REVIEW:
				self.logger.warn("Cannot update paper %s: Not in team review!" % paper_id)
				return None

			# Validate team
			if self.teamMembership is None:
				self.logger.warn("Cannot update paper %s: Not in team!" % paper_id)
				return False
			else:
				if paper.team != self.teamMembership.team:
					self.logger.warn("Cannot update paper %s: Not member of team!" % paper_id)
					return False

		else:

			# User can edit only unpublished papers
			if paper.status in [ Paper.PUBLISHED, Paper.REMOVED ]:
				self.logger.warn("Cannot update paper %s: Published or Removed!" % paper_id)
				return False

	 	# Delete paper
	 	paper.delete_instance()
	 	return True

	def updatePaper(self, paper_id, fields):
		"""
		Update paper fields
		"""

		# Fetch paper
		try:
			paper = Paper.get( Paper.id == int(paper_id) )
		except Paper.DoesNotExist:
			self.logger.warn("Cannot update paper %s: Not found!" % paper_id)
			return False

		# Validate permissions
		if paper.owner != self.dbUser:

			# You can read only team review papers
			if paper.status != Paper.TEAM_REVIEW:
				self.logger.warn("Cannot update paper %s: Not in team review!" % paper_id)
				return None

			# Validate team
			if self.teamMembership is None:
				self.logger.warn("Cannot update paper %s: Not in team!" % paper_id)
				return False
			else:
				if paper.team != self.teamMembership.team:
					self.logger.warn("Cannot update paper %s: Not member of team!" % paper_id)
					return False

		else:

			# User can edit only unpublished papers
			if paper.status in [ Paper.PUBLISHED, Paper.REMOVED ]:
				self.logger.warn("Cannot update paper %s: Published or Removed!" % paper_id)
				return False

		# Update fields
		for k,v in fields.iteritems():
			if k in Paper.JSON_FIELDS:
				setattr(paper, k, json.dumps(v))
			else:
				setattr(paper, k, v)
		
		# Save paper
		paper.save()
		return True				

	def getPapers(self, query={}, limit=50):
		"""
		Return all the paper the user owns or can access
		"""

		# Check if we should include active
		active=False
		if 'active' in query:
			active = bool(query['active'])

		# Check for terms
		terms=None
		if 'terms' in query:
			terms = str(query['terms'])

		# Check for cited papers
		cited=False
		if 'cited' in query:
			cited = bool(query['cited'])

		# Check for only-owner papers
		ownerOnly=False
		if 'mine' in query:
			ownerOnly = bool(query['mine'])

		# Check if we should list public only
		publicOnly=False
		if 'public' in query:
			publicOnly = bool(query['public'])

		# Check if we should calculate cost
		calculateCost=False
		if 'cost' in query:
			calculateCost = bool(query['cost'])

		# Check for the sort key
		sortKey=None
		if 'sort' in query:
			sortKey = str(query['sort'])

		# Get all papers that the user has access to
		if not publicOnly:
			# User papers
			whereQuery = (Paper.owner == self.dbUser)
			# Team papers
			if (not (self.teamMembership is None) and not ownerOnly):
				whereQuery |= ((Paper.team == self.teamMembership.team) & (Paper.status << [ Paper.PUBLISHED, Paper.TEAM_REVIEW ]))
		else:
			# Public papers
			whereQuery = (Paper.status == Paper.PUBLISHED)

		# Exclude removed papers
		whereQuery &= (Paper.status != Paper.REMOVED)

		# Check if we should filter terms
		if terms:
			whereQuery &= ( (Paper.title ** terms) | (Paper.body ** terms) )

		# If asked, collect cited papers
		ans = []
		teamIDs = []
		isCited = {}
		if cited:
			for row in PaperCitation.select().where( PaperCitation.team == self.teamMembership.team ):

				# Collect paper
				paper = row.citation
				paper_dict = paper.serialize()
				paper_dict['cited'] = True
				ans.append(paper_dict)

				# If we are calculating cost, count citations
				if calculateCost:
					paper_dict['citations'] = paper.countCitations()

				# Mark as cited
				isCited[paper.id] = True

				# Collect team IDs
				if not paper._data['team'] in teamIDs:
					teamIDs.append( paper._data['team'] )

		# Collect relevant paper
		for row in Paper.select().where( whereQuery ).order_by( Paper.fit ).limit(limit):

			# Collect rows
			paper = row.serialize()

			# Skip if cited
			if paper['id'] in isCited:
				continue

			# Mark row as active or inactive
			paper['active'] = (row.id == self.dbUser.activePaper_id)
			paper['cited'] = False

			# If we are calculating cost, count citations
			if calculateCost:
				paper['citations'] = row.countCitations()

			# Store on response
			ans.append(paper)

			# Collect team IDs
			if not row._data['team'] in teamIDs:
				teamIDs.append( row._data['team'] )

		# If asked, prepend the user's active paper
		if active:
			try:

				# Get paper
				paperObject = Paper.get( Paper.id == self.dbUser.activePaper_id )

				# Prepend active paper
				paper = paperObject.serialize()
				paper['active'] = True

				# If we are calculating cost, count citations
				if calculateCost:
					paper['citations'] = row.countCitations()

				# Insert ro
				ans.insert( 0, paper )
				if not self.teamID in teamIDs:
					teamIDs.append( self.teamID )

			except Paper.DoesNotExist:
				self.logger.warn("User's active paper does not exist!")
				pass

		# Ensure focused paper (if any) is on top
		for i in range(0,len(ans)):
			if ans[i]['id'] == self.dbUser.activePaper_id:

				# Swap with first element if not
				# the first already
				if i != 0:
					tmp = ans[0]
					ans[0] = ans[i]
					ans[i] = tmp

				# Don't continue
				break

		# Resolve team names
		teams = {}
		for tid in teamIDs:
			try:
				team = Team.select( Team.name ).where( Team.id == tid ).limit(1).get()
				teams[tid] = team.name
			except Team.DoesNotExist:
				teams[tid] = ""

		# Append visual assistance
		for i in range(0, len(ans)):
			ans[i]['team_name'] = teams[ans[i]['team']]
			ans[i]['fit_formatted'] = "%.4f" % ans[i]['fit']

			# If we are calculating cost, apply cost estimation function now
			if calculateCost:
				ans[i]['cost'] = cost_estimation_function( ans[i]['citations'] )

		# Sort if requested
		if not sortKey is None:

			# Check the sort direction
			sortReverse = False
			if sortKey[0] in "-+":
				sortReverse = (sortKey[0] == "-")
				sortKey = sortKey[1:]

			# Apply sorting
			ans = sorted(ans, key=lambda x: x[sortKey], reverse=sortReverse)

		# Return
		return ans

	def getPaper(self, paper_id):
		"""
		Return paper details with the given ID
		"""

		# Fetch paper
		try:
			paper = Paper.get( Paper.id == int(paper_id) )
		except Paper.DoesNotExist:
			return None

		# Validate permissions
		if (paper.owner != self.dbUser):

			# You can read only team review papers
			if not (paper.status in [ Paper.TEAM_REVIEW, Paper.PUBLISHED ]):
				return None

			# Validate team
			if self.teamMembership is None:
				return None
			else:
				if paper.team != self.teamMembership.team:
					return None

		# Serialize
		paper_dict = paper.serialize(expandForeigns=["team"])

		# Include attribute about ownership
		paper_dict['active'] = (paper_id == self.dbUser.activePaper_id)
		paper_dict['citations'] = paper.countCitations()
		paper_dict['cost'] = cost_estimation_function( paper_dict['citations'] )

		# Get details for the job record
		observables = []
		if paper.job_id != 0:

			# Get relevant job
			job = JobQueue.select( JobQueue.lastEvent, JobQueue.resultsMeta ).where( JobQueue.id == paper.job_id ).get()

			# Include the time the job was updated
			paper_dict['results_date'] = str(job.lastEvent)

			# Parse results meta
			resultsMeta = {}
			if job.resultsMeta:
				try:
					resultsMeta = json.loads( job.resultsMeta )
				except ValueError:
					pass

			# Process observables metadata
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

		# Update observables
		paper_dict['observables'] = observables

		# Return paper details
		return paper_dict

	def createPaper(self):
		"""
		Create and return a new paper record
		"""

		# Create new paper
		paper = Paper.create(
			owner=self.dbUser, 
			team=self.teamID,
			status=Paper.DRAFT,
			title=createFancyTitle(),
			lab=self.dbUser._data['lab'], # << Do not resolve lab ID
			)

		# Save and return
		paper.save()
		return paper.serialize(expandForeigns=["team"])

	def citePaper(self, paper_id):
		"""
		Cite the specified paper
		"""

		# This only works if member of team
		if self.teamMembership is None:
			raise HLUserError("You must be a member of a team before citing a paper", "not-team-member")

		# Try to get paper
		try:
			paper = Paper.get( Paper.id == paper_id )
		except Paper.DoesNotExist:
			raise HLUserError("The specified paper does not exist", "not-exist")

		# Estimate cost
		cost = cost_estimation_function( paper.countCitations() )

		# Check if user can spend these money
		self.spendPoints( cost )

		# Cite the paper
		citation = PaperCitation.create(
			user=self.dbUser,
			team=self.teamMembership.team,
			citation=paper
			)
		citation.save()

		# Notify user
		self.userEvents.send({
			"type"   : "flash",
			"icon"   : "flash-icons/books.png",
			"title"  : "Cited paper",
			"message": "You have cited paper <em>%s</em>!" % paper.title
			})
		
	def getUnpublishedPapers(self):
		"""
		Return the full list of unpublished user papers
		"""

		# Collect relevant papers
		ans = []
		for p in Paper.select().where( (Paper.owner == self.dbUser) & (Paper.status << [ Paper.DRAFT, Paper.TEAM_REVIEW ]) ):

			# Append additional information
			book = p.serialize()
			book['fit_formatted'] = "%.4f" % p.fit
			ans.append( book )

		# Return
		return ans

	def getPaperResults(self, paper_id=None, completedOnly=True):
		"""
		Return summary of results regarding the specified paper
		"""

		# If Paper_id is not specified, use active paper
		if not paper_id:
			paper_id = self.activePaper_id

		# Fetch paper
		try:
			paper = Paper.get( Paper.id == int(paper_id) )
		except Paper.DoesNotExist:
			raise HLUserError("The specified paper does not exist!", "not-found")

		# Validate permissions
		if paper.owner != self.dbUser:
			raise HLUserError("You can only read your paper!", "not-authorized")

		# Prepqre select query
		whereQuery = (JobQueue.paper_id == paper_id)
		if completedOnly:
			whereQuery &= (JobQueue.status == JobQueue.COMPLETED)

		# Collect summary of jobs for this paper
		jobsList = []
		for run in JobQueue.select( JobQueue.id, JobQueue.status, JobQueue.lastEvent, JobQueue.resultsMeta ).where( whereQuery ).order_by( JobQueue.id.desc() ):

			# Get results meta
			resultsMeta = run.getResultsMeta()

			# Process fit for known observables
			fit = 0.0
			if 'fitscores' in resultsMeta:

				# Get known histograms
				histo_ids = self.getKnownObservables()

				# Calculate average chi2 fit for these histograms
				for histo in histo_ids:
					fit += resultsMeta['fitscores'][histo]

				# Average
				fit /= len(histo_ids)

			# Collect entry
			jobsList.append({
				'id' 		: run.id,
				'status' 	: run.status,
				'lastEvent'	: str(run.lastEvent),
				'fit'		: "%0.4f" % fit,
				})

		# Serialize paper record
		p = paper.serialize()
		p['jobs'] = jobsList

		# Return result details
		return p

	def makePaperJobDefault(self, paper_id, job_id):
		"""
		Make the specified job as the default job for the specified paper
		"""

		# Fetch paper
		try:
			paper = Paper.get( Paper.id == int(paper_id) )
		except Paper.DoesNotExist:
			raise HLUserError("The specified paper does not exist!", "not-found")

		# Validate permissions
		if paper.owner != self.dbUser:
			raise HLUserError("You can only modify your paper!", "not-authorized")

		# Fetch job
		try:
			job = JobQueue.get( JobQueue.id == int(job_id) )
		except JobQueue.DoesNotExist:
			raise HLUserError("The specified job does not exist!", "not-found")

		# Validate permissions
		if job.paper_id != paper_id:
			raise HLUserError("You can only select jobs targeting the specified paper!", "not-authorized")

		# Make sure job is completed
		if job.status != JobQueue.COMPLETED:
			raise HLUserError("You can only select jobs that are completed", "not-completed")

		# Get known observables
		knownObservables = self.getKnownObservables()

		# Calculate fit on known observables
		jobMeta = job.getResultsMeta()
		fitScore = 0.0
		fitCount = 0
		if 'fitscores' in jobMeta:
			# Collect only known histograms
			for k,v in jobMeta['fitscores'].iteritems():
				if k in knownObservables:
					if v > 0.0:
						fitScore += v
						fitCount += 1
			# Average
			fitScore /= fitCount
		else:
			fitScore = job.fit

		# Update paper record
		paper.job_id = job.id
		paper.setTunableValues( job.getTunableValues() )
		paper.fit = fitScore

		# Save
		paper.save()

		# We are good
		return True
