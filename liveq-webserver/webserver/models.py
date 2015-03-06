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

import logging
import datetime
import json

from peewee import *
from liveq.models import BaseModel, JobQueue, AgentGroup, Agent, \
						 AgentJobs, AgentMetrics, Lab, Tunable, \
						 Observable, TunableToObservable, PostMortems

from liveq.config.database import DatabaseConfig
from liveq.data.histo.intermediate import IntermediateHistogramCollection

# -----------------------------------------------------
#  Additional tables to create
# -----------------------------------------------------

def createWebserverTables():
	"""
	Create the database models in the ``webserver.models`` module, if
	their structure does not already exist.
	"""

	# Create the tables in the basic model
	for table in [ AnalyticsProfile, User, Team, TeamMembers, Tutorials, QuestionaireResponses, 
				   AnalyticsEvent, KnowledgeGrid, Definition, FirstTime, TootrAnimation,
				   TootrInterfaceTutorial, Book, Paper, PaperCitation ]:

		# Do nothing if the table is already there
		table.create_table(True)

# -----------------------------------------------------
#  In production
# -----------------------------------------------------

class AnalyticsProfile(BaseModel):
	"""
	Additional fields for the analytics user profile
	"""

	#: JSON Fields in this model
	JSON_FIELDS = ['metrics']

	#: Analytics UUID
	uuid = CharField(max_length=128)

	# Analytics fields
	gender = CharField(max_length=6,default="")
	birthYear = IntegerField(default=0)
	audienceSource = CharField(max_length=68, default="")
	audienceInterests = CharField(max_length=68, default="")

	#: When was it created
	created = DateTimeField(default=datetime.datetime.now)
	#: Last time user performed an analytics-aware action
	lastEvent = DateTimeField(default=datetime.datetime.now)

	# Analytics metrics
	metrics = TextField(default="{}")

	def save(self, *args, **kwargs):
		"""
		Auto-update lastEvent on save
		"""
		self.lastEvent = datetime.datetime.now()
		return super(AnalyticsProfile, self).save(*args, **kwargs)

class KnowledgeGrid(BaseModel):
	"""
	The knowledge grid
	"""

	#: JSON Fields in this model
	JSON_FIELDS = ['actions', 'features']

	#: Parent entry to KG
	parent = ForeignKeyField('self', null=True)

	#: The title of the knowledge grid element
	title = CharField(max_length=128)

	#: A short description for this element
	desc = TextField(default="")
	#: An image chat accompanies the short description
	descImage = CharField(max_length=128, default="")

	#: The kind of the element
	#: ([edu]cational, [int]erface, [exp]erience, [gam]e)
	kind = CharField(max_length=3, default="edu")
	#: Icon of the element
	icon = CharField(max_length=128, default="study.png")

	#: Cost in credits for this element
	cost = IntegerField(default=0)

	#: The name of the trigger event that will cause
	#: this knowledge grid element to be activated
	#: automatically (assuming credit is available)
	triggerEvent = CharField(max_length=128, default="")

	#: Enumeration of sequences to be performed upon
	#: unlocking this item
	actions = TextField(default="{}")

	#: Enumeration of features to be available upon
	#: unlocking this item
	features = TextField(default="{}")

	def getActions(self):
		"""
		Return the unlockable Actions
		"""
		try:
			return json.loads(self.actions)
		except ValueError as e:
			logging.error("ValueError parsing 'actions' of model '%s', key %s" % (self.__class__.__name__, self.id))
			return {}

	def setActions(self, data):
		"""
		Define the unlockable Actions
		"""
		self.actions = json.dumps(data)

	def getFeatures(self):
		"""
		Return the unlockable features
		"""	
		try:
			return json.loads(self.features)
		except ValueError as e:
			logging.error("ValueError parsing 'features' of model '%s', key %s" % (self.__class__.__name__, self.id))
			return {}

	def setFeatures(self, data):
		"""
		Define the unlockable features
		"""
		self.features = json.dumps(data)

	@staticmethod
	def getTotalFeatures(id_list):
		"""
		Return the accummulated list of features
		unlocked by the given list of knowedge grid items
		"""

		# Prepare features
		features = {}

		# Iterate over IDs
		if len(id_list) > 0:
			for kb in KnowledgeGrid.select().where( KnowledgeGrid.id << id_list ):

				# Iterate over features
				for k,v in kb.getFeatures().iteritems():

					# Populate missing features dict
					if not k in features:
						features[k] = []

					# Collect features
					if type(v) is list:
						features[k] += v
					else:
						features.append(v)

		# Return list
		return features

