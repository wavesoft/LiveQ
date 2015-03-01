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

import datetime
import json

from peewee import *
from liveq.models import BaseModel, Jobs, AgentGroup, Agent, \
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
				   AnalyticsEvent, KnowledgeGrid ]:

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
	JSON_FIELDS = ['u_actions', 'u_features']

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
	u_actions = TextField(default="{}")

	#: Enumeration of features to be available upon
	#: unlocking this item
	u_features = TextField(default="{}")

	def getActions(self):
		"""
		Return the unlockable Actions
		"""		
		return json.loads(self.u_actions)

	def setActions(self, data):
		"""
		Define the unlockable Actions
		"""
		self.u_actions = json.dumps(data)

	def getFeatures(self):
		"""
		Return the unlockable features
		"""		
		return json.loads(self.u_features)

	def setFeatures(self, data):
		"""
		Define the unlockable features
		"""
		self.u_features = json.dumps(data)

	@staticmethod
	def getTotalFeatures(self, ofIDs=[]):
		"""
		Return the accummulated list of features
		unlocked by the given list of knowedge grid items
		"""

		# Prepare features
		features = {}

		# Iterate over IDs
		for kb in KnowledgeGrid.select().where( KnowledgeGrid.id << ofIDs ):

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
	JSON_FIELDS = ['variables']

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
			state = json.loads(self.state)

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
			state = json.loads(self.state)

		# Update
		state[name] = value

		# Save state
		self.state = json.dumps(state)

	def getKnowledge(self):
		"""
		Split knowledge
		"""
		return self.knowledge.split(",")

	def setKnowledge(self, knowledgeItems=[]):
		"""
		Update knowledge
		"""
		self.knowledge = ",".join(knowledgeItems)

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

def Term(BaseModel):
	"""
	List of terms available for exploration
	"""
	
	#: Term name
	term = CharField(max_length=255)
	#: The book for more details regarding this tunable
	book = CharField(max_length=128, default="")


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

