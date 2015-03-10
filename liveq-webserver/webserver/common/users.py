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
import uuid
import logging

from liveq.models import Tunable
from webserver.models import User, Team, KnowledgeGrid, TeamMembers, Paper, UserTokens, Book
from webserver.common.userevents import UserEvents

#: The user hasn't visited this book
BOOK_UNKNOWN = 0
#: The user knows this book
BOOK_KNOWN = 1
#: The user has mastered this book
BOOK_MASTERED = 2

class HLUserError(Exception):
	"""
	An error occured in a high-level user-action
	"""
	def __init__(self, message, code=None):
		self.message = message
		self.code = code
	def __str__(self):
		return repr(self.message)

class HLUser:
	"""
	Collection of high-level operations on the user object
	"""

	def __init__(self, user):
		"""
		Create a new instance of the user object
		"""

		# Keep user object
		self.dbUser = user

		# Create logger
		self.logger = logging.getLogger("user(%s)" % str(user))

		# Preheat user cache
		self.loadCache_Knowledge()

		# Cache my information
		self.name = user.displayName
		self.id = user.id

		# Team-releated information
		self.teamMembership = None
		self.teamID = 0
		self.resourceGroup = "global"

		# Receive user events
		self.userEvents = UserEvents.forUser( self.id )
		self.userEventsListener = None

		# Allocate unique token to the user
		self.token = UserTokens(user=self.dbUser, token=uuid.uuid4().hex)
		self.token.save()

		# Get team memebership
		try:

			# Get team membership
			self.teamMembership = TeamMembers.get( TeamMembers.user == user )

			# Cache details
			self.team_id = self.teamMembership.team.id

			# Get team's resource group
			self.resourceGroup = self.teamMembership.team.agentGroup.uuid

		except TeamMembers.DoesNotExist:
			# Not in a team
			pass

	def reload(self):
		"""
		Reload user record from the database
		"""

		# Re-select and get user record
		self.dbUser = User.get( User.id == self.dbUser.id )

	def receiveEvents(self, callback):
		"""
		Fire the specified callback when a user event arrives.
		"""

		# Unregister pevious callback
		if self.userEventsListener != None:
			self.userEvents.removeListener( self.userEventsListener )

		# Receive events for this user
		self.userEvents.addListener( callback )
		self.userEventsListener = callback

	def cleanup(self):
		"""
		User disconnected, perform cleanup
		"""

		# Unregister events callback & release userEvents
		if self.userEventsListener != None:
			self.userEvents.removeListener( self.userEventsListener )
		self.userEvents.release()

		# Delete token
		self.token.delete_instance()

	###################################
	# Cache Loading Functions
	###################################

	def loadCache_Knowledge(self):
		"""
		Build knowledge grid nodes from their ids
		"""

		# Load leaf knowledge grid nodes
		self.leafKnowledge = []
		for leaf_id in self.dbUser.getState('leaf_knowledge', []):

			# Get and store
			try:
				# Collect leaf knowledge
				self.leafKnowledge.append(
						KnowledgeGrid.get( KnowledgeGrid.id == leaf_id )
					)
			except:
				pass

	###################################
	# Cache Updating Functions
	###################################

	def updateCache_Knowledge(self):
		"""
		User the user's knowledge information
		"""

		# Get knowledgeGrid nodes discovered
		kb_ids = self.dbUser.getKnowledge()
		print "Got knowledge KBs: %r" % kb_ids

		# Iterate over the currently explored knowledge grid features
		feats = KnowledgeGrid.getTotalFeatures( kb_ids )
		print "Got knowledge feats: %r" % feats

		# Update knowledge features
		if 'observables' in feats:
			self.dbUser.setState("observables", feats['observables'])
		if 'tunables' in feats:
			self.dbUser.setState("tunables", feats['tunables'])
		if 'parts' in feats:
			self.dbUser.setState("parts", feats['parts'])
		if 'config' in feats:
			self.dbUser.setState("config", feats['config'])
		if 'goals' in feats:
			self.dbUser.setState("goals", feats['goals'])

		# Find next leaf knowledge grid nodes
		self.leafKnowledge = []
		leaf_knowledge_ids = []
		if kb_ids:
			for leaf_node in KnowledgeGrid.select().where(
					 (KnowledgeGrid.parent << kb_ids) &
					~(KnowledgeGrid.id << kb_ids)
					):

				# Collect them and ID
				self.leafKnowledge.append( leaf_node )
				leaf_knowledge_ids.append( leaf_node.id )

		# Update 'leaf_knowledge' state
		self.dbUser.setState("leaf_knowledge", leaf_knowledge_ids)

	###################################
	# High-level functions
	###################################

	def knows(self, kb_id):
		"""
		Check if the user knows this ID
		"""

		# Check with the database user
		return self.dbUser.hasKnowledge(kb_id)

	def setVariables(self, variables):
		"""
		Update user variables
		"""

		# Udpate variables
		self.dbUser.variables = json.dumps(variables)

		# Save record
		self.dbUser.save()

	def setVariable(self, group, key, value):
		"""
		Set a user variable in the dynamic variables
		"""
		# Load variable dump
		varDump = json.loads(self.dbUser.variables)

		# Update variable
		if not group in varDump:
			varDump[group] = {}
		varDump[group][key] = value

		# Put back
		self.dbUser.variables = json.dumps(varDump)

		# Save user record
		self.dbUser.save()

	def getVariable(self, group, key, defValue=None):
		"""
		Set a user variable in the dynamic variables
		"""
		# Load variable dump
		varDump = json.loads(self.dbUser.variables)

		# Update variable
		if not group in varDump:
			return defValue
		if not key in varDump[group]:
			return defValue

		# Return
		return varDump[group][key]

	def delVariable(self, group, key):
		"""
		Set a user variable in the dynamic variables
		"""
		# Load variable dump
		varDump = json.loads(self.dbUser.variables)

		# Update variable
		if not group in varDump:
			return
		if not key in varDump[group]:
			return

		# Delete key
		del varDump[group][key]

		# Put back
		self.dbUser.variables = json.dumps(varDump)

		# Save user record
		self.dbUser.save()

	def getKnownObservables(self):
		"""
		Return a list of the histogram IDs that the user
		is aware of. This is used for optimizing the interpolation
		and simulation queries.
		"""

		# Get known histograms state
		return self.dbUser.getState("observables", [])

	def getKnownTunables(self):
		"""
		Return a list of the tunable IDs that the user
		is aware of. This is used for optimizing the interpolation
		and simulation queries.
		"""

		# Get known histograms state
		return self.dbUser.getState("tunables", [])

	def getTriggerActions(self, name):
		"""
		Return the list of actions that will be triggered when
		a trigger with the given name is fired.
		"""

		# Prepare response
		ans = []

		# Look if that triggers a leaf knowledge element
		for kb in self.leafKnowledge:
			if kb.triggerEvent == name:
				ans.append({
						'action': 'knowledge',
						'id': kb.id
					})

		# Return list
		return ans

	def expandKnowledge(self, kgItem):
		"""
		Expand users knowledge by unlocking the specified item
		"""

		# Include item in user's list of knowledges
		self.dbUser.addKnowledge( kgItem )

		# Update knowledge cache
		self.updateCache_Knowledge()

		# Save user record
		self.dbUser.save()

	def spendPoints(self, points=0):
		"""
		Spend the given ammount of science points
		"""

		# If points are zero, do nothing
		if points == 0:
			return

		# Reload user record
		self.reload()

		# Check if we have points
		if self.dbUser.points >= points:

			# Trim and save
			self.dbUser.points -= points
			self.dbUser.save()

		else:
			# Raise error
			raise HLUserError("You don't have enough science points", "not-enough-points")

	def earnPoints(self, points=0):
		"""
		Earn the given ammount of science points
		"""

		# Reload user record
		self.reload()

		# Update and save
		self.dbUser.points += points
		self.dbUser.totalPoints += points

		# Save record
		self.dbUser.save()

	def getBookStatus(self, book):
		"""
		Return the status (BOOK_UNKNOWN, BOOK_KNOWN, BOOK_MASTERED)
		"""

	###################################
	# In-game information queries
	###################################

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
		if paper.owner != self.dbUser:

			# You can read only team review papers
			if paper.status != Paper.TEAM_REVIEW:
				return None

			# Validate team
			if self.teamMembership is None:
				return None
			else:
				if paper.team != self.teamMembership.team:
					return None

		# Serialize
		return paper.serialize(expandForeigns=["team"])

	def getBook(self, id):
		"""
		Return the specified book details, including user-specific information
		"""
		pass

	def getBookStatistics(self):
		"""
		Return the user book statistics
		"""

		# Get all books
		books = []
		for book in Book.select():

			# Check user's status on this book
			pass

	def getBookQuestions(self):
		"""
		Return the book questions
		"""
		pass

	def replyBookQuestions(self):
		"""
		Reply the book questions
		"""
		pass

	def getPapers(self, query={}, limit=50):
		"""
		Return all the paper the user owns or can access
		"""

		# Check if we should list public
		public=False
		if 'public' in query:
			public = bool(query['public'])

		# Check for terms
		terms=None
		if 'terms' in query:
			terms = str(query['terms'])

		# Get all papers that the user has access to
		whereQuery = (Paper.owner == self.dbUser)
		if not self.teamMembership is None:
			whereQuery |= ((Paper.team == self.teamMembership.team) & (Paper.status << [ Paper.PUBLISHED, Paper.TEAM_REVIEW ]))
		whereQuery &= (Paper.status != Paper.REMOVED)

		# Check if we should include public
		if public:
			whereQuery |= (Paper.status == Paper.PUBLISHED)

		# Check if we should filter terms
		if terms:
			whereQuery &= ( (Paper.title ** terms) | (Paper.body ** terms) )

		# Collect relevant paper
		ans = []
		teamIDs = []
		for row in Paper.select().where( whereQuery ).limit(limit):

			# Collect rows
			ans.append(row.serialize())

			# Collect team IDs
			if not row._data['team'] in teamIDs:
				teamIDs.append( row._data['team'] )

		# Resolve team names
		teams = {}
		for tid in teamIDs:
			try:
				team = Team.select( Team.name ).where( Team.id == tid ).limit(1).get()
				teams[tid] = team.name
			except Team.DoesNotExist:
				teams[tid] = ""

		# Insert in results
		for i in range(0, len(ans)):
			ans[i]['team_name'] = teams[ans[i]['team']]

		# Return
		return ans

	def getKnowledgeTree(self, getAll=False):
		"""
		Build and return the knowledge tree
		"""
		
		# Synchronize
		self.reload()

		# Setup local properties
		kgRoot = None
		kgIndex = {}
		kgElements = []

		# Get active knowledge tree elements
		kb_ids = self.dbUser.getKnowledge()
		if not kb_ids:
			# If there is no knowledge, pick the root node(s)
			for kgElm in KnowledgeGrid.select().where( KnowledgeGrid.parent >> None ).limit(1).dicts():
				# Add no children
				kgElm['enabled'] = False
				kgElm['children'] = []
				# Return root
				return kgElm

			# Could not find even root!
			return None

		# Iterate over discovered knowledge 
		for kgElm in KnowledgeGrid.select().where( KnowledgeGrid.id << kb_ids ).dicts():

			# Store on index
			kgElm['children'] = []
			kgElm['enabled'] = True
			kgIndex[kgElm['id']] = kgElm
			kgElements.append(kgElm)

			# Look for root
			if not kgElm['parent']:
				kgRoot = kgElm

		# Lookup for leaf nodes of the discovered knowledge
		for kgElm in KnowledgeGrid.select().where(
			 (KnowledgeGrid.parent << kb_ids) &
			~(KnowledgeGrid.id << kb_ids)
			).dicts():

			# Store on index
			kgElm['children'] = []
			kgElm['enabled'] = False
			kgIndex[kgElm['id']] = kgElm
			kgElements.append(kgElm)

		# Nest children
		for e in kgElements:
			if e['parent']:
				kgIndex[e['parent']]['children'].append(e)

		# Return knowledge tree starting from root
		print repr(kgRoot)
		return kgRoot

	def getTuningConfiguration(self):
		"""
		Build and return the user's tuning configuration
		"""

		# Synchronize
		self.reload()

		# Get tunables
		tunOjects = []
		tunNames = self.dbUser.getState("tunables", [])
		if tunNames:
			for tun in Tunable.select().where( Tunable.name << tunNames ).dicts():
				tunOjects.append( tun )

		# Prepare configuration
		return {
			"configurations" : self.dbUser.getState("config", []),
			"observables"    : self.dbUser.getState("observables", []),
			"tunables"		 : tunOjects
		}

	def getProfile(self):
		"""
		Return user profile information
		"""

		# Shorthand for the user property
		user = self.dbUser

		# Compile analytics profile
		analytics = None
		if user.analyticsProfile:
			analytics = {
				'uuid'				: user.analyticsProfile.uuid,
				'gender' 			: user.analyticsProfile.gender,
				'birthYear' 		: user.analyticsProfile.birthYear,
				'audienceSource'	: user.analyticsProfile.audienceSource,
				'audienceInterests'	: user.analyticsProfile.audienceInterests,
				'lastEvent' 		: str(user.analyticsProfile.lastEvent),
				'metrics' 			: json.loads(user.analyticsProfile.metrics),
			}

		# Send user profile
		return {
			'id'			: user.id,
			'email' 		: user.email,
			'displayName' 	: user.displayName,
			'avatar' 		: user.avatar,
			'points'		: user.points,
			'groups'		: user.getGroups(),
			'knowledge'		: user.getKnowledge(),
			'activePaper'	: user.activePaper_id,
			'vars' 			: json.loads(user.variables),
			'state' 		: json.loads(user.state),
			'analytics'		: analytics,
			'token'			: self.token.token
			}

