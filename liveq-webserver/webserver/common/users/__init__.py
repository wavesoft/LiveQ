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

import time
import json
import uuid
import logging
import random
import string
import hashlib
import datetime

from peewee import fn, JOIN_LEFT_OUTER
from webserver.common.forum import registerForumUser, forumUsernameExists, forumUidFromUser, forumUserUnreadPMs

from liveq.models import Tunable
from webserver.models import *
from webserver.config import GameConfig
from webserver.common.userevents import UserEvents
from webserver.common.triggers import Triggers
from webserver.common.email import EMail
from webserver.common.users.exceptions import HLUserError

# Splitted sub-apis
from webserver.common.users.papers import HLUser_Papers
from webserver.common.users.books import HLUser_Books
from webserver.common.users.team import HLUser_Team
from webserver.common.users.job import HLUser_Job

#: The user hasn't visited this book
BOOK_UNKNOWN = 0
#: The user knows this book
BOOK_KNOWN = 1
#: The user has mastered this book
BOOK_MASTERED = 2


class HLUser(HLUser_Papers, HLUser_Books, HLUser_Team, HLUser_Job):
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

		# Anonymous user UUID when analytics is disabled
		self.analyticsTrackID = uuid.uuid4().hex
		self.analyticsProfile = user.analyticsProfile
		if not self.analyticsProfile is None:
			self.analyticsTrackID = self.analyticsProfile.uuid

		# Cache my information
		self.name = user.displayName
		self.id = user.id
		self.lab = user.lab
		self.activePaper_id = user.activePaper_id
		self.activityCounter = user.playTime

		# Keep a cache of acknowledged PM reads
		self.forumUserID = forumUidFromUser( self.dbUser )
		self.forumAcknowledgedPMs = []

		# Team-releated information
		self.teamMembership = None
		self.teamID = 0
		self.resourceGroup = None

		# Receive user events
		self.userEvents = UserEvents.forUser( self.id )
		self.userEventsListener = None

		# Get a reference to user triggers
		self.triggers = Triggers( self )

		# Re-generate invalid caches
		if (not self.dbUser.state) or (self.dbUser.state == "{}"):
			self.updateCache_Achievements()
			self.updateCache_Books()
			self.updateCache_Feats()
			self.dbUser.save()

		# Preheat user cache
		self.loadCache_Achievements()
		self.loadCache_Books()

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
			self.resourceGroup = self.teamMembership.team.agentGroup

		except TeamMembers.DoesNotExist:
			# Not in a team

			self.logger.warn("Not a member of a team! This might cause an unhandled exception somewhere...")
			pass

		self.updateCache_MachinePart()

	@staticmethod
	def sendActivationMail(user, activateUrl):
		"""
		Send activation mail to the specified user
		"""

		# Create a user activation mail token for this user
		token = UserActivationMailToken.forUser(user)

		# Prepare e-mail macros
		macros = user.serialize()
		macros['activateurl'] = "%s?token=%s" % (activateUrl, token.token)

		# Send e-mail confirmation mail
		EMail.queue( user.email, "verify", macros=macros )

	@staticmethod
	def register(profile, activateUrl):
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
				similar_more=profile['analytics']['similar_more'],
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

		# Send validation mail
		HLUser.sendActivationMail( user, activateUrl )

		# Return hluser
		return hluser

	def reset(self):
		"""
		Reset status and progress fields
		"""

		# Update analytics profile
		if not self.dbUser.analyticsProfile is None:

			# Update the date when this profile was reset
			self.dbUser.analyticsProfile.updateMetric("reset", str(datetime.datetime.now()) )
			self.dbUser.analyticsProfile.save()

		# Delete user tokens
		UserTokens.delete()\
			.where( UserTokens.user == self.dbUser ) \
			.execute()

		# Delete from team membership
		TeamMembers.delete()\
			.where( TeamMembers.user == self.dbUser ) \
			.execute()

		# Delete unlocked stage information
		MachinePartStageUnlock.delete()\
			.where( MachinePartStageUnlock.user == self.dbUser ) \
			.execute()

		# Delete papers
		Paper.delete()\
			.where( Paper.owner == self.dbUser ) \
			.execute()

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

		# Commit activity at cleanup
		self.dbUser.playTime = self.activityCounter
		self.dbUser.save()

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
		for p in MachinePart.select(
				MachinePart,
				fn.Count(MachinePartStage.id).alias("total"),
			) \
			.group_by( MachinePart.id ) \
			.join( MachinePartStage ):

			# Get part IDs
			p_ids = []

			# Get all unlocked parts
			for up in MachinePartStageUnlock \
				.select(
					MachinePartStageUnlock.id, 
					MachinePartStageUnlock.stage, 
					MachinePartStageUnlock.user,
					MachinePartStage.id.alias("stage_part_id")
				 ) \
				.join( MachinePartStage ) \
				.where(
					  (MachinePartStage.part == p)
					& (MachinePartStageUnlock.user == self.dbUser)
				):

				# Collect IDs
				p_ids.append(up.id)

			# Count unlockable parts
			whereQuery = (MachinePartStage.part == p) \
					  &  (MachinePartStage.cost <= self.dbUser.points)
			if len(p_ids) > 0:
				whereQuery &= ~(MachinePartStage.id << p_ids)
			unlockable = MachinePartStage.select(
					fn.count( MachinePartStage.id )
				)\
				.where(whereQuery) \
				.limit(1) \
				.scalar()

			# Unlockable is at max 1
			if unlockable > 1:
				unlockable = 1

			# Update total
			parts[p.name] = {
				"total": p.total,
				"unlocked": len(p_ids),
				"unlockable": unlockable
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

		# Get known observables
		knownObservables = self.getKnownObservables()

		# Get the list of jobs with acknowledged = 0 flag
		nackJobList = []
		for job in JobQueue.select( 
				JobQueue.id, 
				JobQueue.status,
				JobQueue.paper_id,
				JobQueue.userTunes,
				JobQueue.fit,
				JobQueue.resultsMeta
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

				# If there was no previous fit, assume it
				# was a really big number
				if fitBefore == 0.0:
					fitBefore = 10000000000

				# Calculate fit on known observables
				jobMeta = job.getResultsMeta()
				fitAfter = 0.0
				fitCount = 0
				if 'fitscores' in jobMeta:

					# Collect only known histograms
					for k,v in jobMeta['fitscores'].iteritems():
						if k in knownObservables:
							if v > 0.0:
								fitAfter += v
								fitCount += 1

					# Average
					fitAfter /= fitCount
				else:
					fitAfter = job.fit


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
					if (fitAfter < 1.0) and ((fitBefore >= 1.0) and (fitBefore <= 4.0)):

						# 4.0 -> 1.0 Great [Give extra 20 points]

						# Give 20 points
						self.earnPoints(20, "for a perfect match")

						# Send analytics helper
						self.userEvents.send({
							"type"	 : "analytics",
							"id"     : "tuning.values.validate",
							"data"	 : {
								"fit": fitAfter,
								"lastFit": fitBefore,
								"status": "not-good"
								}
							})

						# Send notification
						self.userEvents.send({
							"type"   : "flash",
							"icon"   : "models/good.png",
							"title"  : "Perfect Match",
							"message": "Your simulation scored <em>%.4f</em>, which is better than your previous attempt!" % fitAfter
							})

					elif (fitAfter < 1.0) and (fitBefore > 4.0):

						# +4.0 -> 1.0 Superb [Give 30 points]

						# Give 20 points
						self.earnPoints(30, "for a perfect match, right away!")

						# Send analytics helper
						self.userEvents.send({
							"type"	 : "analytics",
							"id"     : "tuning.values.validate",
							"data"	 : {
								"fit": fitAfter,
								"lastFit": fitBefore,
								"status": "perfect"
								}
							})

						# Send notification
						self.userEvents.send({
							"type"   : "flash",
							"icon"   : "models/perfect.png",
							"title"  : "Perfect Match",
							"message": "Your simulation scored <em>%.4f</em>, right away! That's amazing!" % fitAfter
							})

					elif (fitAfter < 1.0):

						# <1.0 to a better <1.0? [Give 5 points]

						# Give 5 points
						self.earnPoints(5, "for a better match!")

						# Send analytics helper
						self.userEvents.send({
							"type"	 : "analytics",
							"id"     : "tuning.values.validate",
							"data"	 : {
								"fit": fitAfter,
								"lastFit": fitBefore,
								"status": "good"
								}
							})

						# Send notification
						self.userEvents.send({
							"type"   : "flash",
							"icon"   : "models/good.png",
							"title"  : "Amazing!",
							"message": "You got even better on your already perfect score, with <em>%.4f</em>" % fitAfter
							})

					elif (fitAfter < 4.0) and (fitBefore >= 4.0):

						# +4.0 -> 4.0 Good [Give 10 points]

						# Give 20 points
						self.earnPoints(10, "for a good match")

						# Send analytics helper
						self.userEvents.send({
							"type"	 : "analytics",
							"id"     : "tuning.values.validate",
							"data"	 : {
								"fit": fitAfter,
								"lastFit": fitBefore,
								"status": "fair"
								}
							})

						# Send notification
						self.userEvents.send({
							"type"   : "flash",
							"icon"   : "models/fair.png",
							"title"  : "Good Match",
							"message": "Your simulation scored <em>%.4f</em>, which is a really good result." % fitAfter
							})

					elif (fitAfter < 4.0):

						# <4.0 to a better <4.0? [Give 2 points]

						# Give 2 points
						self.earnPoints(2, "for a better match!")

						# Send analytics helper
						self.userEvents.send({
							"type"	 : "analytics",
							"id"     : "tuning.values.validate",
							"data"	 : {
								"fit": fitAfter,
								"lastFit": fitBefore,
								"status": "could-be-better"
								}
							})

						# Send notification
						self.userEvents.send({
							"type"   : "flash",
							"icon"   : "models/fair.png",
							"title"  : "Good Match",
							"message": "Your simulation scored <em>%.4f</em>. Can you bring it below <em>1.000</em>?" % fitAfter
							})

					else:

						# Send analytics helper
						self.userEvents.send({
							"type"	 : "analytics",
							"id"     : "tuning.values.validate",
							"data"	 : {
								"fit": fitAfter,
								"lastFit": fitBefore,
								"status": "bad"
								}
							})

						# Send notification
						self.userEvents.send({
							"type"   : "flash",
							"icon"   : "models/bad.png",
							"title"  : "Bad Match",
							"message": "Your simulation scored <em>%.4f</em>. You need to bring this below <em>4.000</em>." % fitAfter
							})

				else:

					# Send analytics helper
					self.userEvents.send({
						"type"	 : "analytics",
						"id"     : "tuning.values.validate",
						"data"	 : {
							"fit": fitAfter,
							"lastFit": fitBefore,
							"status": "not-better"
							}
						})

					# Send notification
					self.userEvents.send({
						"type"   : "flash",
						"icon"   : "models/acceptable.png",
						"title"  : "Not good",
						"message": "Your simulation scored <em>%.4f</em> which is not better than the current best score of <em>%.4f</em>." % (fitAfter, fitBefore)
						})

				# Save paper
				paper.save()


			else:

				# Calculate status message
				statusMsg = [
					"is pending execution", 
					"got some workers",
					"has completed",
					"has failed",
					"was cancelled",
					"has no more active workers"
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

		# Notify not-acknowledged PMs
		for pm in self.getUserMessages():
			if not pm['id'] in self.forumAcknowledgedPMs:

				# Send event
				self.userEvents.send({
					"type"   : "info",
					"title"  : "Private Message",
					"message": "You have a new message from <strong>%s</strong> with subject <em>%s</em>" % (pm['from'], pm['subject'])
					})

				# Acknowledge notification of the PM
				self.forumAcknowledgedPMs.append( pm['id'] )

	###################################
	# High-level functions
	###################################

	def getHybridUserState_Hack(self):
		"""
		Return user state, hacking the 'hard_config' in it
		"""

		# Merge 'hard_config' to 'config'
		state = self.dbUser.getState()
		if 'hard_config' in state:

			# Get or create config
			if 'config' in state:
				config = state['config']
			else:
				config = {}

			# Update config
			config += state['hard_config']

			# Delete hard config
			del state['hard_config']
			state['config'] = config

		# Return state
		return state

	def hasConfigEnabled(self, name):
		"""
		Check if the user has this configuration enabled
		"""

		# Get state
		state = self.getHybridUserState_Hack()

		# Check for obvious cases
		if not 'config' in state:
			return False
		if not name in state['config']:
			return False

		# Got it!
		return True

	def enableConfig(self, name):
		"""
		Enable that particular configuration option
		"""

		# Sync user
		self.reload()

		# Get user state
		state = self.dbUser.getState("hard_config", {})

		# Enable state
		state[name] = 1

		# Update user state
		self.dbUser.setState("hard_config", state)
		self.dbUser.save()

		# Inform server that the profile has changed
		self.userEvents.send({
			"type" 	 : "server",
			"event"	 : "profile.changed"
			})

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

	###################################
	# In-game information queries
	###################################

	def updateActivityCounter(self, counter):
		"""
		Update user's record
		"""

		# Update activity counter
		self.activityCounter += counter

	def getUserMessages(self):
		"""
		Return a list of user PMs
		"""

		# Return unread PMs
		return forumUserUnreadPMs( self.forumUserID )

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
		# (This will fire an HLUserError if the 
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
		if self.analyticsProfile:
			analytics = user.analyticsProfile.serialize()

		# Get team name
		teamName = ""
		if not (self.teamMembership is None):
			teamName = self.teamMembership.team.name

		# Send user profile
		return {
			'trackid'		: self.analyticsTrackID,
			'id'			: user.id,
			'email' 		: user.email,
			'displayName' 	: user.displayName,
			'avatar' 		: user.avatar,
			'points'		: user.points,
			'totalPoints'	: user.totalPoints,
			'groups'		: user.getGroups(),
			'achievements'	: user.getAchievements(),
			'activePaper'	: user.activePaper_id,
			'vars' 			: json.loads(user.variables),
			'state' 		: self.getHybridUserState_Hack(),
			'analytics'		: analytics,
			'token'			: self.token.token,
			'papers'		: self.countPapers(),
			'servertime'	: int(time.time()),
			'team'			: teamName,
			}