class User(BaseModel):
	"""
	The user registry
	"""

	#: JSON Fields in this model
	JSON_FIELDS = ['variables', 'state']

	# Log-in and profile
	# -----------------------------------

	#: The e-mail of the user
	email = CharField(max_length=128)

	#: The password
	password = CharField(max_length=128)
	#: The password hash
	salt = CharField(max_length=50)

	#: The permission groups this user has
	groups = TextField(default="")

	#: The display name
	displayName = CharField(max_length=128)

	#: The team avatar
	avatar = CharField(max_length=128)

	# -----------------------------------
	# Game elements
	# -----------------------------------

	#: User science points
	points = IntegerField(default=8)

	#: User accummulated science points
	totalPoints = IntegerField(default=8)

	#: Knowledge Grid elements explored
	knowledge = TextField(default="")

	#: Last explored knowledge item
	lastKnowledge = ForeignKeyField(KnowledgeGrid, null=True, default=None)

	# -----------------------------------
	# Metadata and analytics
	# -----------------------------------

	#: Variable parameters
	variables = TextField(default="{}")

	#: Current state information
	state = TextField(default="{}")

	#: Link to analytics profile
	analyticsProfile = ForeignKeyField(AnalyticsProfile, null=True, default=None)

	def __str__(self):
		"""
		Stringify result
		"""
		return self.displayName

	def getGroups(self):
		"""
		Split groups
		"""
		return self.groups.split(",")

	def setGroups(self, groups=[]):
		"""
		Update groups
		"""
		self.groups = ",".join(groups)

	def joinGroup(self, name):
		"""
		Join a permission group
		"""

		# Lowercase name
		name = name.lower()

		# Join group
		groups = self.getGroups()
		if not name in groups:
			groups.append(name)

			# Update field
			self.setGroups(groups)

	def leaveGroup(self, name):
		"""
		Leave a permission group
		"""

		# Lowercase name
		name = name.lower()

		# Join group
		groups = self.getGroups()
		if name in groups:
			i = groups.index(name)
			del groups[i]

			# Update field
			self.setGroups(groups)

	def inGroup(self, name):
		"""
		Check if the user is in this group
		"""

		# Fast comparison in the string
		return (",%s," % name.lower()) in (",%s," % self.groups)

	def inGroups(self, names, all=False):
		"""
		Check if user is in any or all of the given groups
		"""

		# Iterate over all names
		for g in names:
			if self.inGroup(g):
				# Member of least one group? (when all=False)
				if not all:
					return True
			else:
				# Not a member of at least one group? (when all=True)
				if all:
					return False

		# Not found?
		# When all=True, return True
		# When all=False, return False
		return all

	def getState(self, name, defValue=None):
		"""
		Return the value of a state variable
		"""

		# Load states
		state = {}
		if self.state:
			try:
				state = json.loads(self.state)
			except ValueError as e:
				logging.error("ValueError parsing 'state' of model '%s', key %s" % (self.__class__.__name__, self.id))

		# Return default if missing
		if not name in state:
			return defValue

		# Return property
		return state[name]

	def setState(self, name, value):
		"""
		Update state property
		"""

		# Load states
		state = {}
		if self.state:
			try:
				state = json.loads(self.state)
			except ValueError as e:
				logging.error("ValueError parsing 'state' of model '%s', key %s" % (self.__class__.__name__, self.id))

		# Update
		state[name] = value

		# Save state
		self.state = json.dumps(state)

	def getKnowledge(self):
		"""
		Split knowledge
		"""

		# Check for missing knowledge
		if not self.knowledge:
			return []

		# Return knowledge elements
		return map(int, self.knowledge.split(","))

	def setKnowledge(self, knowledgeItems=[]):
		"""
		Update knowledge
		"""
		self.knowledge = ",".join(knowledgeItems)

	def hasKnowledge(self, knowledgeItemID):
		"""
		Check if the user knows this knowledge ID
		"""
		return (",%i," % knowledgeItemID) in (",%s," % self.knowledge)

	def addKnowledge(self, knowledgeNode):
		"""
		Add the specified explored knowledge in list
		"""

		# Require node
		if not isinstance(knowledgeNode, KnowledgeGrid):
			raise IOError("addKnowledge accepts instance of KnowledgeGrid as argument!")

		# Exist if exists
		if (",%d," % knowledgeNode.id) in (",%s," % self.knowledge):
			return

		# Append item in list
		if self.knowledge:
			self.knowledge += ","
		self.knowledge += str(knowledgeNode.id)

		# Update last knowledge item
		self.lastKnowledge = knowledgeNode

