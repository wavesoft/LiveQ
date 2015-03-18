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
import random
import string
import hashlib

from peewee import fn, JOIN_LEFT_OUTER
from webserver.common.forum import registerForumUser, forumUsernameExists

from liveq.models import Tunable
from webserver.models import *
from webserver.config import Config
from webserver.common.userevents import UserEvents
from webserver.common.books import BookKeywordCache
from webserver.common.triggers import Triggers
from webserver.common.fancytitles import createFancyTitle

#: The user hasn't visited this book
BOOK_UNKNOWN = 0
#: The user knows this book
BOOK_KNOWN = 1
#: The user has mastered this book
BOOK_MASTERED = 2

def weighted_choice(weights):
	"""
	Return the index based on weighted random choice
	of the given set of weights
	"""
	totals = []
	running_total = 0

	for w in weights:
		running_total += w
		totals.append(running_total)

	rnd = random.random() * running_total
	for i, total in enumerate(totals):
		if rnd < total:
			return i

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

	#: The instances of all the user objects in the server
	USERS = []

	def __init__(self, user):
		"""
		Create a new instance of the user object
		"""

		# Keep user object
		self.dbUser = user

		# Create logger
		self.logger = logging.getLogger("user(%s)" % str(user))

		# Place user object in users array
		HLUser.USERS.append( self )

		# Preheat user cache
		self.loadCache_Knowledge()
		self.loadCache_Books()

		# Cache my information
		self.name = user.displayName
		self.id = user.id
		self.lab = user.lab
		self.activePaper_id = user.activePaper_id

		# Team-releated information
		self.teamMembership = None
		self.teamID = 0
		self.resourceGroup = "global"

		# Receive user events
		self.userEvents = UserEvents.forUser( self.id )
		self.userEventsListener = None

		# Get a reference to user triggers
		self.triggers = Triggers( self.dbUser )

		# Allocate unique token to the user
		self.token = UserTokens(user=self.dbUser, token=uuid.uuid4().hex)
		self.token.save()

		# Get team memebership
		try:

			# Get team membership
			self.teamMembership = TeamMembers.get( TeamMembers.user == user )

			# Cache details
			self.teamID = self.teamMembership.team.id

			# Get team's resource group
			self.resourceGroup = self.teamMembership.team.agentGroup.uuid

		except TeamMembers.DoesNotExist:
			# Not in a team
			pass

	@staticmethod
	def register(profile):
		"""
		Register a new user

		@throws KeyError - If the user already exists
		@throws Lab.DoesNotExist - When there is no default lab in the datbase
		"""

		# Fetch user profile
		email = str(profile['email']).lower()

		# Check if such user exist
		try:
			user = User.get(User.email == email)
			raise KeyError("e-mail")
		except User.DoesNotExist:
			pass

		# Check if such username exists in the forum
		if forumUsernameExists(profile['displayName']):
			raise KeyError("in-game name")

		# Create a random secret
		salt = "".join([random.choice(string.letters + string.digits) for x in range(0,50)])

		# Get the default lab
		defaultLab = Lab.select( Lab.id ).where( Lab.default == 1 ).get()

		# -----------------
		#  User Profile
		# -----------------

		# Create new user
		user = User.create(
			email=email,
			password=hashlib.sha1("%s:%s" % (salt, profile['password'])).hexdigest(),
			salt=salt,
			displayName=profile['displayName'],
			avatar=profile['avatar'],
			credits=0,
			variables="{}",
			lab=defaultLab.id,
			)

		# Check if we have to create a new analytics profile
		if profile['analytics']:

			# Create an analytics profile
			aProfile = AnalyticsProfile.create(
				uuid=uuid.uuid4().hex,
				gender=profile['analytics']['gender'],
				birthYear=profile['analytics']['birthYear'],
				audienceSource=profile['analytics']['audienceSource'],
				audienceInterests=profile['analytics']['audienceInterests'],
				)
			aProfile.save()

			# Store analytics profile to the user's account
			user.analyticsProfile = aProfile

		# Save user
		user.save()

		# -----------------
		#  Forum Sync
		# -----------------

		# Create a forum user with the same information
		registerForumUser(
				email, profile['displayName'], profile['password']
			)

		# -----------------
		#  Team Membership
		# -----------------

		# Create default user membership
		teamMembership = TeamMembers.create(
			user=user,
			team=Config.GAME_DEFAULT_TEAM,
			status=TeamMembers.USER,
			)
		teamMembership.save()

		# -----------------
		#  Default paper
		# -----------------

		# Create a default paper for the user
		paper = Paper.create(
			owner=user,
			team=Config.GAME_DEFAULT_TEAM,
			title="%s first paper" % profile['displayName'],
			body=".. you can keep your notes here ..",
			status=Paper.DRAFT,
			lab=defaultLab,
			)
		paper.save()

		# Update user's default paper
		user.activePaper_id = paper.id
		user.save()

		# Return an HLUser instance mapped to this user
		return HLUser(user)

	def reload(self):
		"""
		Reload user record from the database
		"""

		# Re-select and get user record
		self.dbUser = User.get( User.id == self.dbUser.id )

		# Reload caches
		self.loadCache_Knowledge()
		self.loadCache_Books()

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

		# Remove from users array
		i = HLUser.USERS.index( self )
		if i >= 0:
			del HLUser.USERS[i]

	def __str__(self):
		"""
		Get user name
		"""
		return "#%i" % self.id

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

	def loadCache_Books(self):
		"""
		Reload books state cache
		"""

		# Reset
		self.bookState = {}

		# Convert string key to integer
		for k,v in self.dbUser.getState("books", {}).iteritems():
			self.bookState[int(k)] = v


	###################################
	# Cache Updating Functions
	###################################

	def updateCache_MachinePart(self):
		"""
		Update the cache regarding machine parts
		"""

		# Count levels per machine part
		partCounters = {}

		# Select all machine parts
		parts = { }
		for p in MachinePartStage.select(
			MachinePart.name.alias("part_name"),
				fn.Count(MachinePartStage.id).alias("total"),
				fn.Count(MachinePartStageUnlock.id).alias("unlocked")
				) \
			.join( MachinePart ) \
			.switch( MachinePartStage ) \
			.join( MachinePartStageUnlock ) \
			.where(
					(MachinePartStageUnlock.user == self.dbUser)
				) \
			.group_by( MachinePartStage.id ):

			parts[p.part.name] = {
				"total": p.total,
				"unlocked": p.unlocked
			}

		# Update state
		self.dbUser.setState("partcounters", parts )

	def updateCache_Knowledge(self):
		"""
		User the user's knowledge information
		"""

		# Prepare features array
		observables = []
		tunables = []
		parts = []
		config = []
		goals = []

		# ==============================
		# Get exposed machine parts
		# ==============================

		# Get unique unlocked machine parts
		for p in MachinePart.select() \
			.join( MachinePartStage ) \
			.join( MachinePartStageUnlock ) \
			.where( MachinePartStageUnlock.user == self.dbUser ) \
			.group_by( MachinePart.id ):

			# Put in the observables
			parts.append( p.name )

		# ==============================
		#  Get knowledgegrid (features)
		# ==============================

		# Get knowledgeGrid nodes discovered
		kb_ids = self.dbUser.getKnowledge()
		print "Got knowledge KBs: %r" % kb_ids

		# Iterate over the currently explored knowledge grid features
		feats = KnowledgeGrid.getTotalFeatures( kb_ids )
		print "Got knowledge feats: %r" % feats

		# Update knowledge features
		if 'observables' in feats:
			observables += feats['observables']
		if 'tunables' in feats:
			tunables += feats['tunables']
		if 'parts' in feats:
			parts += feats['parts']
		if 'config' in feats:
			config += feats['config']
		if 'goals' in feats:
			goals += feats['goals']

		# ==============================
		#  Get unlocked machine parts
		# ==============================

		# Iterate over unlocked part stages
		for stage in self.dbUser.getUnlockedPartStages():

			# Get features
			feats = stage.getFeatures()

			# Update knowledge features
			if 'observables' in feats:
				observables += feats['observables']
			if 'tunables' in feats:
				tunables += feats['tunables']
			if 'parts' in feats:
				parts += feats['parts']
			if 'config' in feats:
				config += feats['config']
			if 'goals' in feats:
				goals += feats['goals']


		# ==============================
		#  Aggregate
		# ==============================

		# Update features (remove duplicates)
		self.dbUser.setState("observables", list(set(observables)) )
		self.dbUser.setState("tunables", list(set(tunables)) )
		self.dbUser.setState("parts", list(set(parts)) )
		self.dbUser.setState("config", list(set(config)) )
		self.dbUser.setState("goals", list(set(goals)) )

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

	def updateCache_Books(self):
		"""
		Update the user's status on each book
		"""

		# Get user's visited books
		userBooks = self.dbUser.getVisitedBooks()

		# Get questions of each book the user has visited
		if len(userBooks) == 0 :

			# Cache status
			self.dbUser.setState("books", {})
			self.bookState = {}

		else:

			# Prepare variables
			questions = {}
			bookState = {}

			# Collect questions
			for q in BookQuestion.select().where( BookQuestion.book << userBooks ):
				book_id = q._data['book']

				# Ensure records
				if not book_id in bookState:
					bookState[book_id] = {
						'questions': 0,
						'correct': 0,
						'trials': 0
					}

				# Store question
				bookState[book_id]['questions'] += 1

				# Cache question
				questions[q.id] = q

			# Collect metrics on answers
			for q in BookQuestionAnswer.select().where( BookQuestionAnswer.user == self.dbUser ):

				# Get reference question
				question_id = q._data['question']
				qRef = questions[question_id]
				book_id = qRef._data['book']

				# Count correct answers
				if (qRef.correct == q.answer):
					bookState[book_id]['correct'] += 1

				# Collect trials
				bookState[book_id]['trials'] += q.trials

			# Cache status
			self.dbUser.setState("books", bookState)
			self.bookState = bookState


	###################################
	# High-level functions
	###################################

	def trigger(self, action, **kwargs):
		"""
		Fire a particular trigger
		"""

		# Forward trigger request
		self.triggers.trigger( action, **kwargs )

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

	def markBookAsRead(self, bookName):
		"""
		User has read the specified book
		"""

		# Get book by name
		try:
			book = Book.get( Book.name == bookName )
		except Book.DoesNotExist:
			return

		# If this book does not exist in user's knowledge, update it
		if not self.dbUser.hasVisitedBook(book.id):

			# Update visited book
			self.dbUser.visitBook(book.id)

			# Update book cache
			self.updateCache_Books();

			# Save 
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

		# Fire event
		self.userEvents.send({
			"type"   : "flash",
			"icon"   : "flash-icons/labo.png",
			"title"  : "Science Points",
			"message": "You have just earned <em>%i</em> science points!" % points
			})

	###################################
	# In-game information queries
	###################################

	def getMachinePartsOverview(self):
		"""
		Return an overview of machine parts
		"""

		# Get all machine parts
		for part in MachinePart \
					.select( \
						MachinePart.name, \
						fn.Count(MachinePartStage.id).alias("parts"), \
						fn.Count(MachinePartStageUnlock.id).alias("unlocked") \
						) \
					.join( MachinePartStage ) \
					.join( MachinePartStageUnlock, JOIN_LEFT_OUTER ) \
					.where( ):
			pass

	def unlockMachinePartStage(self, stage_id):
		"""
		Unlock the specified machine part ID
		"""

		# Get stage
		try:
			stage = MachinePartStage.get( MachinePartStage.id == stage_id )
		except MachinePartStage.DoesNotExist:
			return False

		# Validate order
		if stage.order > 0:

			# If the preceding item is not unlocked, fire error
			if not MachinePartStage.select() \
				.join( MachinePartStageUnlock ) \
				.where( MachinePartStageUnlock.user == self.dbUser ) \
				.where( MachinePartStage.order == (stage.order - 1) ) \
				.exists():

				# The user hasn't unlocked the previous item
				raise HLError("You must unlock the preceding item before unlocking this one!", "usage-error")


		# Spend points
		# (This will fire an HLError if the 
		#  points cannot be spent()
		self.spendPoints( stage.cost )

		# Unlock this stage
		unlock = MachinePartStageUnlock.create(
			stage=stage,
			user=self.dbUser
			)
		unlock.save()

		# Update cache
		self.updateCache_Knowledge()
		self.updateCache_MachinePart()
		self.dbUser.save()

		# Fire event
		self.userEvents.send({
			"type"   : "flash",
			"icon"   : "flash-icons/unlock.png",
			"title"  : "Unlocked Stage",
			"message": "You have just unlocked stage <em>%s</em>!" % stage.name
			})

		# We are good
		return True

	def getMachinePartDetails(self, part):
		"""
		Get the machine part details of the specified machine part
		"""

		# Quit on invalid input
		if not part:
			return []

		# Get all stages unlocked by the user
		unlocked = {}
		for unlockPart in MachinePartStageUnlock.select().where( MachinePartStageUnlock.user == self.dbUser ):
			unlocked[unlockPart._data['stage']] = True

		# Select all levels on the specified part
		stages = []
		for stage in MachinePartStage.select().where( MachinePartStage.part == part ).order_by( MachinePartStage.order ).dicts():

			# Check if level is unlocked
			is_unlocked = False
			if stage['id'] in unlocked:
				is_unlocked = True

			# Comple and return
			stage['locked'] = not is_unlocked
			stages.append( stage )

		# Serialize machine part
		partData = part.serialize()
		partData['stages'] = stages

		# Return
		return partData

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

	def getBook(self, bookName):
		"""
		Return the specified book details, including user-specific information
		"""
		
		# First, fetch book
		try:
			book = Book.get( Book.name == bookName )
		except Book.DoesNotExist:
			return None

		# Keyword replacement template
		tpl = '<a href="javascript:;" data-book="%(name)s" class="book-link" title="%(name)s">%(word)s</a>'

		# Get keywors (to ignore when replacing keywords)
		ignoreKw = book.getAliases()
		ignoreKw.append( book.name.lower() )

		# Then, serialize and replace body hyperlinks
		book = book.serialize()
		book['short'] = BookKeywordCache.replaceKeywords( book['short'], tpl, ignoreKw )
		book['description'] = BookKeywordCache.replaceKeywords( book['description'], tpl, ignoreKw )

		# Return book
		return book

	def getBookStatistics(self):
		"""
		Return the user book statistics
		"""

		# Get user's visited books
		userBooks = self.dbUser.getVisitedBooks()

		# Populate all books
		books = []
		for book in Book.select(Book.id, Book.name).dicts():

			# Check user's status on this book
			if book['id'] in self.bookState:
				qLen = self.bookState[book['id']]['questions']
				qCorrect = self.bookState[book['id']]['correct']

				# Answered all? Mastered!
				if qCorrect >= qLen:
					state = 2
				else:
					state = 1

			elif book['id'] in userBooks:
				# Just seen
				state = 1
			else:
				# Not yet seen
				state = 0

			# Add book state
			book['state'] = state
			books.append(book)

		# Return books sorted by state
		return sorted( books, lambda x,y: y['state']-x['state'] )

	def getBookQuestions(self, count=5):
		"""
		Return the book questions
		"""

		# Get user's visited books
		nonMasteredBooks = self.dbUser.getVisitedBooks()

		# Remove mastered books from nonMasteredBooks
		for k,v in self.bookState.iteritems():
			if v['correct'] >= v['questions']:
				print "??? Removing mastered book %i" % k
				try:
					i = nonMasteredBooks.index(k)
					del nonMasteredBooks[i]
				except ValueError:
					print "??? (Not found)"
					continue

		# If nothing to query, return none
		if not nonMasteredBooks:
			return None

		# Get all questions for non-mastered, visited books
		questions = {}
		for q in BookQuestion.select().where(
				(BookQuestion.book << nonMasteredBooks)
			):

			# Store question indexed
			questions[q.id] = q.serialize()
			questions[q.id]['trials'] = 0

		# If no questions, return none
		if not questions:
			return None

		# Get trials and remove correct responses on the above answers
		maxTrials = 0
		for ans in BookQuestionAnswer.select(
				BookQuestionAnswer.trials,
				BookQuestionAnswer.answer,
				BookQuestionAnswer.question
			).where(
				(BookQuestionAnswer.user == self.dbUser) &
				(BookQuestionAnswer.question << questions.keys())
			):

			# Skip correct answers
			if ans.answer == questions[ans._data['question']]['correct']:
				del questions[ans._data['question']]
				continue

			# Append trial counters on questions
			questions[ans._data['question']]['trials'] = ans.trials
			if ans.trials > maxTrials:
				maxTrials = ans.trials

		# If we have limited choices, just return the set
		if len(questions) <= count:
			return questions.values()

		# Otherwise, compile a random set
		else:

			# Generate question weights, basing on trials
			questions = questions.values()
			qWeights = map(lambda x: maxTrials-x['trials']+1, questions)

			# Start collecting weighted random indices
			indices = []
			n = None
			while (len(indices) < count):
				# Get random element
				n = weighted_choice(qWeights)
				# If n is not in indices, add it
				if (n not in indices):
					indices.append(n)

			# Return subset of questions
			return map(lambda x: questions[x], indices)


	def handleBookQuestionAnswers(self, replies):
		"""
		Reply the book questions
		"""

		# Process replies individually
		for reply in replies:

			# Get or create record
			try:
				q = BookQuestionAnswer.get(
						(BookQuestionAnswer.user == self.dbUser) &
						(BookQuestionAnswer.question == reply['id'])
					)
			except BookQuestionAnswer.DoesNotExist:
				q = BookQuestionAnswer(
					user=self.dbUser,
					question=reply['id']
				)
			
			# Update
			q.trials += 1
			q.answer = reply['choice']
			q.save()

		# Update cache
		self.updateCache_Books()
		self.dbUser.save()

	def getTeamCitedPapers(self):
		"""
		Get papers team has cited
		"""

		# This only works if member of team
		if self.teamMembership is None:
			return []

		# Collect relevant papers
		ans = []
		for p in PaperCitation.select().where( PaperCitation.team == self.teamMembership.team ):

			# Append additional information
			book = p.citation.serialize()
			book['citations'] = p.countCitations()
			book['team_name'] = p.team.name
			book['fit_formatted'] = "%.4f" % p.fit
			ans.append( book )

		# Return answer
		return ans

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

	def getTeamPapers(self):
		"""
		Return the full list of team papers
		"""

		# This only works if member of team
		if self.teamMembership is None:
			return []

		# Collect relevant papers
		ans = []
		for p in Paper.select().where(
				((Paper.team == self.teamMembership.team) & (Paper.status << [ Paper.PUBLISHED, Paper.TEAM_REVIEW ]))
			  & (Paper.owner != self.dbUser)
			):

			# Append additional information
			book = p.serialize()
			book['citations'] = p.countCitations()
			book['fit_formatted'] = "%.4f" % p.fit
			ans.append( book )

		# Return
		return ans

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

		# Check for cited papers
		cited=False
		if 'cited' in query:
			cited = bool(query['cited'])

		# Check for only-owner papers
		ownerOnly=False
		if 'mine' in query:
			ownerOnly = bool(query['mine'])

		# Get all papers that the user has access to
		whereQuery = (Paper.owner == self.dbUser)
		if not (self.teamMembership is None) and not ownerOnly:
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
		for row in Paper.select().where( whereQuery ).order_by( Paper.fit ).limit(limit):

			# Collect rows
			ans.append(row.serialize())

			# Collect team IDs
			if not row._data['team'] in teamIDs:
				teamIDs.append( row._data['team'] )

		# If asked, collect cited papers
		if cited:
			for row in PaperCitation.select().where( PaperCitation.team == self.teamMembership.team ):

				# Collect paper
				paper = row.paper
				ans.append(paper.serialize())

				# Collect team IDs
				if not paper._data['team'] in teamIDs:
					teamIDs.append( paper._data['team'] )

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
			print ">>> %r <<<" % tunNames
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

		# Get team name
		teamName = ""
		if not (self.teamMembership is None):
			teamName = self.teamMembership.team.name

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
			'token'			: self.token.token,
			'papers'		: self.countPapers(),
			'team'			: teamName,
			}

