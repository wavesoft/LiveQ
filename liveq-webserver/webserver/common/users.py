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

import copy
import time
import json
import uuid
import logging
import random
import string
import hashlib
import math

from peewee import fn, JOIN_LEFT_OUTER
from webserver.common.forum import registerForumUser, forumUsernameExists

from liveq.models import Tunable
from webserver.models import *
from webserver.config import GameConfig
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

def cost_estimation_function( citations, maxCost=100, maxCitations=10 ):
	"""
	Increase the cost logarithmically up to maxCost within the span of maxCitations
	"""

	# Calculate cost
	cost = int( (math.log10((citations / maxCitations)+0.1)+1) * maxCost )

	# Wrap to max
	if cost > maxCost:
		cost = maxCost

	# Return cost
	return cost

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
		self.loadCache_Achievements()
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

			self.logger.warn("Not a member of a team! This might cause an unhandled exception somewhere...")
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
				ageGroup=profile['analytics']['ageGroup'],
				occupation=profile['analytics']['occupation'],
				knowledge=profile['analytics']['knowledge'],
				foundout=profile['analytics']['foundout'],
				hopes=profile['analytics']['hopes'],
				similar=profile['analytics']['similar'],
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
			team=GameConfig.GAME_DEFAULT_TEAM,
			status=TeamMembers.USER,
			)
		teamMembership.save()

		# -----------------
		#  Default paper
		# -----------------

		# Calculate paper name
		paperSuffix = profile['displayName']
		if paperSuffix.endswith("s"):
			paperSuffix += "' "
		else:
			paperSuffix += "'s "

		# Create a default paper for the user
		paper = Paper.create(
			owner=user,
			team=GameConfig.GAME_DEFAULT_TEAM,
			title="%s first paper" % paperSuffix,
			body=".. you can keep your notes here ..",
			status=Paper.DRAFT,
			lab=defaultLab,
			)
		paper.save()

		# Update user's default paper
		user.activePaper_id = paper.id

		# Wrapt he user in an HLUser instance
		hluser = HLUser(user)

		# Initialize caches
		hluser.updateCache_Achievements()
		hluser.updateCache_Books()
		hluser.updateCache_Feats()
		user.save()

		# Return hluser
		return hluser

	def reload(self):
		"""
		Reload user record from the database
		"""

		# Re-select and get user record
		self.dbUser = User.get( User.id == self.dbUser.id )

		# Reload caches
		self.loadCache_Achievements()
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
	# General purpose action handling
	###################################

	def handleAction(self, actionRecord):
		"""
		Handle the specified action record
		"""

		# Make sure we have at least 'action'
		if not 'action' in actionRecord:
			return False

		# Handle different cases
		action = actionRecord['action']

		# ====================================
		# Give credits to the user
		# ------------------------------------
		if action == "points":
		# ====================================

			# Validate
			if not 'value' in actionRecord:
				return False

			# Give points to the user
			self.earnPoints( int(actionRecord['value']) )

		# ====================================
		# Display the specified event
		# ------------------------------------
		elif action == "event":
		# ====================================

			# Forward record as-is for notification
			del actionRecord['action']
			self.userEvents.send(actionRecord)


	###################################
	# Cache Loading Functions
	###################################

	def loadCache_Achievements(self):
		"""
		Build achievements grid nodes from their ids
		"""

		# Load leaf achievements grid nodes
		self.leafAchievements = []
		for leaf_id in self.dbUser.getState('leaf_achievements', []):

			# Get and store
			try:
				# Collect leaf achievements
				self.leafAchievements.append(
						Achievement.get( Achievement.id == leaf_id )
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

	def updateCache_Feats(self):
		"""
		User the user's features, as obtained by machine
		parts and achievements.
		"""

		# Prepare features array
		observables = []
		tunables = []
		parts = []
		config = []
		goals = []

		# Get features from machine parts
		# --------------------------------

		# Get unique unlocked machine parts
		for p in MachinePart.select() \
			.join( MachinePartStage ) \
			.join( MachinePartStageUnlock ) \
			.where( MachinePartStageUnlock.user == self.dbUser ) \
			.group_by( MachinePart.id ):

			# Put in the observables
			parts.append( p.name )

		#  Get features from achievements
		# --------------------------------

		# Get Achievement nodes discovered
		a_ids = self.dbUser.getAchievements()

		# Iterate over the currently explored achievement grid features
		feats = Achievement.getTotalFeatures( a_ids )

		# Update achievement features
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

		#  Get unlocked machine parts
		# --------------------------------

		# Iterate over unlocked part stages
		for stage in self.dbUser.getUnlockedPartStages():

			# Get features
			feats = stage.getFeatures()

			# Update machine part features
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


		#  Aggregate
		# --------------------------------

		# Update features (remove duplicates)
		self.dbUser.setState("observables", list(set(observables)) )
		self.dbUser.setState("tunables", list(set(tunables)) )
		self.dbUser.setState("parts", list(set(parts)) )
		self.dbUser.setState("config", list(set(config)) )
		self.dbUser.setState("goals", list(set(goals)) )

	def updateCache_Achievements(self):
		"""
		User the user's achievements information
		"""

		# Get Achievement nodes discovered
		a_ids = self.dbUser.getAchievements()
	
		# Find next leaf achievements grid nodes
		self.leafAchievements = []
		leaf_achievements_id = []
		if a_ids:
			for leaf_node in Achievement.select().where(
					 (Achievement.parent << a_ids) &
					~(Achievement.id << a_ids)
					):

				# Collect them and ID
				self.leafAchievements.append( leaf_node )
				leaf_achievements_id.append( leaf_node.id )

		# Update 'leaf_achievements' state
		self.dbUser.setState("leaf_achievements", leaf_achievements_id)


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
	# Polling functions
	###################################

	def checkForNAckJobs(self):
		"""
		Check for not-acknowledged jobs
		"""

		# Get the list of jobs with acknowledged = 0 flag
		nackJobList = []
		for job in JobQueue.select( 
				JobQueue.id, 
				JobQueue.status,
				JobQueue.paper_id,
				JobQueue.fit
			).where(
				(JobQueue.user_id == self.id)
			  & (JobQueue.acknowledged == 0)
			):

			# Store ID of job for later update
			nackJobList.append( job.id )

			# Trigger events
			if job.status == JobQueue.COMPLETED:

				# Give credits
				self.earnPoints(2, "for completing a simulation")

				# Job is completed, update paper
				try:
					paper = Paper.get( Paper.id == job.paper_id )
				except Paper.DoesNotExist:
					self.logger.warn("Cannot update paper %s with the results!" % job.paper_id)
					continue

				# Update paper score
				fitBefore = paper.bestFit
				fitAfter = job.fit

				# If there was no previous fit, assume it
				# was a really big number
				if fitBefore == 0.0:
					fitBefore = 10000000000

				# Import properties into the paper
				paper.fit = fitAfter
				paper.job_id = job.id

				# Import tunbles from the job
				paper.setTunableValues( job.getTunableValues() )

				# Check for better score
				if fitAfter < fitBefore:

					# Update best fit
					paper.bestFit = fitAfter

					# Check which cases are we in
					if (fitAfter < 1.0) and ((fitBefore >= 1.0) and (fitBefore < 4.0)):

						# 4.0 -> 1.0 Great [Give extra 20 points]

						# Give 20 points
						self.earnPoints(20, "for a perfect match")

						# Send notification
						self.userEvents.send({
							"type"   : "flash",
							"icon"   : "avatars/model-3.png",
							"title"  : "Perfect Match",
							"message": "Your simulation scored <em>%.4f</em>, which is better than your previous attempt!" % fitAfter
							})

					elif (fitAfter < 1.0) and (fitBefore > 4.0):

						# +4.0 -> 1.0 Superb [Give 30 points]

						# Give 20 points
						self.earnPoints(30, "for a perfect match, right away!")

						# Send notification
						self.userEvents.send({
							"type"   : "flash",
							"icon"   : "avatars/model-3.png",
							"title"  : "Perfect Match",
							"message": "Your simulation scored <em>%.4f</em>, right away! That's amazing!" % fitAfter
							})

					elif (fitAfter < 1.0):

						# <1.0 to a better <1.0? [Give 5 points]

						# Give 5 points
						self.earnPoints(5, "for a better match!")

						# Send notification
						self.userEvents.send({
							"type"   : "flash",
							"icon"   : "avatars/model-3.png",
							"title"  : "Amazing!",
							"message": "You got even better on your already perfect score, with <em>%.4f</em>" % fitAfter
							})

					elif (fitAfter < 4.0) and (fitBefore >= 4.0):

						# +4.0 -> 4.0 Good [Give 10 points]

						# Give 20 points
						self.earnPoints(10, "for a good match")

						# Send notification
						self.userEvents.send({
							"type"   : "flash",
							"icon"   : "avatars/model-1.png",
							"title"  : "Good Match",
							"message": "Your simulation scored <em>%.4f</em>, which is a really good result." % fitAfter
							})

					else:

						# Send notification
						self.userEvents.send({
							"type"   : "flash",
							"icon"   : "avatars/model-6.png",
							"title"  : "Bad Match",
							"message": "Your simulation scored <em>%.4f</em>. You need to bring this below <em>4.000</em>." % fitAfter
							})

				else:

					# Send notification
					self.userEvents.send({
						"type"   : "flash",
						"icon"   : "avatars/model-7.png",
						"title"  : "Not good",
						"message": "Your simulation scored <em>%.4f</em> which is not better than the current best score of <em>%.4f</em>." % (fitAfter, fitBefore)
						})

				# Save paper
				paper.save()


			else:

				# Calculate status message
				statusMsg = [
					"is pending execution", 
					"has started",
					"has completed",
					"has failed",
					"was cancelled",
					"is stalled"
				]

				# Send event
				self.userEvents.send({
					"type"   : "info",
					"title"  : "Job Queue",
					"message": "Your job with id #%i %s" % (job.id, statusMsg[job.status])
					})

		# Acknowledge all jobs
		if len(nackJobList) > 0:
			# Acknowledge these IDs
			JobQueue.update(acknowledged=1).where(JobQueue.id << nackJobList).execute()

	def checkForNewPMs(self):
		"""
		Check for unread PMs
		"""
		pass

	###################################
	# High-level functions
	###################################

	def setCooldown(self, name, offset):
		"""
		Set a cooldown timer for the user on the given offset of seconds from now
		"""

		# Synchronize
		self.reload()

		# Get state cooldowns
		cooldowns = self.dbUser.getState("cooldown", {})
		cooldowns[name] = int(time.time()) + offset
		self.dbUser.setState("cooldown", cooldowns)

		# Save record
		self.dbUser.save()

	def isCooldownExpired(self, name):
		"""
		Check if a cooldown timer has expired
		"""

		# Synchronize
		self.reload()

		# Get cooldown
		cooldowns = self.dbUser.getState("cooldown", {})
		if not name in cooldowns:
			return True

		# Check if time has passed
		if (time.time() > cooldowns[name]):
			# Cleanup upon expiry
			del cooldowns[name]
			return True

		# We haven't expired yet
		return False

	def trigger(self, action, **kwargs):
		"""
		Fire a particular trigger
		"""

		# Forward trigger request
		self.triggers.trigger( action, **kwargs )

	def achieved(self, a_id):
		"""
		Check if the user achieved this achievement ID
		"""

		# Check with the database user
		return self.dbUser.hasAchievement(a_id)

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

		# Look if that triggers a leaf achievement element
		for kb in self.leafAchievements:
			if kb.triggerEvent == name:
				ans.append({
						'action': 'achievement',
						'id': kb.id
					})

		# Return list
		return ans

	def enableAchievement(self, aItem):
		"""
		Enable the specified achievements
		"""

		# Include item in user's list of knowledges
		self.dbUser.addAchievement( aItem )

		# Update achievement & features cache
		self.updateCache_Achievements()
		self.updateCache_Feats()

		# Handle achievement actions
		actions = aItem.getActions()
		for aRec in actions:
			self.handleAction(aRec)

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

		# If this book does not exist in user's books, update it
		if not self.dbUser.hasVisitedBook(book.id):

			# Update visited book
			self.dbUser.visitBook(book.id)

			# Update book cache
			self.updateCache_Books();

			# Save 
			self.dbUser.save()

			# Trigger notification
			self.userEvents.send({
				"type"   : "info",
				"title"  : "Knowledge explored",
				"message": "That's the first time you see the term <em>%s</em>" % bookName
				})

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

	def earnPoints(self, points=0, reason=""):
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

		# If we have a reason, prepend a space
		if reason:
			reason = " " + reason

		# Fire event
		self.userEvents.send({
			"type"   : "success",
			"icon"   : "flash-icons/labo.png",
			"title"  : "Science Points",
			"message": "You have just earned <em>%i</em> science points%s!" % (points, reason)
			})

		# Inform server that the profile has changed
		self.userEvents.send({
			"type" 	 : "server",
			"event"	 : "profile.changed"
			})

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
			raise HLError("Could not access job %s" % job_id, "not-exists")

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

		# Update records
		job_dict['agents'] = agents
		job_dict['paper'] = paper
		
		# Return results
		return job_dict

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
				raise HLUserError("You must unlock the preceding item before unlocking this one!", "usage-error")


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
		self.updateCache_MachinePart()
		self.updateCache_Feats()
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

		# Get book name
		if partData['book']:
			try:
				partData['book'] = part.book.name
			except Book.DoesNotExist:
				partData['book'] = ""

		# Return
		return partData

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
		paper_dict = paper.serialize(expandForeigns=["team"])

		# Include attribute about ownership
		paper_dict['active'] = (paper_id == self.dbUser.activePaper_id)
		paper_dict['citations'] = paper.countCitations()
		paper_dict['cost'] = cost_estimation_function( paper_dict['citations'] )

		# Get details for the job record
		if paper.job_id != 0:

			# Get relevant job
			job = JobQueue.select( JobQueue.lastEvent ).where( JobQueue.id == paper.job_id ).get()

			# Include the time the job was updated
			paper_dict['results_date'] = str(job.lastEvent)

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

	def getBookExam(self, count=5):
		"""
		Return a new book exam
		"""

		# Require a book-exam cooldown timer
		if not self.isCooldownExpired("book-exam"):
			raise HLUserError("You will have to wait a bit more until you are able to take another exam", "wait")

		# Get user's visited books
		nonMasteredBooks = self.dbUser.getVisitedBooks()

		# Remove mastered books from nonMasteredBooks
		for k,v in self.bookState.iteritems():
			if v['correct'] >= v['questions']:
				try:
					i = nonMasteredBooks.index(k)
					del nonMasteredBooks[i]
				except ValueError:
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

		# Don't do anything if we don't really have replies
		if not replies:
			return

		# Copy the user's book status
		oBookState = copy.deepcopy(self.bookState)

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

		# Update cooldown timer
		self.setCooldown("book-exam", GameConfig.GAME_EXAM_COOLDOWN)

		# Give 5 points for successfully taking the quiz
		self.earnPoints(2, "for taking a quiz")

		# If any of the books just become 'mastered', it
		# happened because of our answer. Trigger the 'mastered'
		# event.
		for k,v in oBookState.iteritems():
			nv = self.bookState[k]

			# Check if they were/is mastered
			wasMastered = (v['questions'] ==  v['correct'])
			isMastered = (nv['questions'] == nv['correct'])

			# Check if the question is now mastered
			if not wasMastered and isMastered:

				# Get book details
				book = Book.get( Book.id == k )

				# Fire event
				self.userEvents.send({
					"type"   : "flash",
					"icon"   : "flash-icons/books.png",
					"title"  : "Mastered topic",
					"message": "You have just mastered the topic <em>%s</em>!" % book.name
					})

				# Give 5 points for mastering the topic
				self.earnPoints(8, "for mastering the topic")

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

		# Collect relevant paper
		ans = []
		teamIDs = []
		for row in Paper.select().where( whereQuery ).order_by( Paper.fit ).limit(limit):

			# Collect rows
			paper = row.serialize()

			# Mark row as active or inactive
			paper['active'] = (row.id == self.dbUser.activePaper_id)

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

			# If we are calculating cost, apply cost estimation function now
			if calculateCost:
				ans[i]['cost'] = cost_estimation_function( ans[i]['citations'] )

		# Return
		return ans

	def getAchievementsTree(self):
		"""
		Build and return the achievements tree as a nested list
		of parent/children dicts.
		"""
		
		# Synchronize
		self.reload()

		# Setup local properties
		aRoot = None
		aIndex = {}
		aElements = []

		# Get all achievements unlocked by the user
		userAchievements = self.dbUser.getAchievements()

		# Get all achievements as dictionaries
		aElements = Achievement.select(
				Achievement.id,
				Achievement.parent,
				Achievement.name,
				Achievement.desc,
				Achievement.icon
			).dicts()[:]

		# Put each one in index and create 'children' list
		for elm in aElements:
			# Create children
			elm['children'] = []
			# Check if this is enabled
			elm['enabled'] = (elm['id'] in userAchievements)
			# Keep on index
			aIndex[elm['id']] = elm
			# Look for root
			if elm['parent'] is None:
				aRoot = elm

		# Nest items
		for elm in aElements:
			# Put on paren'ts children
			aIndex[elm['parent']]['children'].append( elm )

		# Return root
		return aRoot

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
			analytics = user.analyticsProfile.serialize()

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
			'achievements'	: user.getAchievements(),
			'activePaper'	: user.activePaper_id,
			'vars' 			: json.loads(user.variables),
			'state' 		: json.loads(user.state),
			'analytics'		: analytics,
			'token'			: self.token.token,
			'papers'		: self.countPapers(),
			'servertime'	: int(time.time()),
			'team'			: teamName,
			}