class Team(BaseModel):
	"""
	The team registry
	"""

	#: The team uuid
	uuid = CharField(max_length=128, index=True, unique=True)
	#: The team name
	name = CharField(max_length=128)
	#: The team avatar
	avatar = CharField(max_length=128)

	#: The related agent group
	agentGroup = ForeignKeyField(AgentGroup)

class TeamMembers(BaseModel):
	"""
	User - Team correlations
	"""

	#: The related user
	user = ForeignKeyField(User)
	#: The related team
	team = ForeignKeyField(Team)
	#: The user role
	status = CharField(max_length=6, default="user")

class Paper(BaseModel):
	"""
	The published/publishable papers
	"""

	#: JSON Fields in this model
	JSON_FIELDS = ['tunableValues']

	#: The paper is draft
	DRAFT = 0
	#: The paper is released for a team review
	TEAM_REVIEW = 1
	#: The paper is published
	PUBLISHED = 3
	#: The paper is removed
	REMOVED = 4

	#: The main author (and owner) of the paper
	owner = ForeignKeyField(User)

	#: The team this paper was released under
	team = ForeignKeyField(Team)

	#: Title of the paper
	title = TextField(max_length=255)

	#: Body of the paper
	body = TextField(default="")

	#: The full list of the names of the authors
	authors = TextField(default="")

	#: The status of the paper
	status = IntegerField(default=0, index=True, unique=False)

	#: The ID of the archive directory that contains
	#: the results
	archive = CharField(max_length=128, default="")

	#: Tunable values
	tunableValues = TextField(default="{}")

	#: The related lab ID
	lab = ForeignKeyField(Lab)

	#: Goodness of fit
	fit = FloatField(default=0.0)

	#: When was it created
	created = DateTimeField(default=datetime.datetime.now)

	#: Last time user changed something
	lastEdited = DateTimeField(default=datetime.datetime.now)

	def save(self, *args, **kwargs):
		"""
		Auto-update lastEdited on save
		"""
		self.lastEdited = datetime.datetime.now()
		return super(AnalyticsProfile, self).save(*args, **kwargs)

	def updateAuthors(self):
		"""
		Get all the names in the team
		"""

		# Put the name of the author first
		self.authors = self.owner.displayName

		# Get all the team members
		for rec in TeamMembers.select().where( (TeamMembers.team == self.team) & (TeamMembers.user != self.owner) ):
			# Update authors
			if self.authors:
				self.authors += ", "
			self.authors += rec.displayName

	def getTunableValues(self):
		"""
		Return the tunable configuration
		"""		
		return json.loads(self.tunableValues)

	def setTunableValues(self, data):
		"""
		Return the tunable configuration
		"""
		self.tunableValues = json.dumps(data)

	def countCitations(self):
		"""
		Count paper citations
		"""

		# Count citations towards this paper
		rec = PaperCitation.select( fn.Count(PaperCitation.id).alias('count') ) \
					.where( PaperCitation.citation == self )

		# Return number
		return rec.count

class PaperCitation(BaseModel):
	"""
	"""

	#: The user who initiated the citation
	user = ForeignKeyField(User)

	#: The team the user belonged the moment of the citation
	team = ForeignKeyField(Team)

	#: The cited paper
	citation = ForeignKeyField(Paper)

class AnalyticsEvent(BaseModel):
	"""
	Aggregated user analytics
	"""

	#: JSON Fields in this model
	JSON_FIELDS = ['data']

	#: Link to analytics profile
	analyticsProfile = ForeignKeyField(AnalyticsProfile)
	#: When this event happened
	timestamp = DateTimeField(default=datetime.datetime.now)
	#: Name of the event
	name = CharField(max_length=128)
	#: Data for this event
	data = TextField(default="")

class Term(BaseModel):
	"""
	List of terms available for exploration
	"""
	
	#: Term name
	term = CharField(max_length=255)
	#: The book for more details regarding this tunable
	book = CharField(max_length=128, default="")

class Definition(BaseModel):
	"""
	A list of key/value definitions, usually for the configuration
	of the game interface.
	"""

	#: The configuration key
	key = CharField(max_length=128, primary_key=True)

	#: The configuration value
	value = TextField(default="")

class FirstTime(BaseModel):
	"""
	A list of first-time definitions and their respective pop-up text
	"""

	#: The name of the first-time aid
	key = CharField(max_length=128, primary_key=True)

	#: The text to display
	text = TextField(default="")

class TootrAnimation(BaseModel):
	"""
	TootR Animations for the user
	"""

	#: JSON Fields in this model
	JSON_FIELDS = ['lipsync','canvas','tweens']

	#: The animation name
	name = CharField(max_length=128, index=True, unique=True)

	#: Narration voice
	voice = CharField(max_length=128)
	#: Narration voice ID
	voice_id = CharField(max_length=128)

	#: Narration Text
	text = TextField()
	#: Narration Audio URL
	audio_url = CharField(max_length=128)

	#: Lipsync information
	lipsync = TextField(default="")
	#: Animation canvas
	canvas = TextField(default="")
	#: Animation tween
	tweens = TextField(default="")

class TootrInterfaceTutorial(BaseModel):
	"""
	TootR interface tutorial for the user
	"""

	#: JSON Fields in this model
	JSON_FIELDS = ['aids']

	#: The animation name
	name = CharField(max_length=128, index=True, unique=True)

	#: Tutorial title
	title = CharField(max_length=128)
	#: URL to the video
	video = CharField(max_length=255)

	#: Visual aids to focus and when
	aids = TextField()

class Book(BaseModel):
	"""
	Book definition
	"""

	#: JSON Fields in this model
	JSON_FIELDS = ['games', 'material']

	#: The name of the book
	name = CharField(max_length=128, index=True, unique=True)

	#: Title of the book
	title = CharField(max_length=128)
	#: Short overview of the book
	short = TextField(default="")

	#: Lipsync information
	description = TextField(default="")

	#: List of games linked
	games = TextField(default="[]")
	#: List of material linked
	material = TextField(default="[]")

# -----------------------------------------------------
#  Drafts
# -----------------------------------------------------

class QuestionaireResponses(BaseModel):
	"""
	Answers to questionaires
	"""

	#: The user who completed this questionaire
	user = ForeignKeyField(User)

	#: The questionaire name
	questionaire = CharField(max_length=128)

	#: User's responses
	response = TextField(default="{}")

class Tutorials(BaseModel):
	"""
	Tutorials for the user
	"""

	#: The UUID of the tutorial
	uuid = CharField(max_length=128, index=True, unique=True)
	#: The human-readable name of the tutorial
	title = CharField(max_length=128)
	#: A URL for the tutorial
	url = CharField(max_length=128)

class BookReference(BaseModel):
	"""
	Reference to scientific content for further reading 
	"""

	#: The name of the reference
	name = CharField(max_length=128, index=True, unique=True)

	#: The title of this publication
	title = CharField(max_length=255, default="")
	#: The author list
	authors = CharField(max_length=255, default="")
	#: An optional icon for the publication listing
	icon = CharField(max_length=128, default="")

	#: The URL to the publication
	url = CharField(max_length=255, default="")

