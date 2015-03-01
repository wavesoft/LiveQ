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
from liveq.config.database import DatabaseConfig
from liveq.data.histo.intermediate import IntermediateHistogramCollection

# -----------------------------------------------------
#  Base class for the models
# -----------------------------------------------------

class BaseModel(Model):
	"""
	Base Model

	Base model class for all of the LiveQ Models. It automatically
	binds the model with the configured database.
	"""
	class Meta:
		database = DatabaseConfig.DB

	#: Which fields should be encoded using JSON
	JSON_FIELDS = []

def createBaseTables():
	"""
	Create the database models in the ``liveq.models`` module, if
	their structure does not already exist.
	"""

	# Create the tables in the basic model
	for table in [ AnalyticsProfile, User, AgentGroup, Team, TeamMembers, Jobs, Agent, AgentJobs, AgentMetrics, Lab, 
					Tutorials, Tunable, Observable, TunableToObservable, TeamNotebook, QuestionaireResponses,
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

class AgentGroup(BaseModel):
	"""
	Agent groups class
	"""

	#: Add an additional UUID lookup index
	uuid = CharField(max_length=128, index=True, unique=True)

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

class Jobs(BaseModel):
	"""
	Jobs
	"""

	#: When the job was submitted
	timestamp = IntegerField(default=0)

	#: The channel name where real-time I/O is performed
	channel = CharField(max_length=128)

	#: The tunable in this configuration
	tunables = TextField(default="")
	#: The observables in this configuration
	observables = TextField(default="")

	#: The tunable values of this configuration
	tunableValues = TextField(default="")
	#: The observable results of this configuration
	observableValues = TextField(default="")

	#: The team that owns this job
	team = ForeignKeyField(Team)

	#: The job status
	status = CharField(max_length=4, default="PEND")

	#: Job status can be one of the following:
	STATUS_ENUM = (
		# Job not yet started
		'PEND',
		# Job currently running
		'RUN',
		# Job completed
		'DONE',
		# Job failed
		'FAIL'
	)

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

	def getObservableValues(self):
		"""
		Return the observable histograms data
		"""
		# Return blank if no histograms included
		if not self.observableValues:
			return IntermediateHistogramCollection()
		else:
			return IntermediateHistogramCollection.fromPack(self.observableValues)

	def setObservableValues(self, intermediateHistogramCollection):
		"""
		Set the observable histogram data
		"""
		# Get a subset of the observables that we are monitoring
		sset = intermediateHistogramCollection.subset(this.getObservableNames())
		# Pack and store
		self.observableValues = sset.pack()


	def getTunableNames(self):
		"""
		Return the names of the tunables
		"""
		return str(self.tunables).split(",")

	def setTunableNames(self, data):
		"""
		Update the names of the tunables
		"""
		self.tunables = ",".join(data)

	def getObservableNames(self):
		"""
		Return the names of the Observables
		"""
		return str(self.observables).split(",")

	def setObservableNames(self, data):
		"""
		Update the names of the Observables
		"""
		self.observables = ",".join(data)

class Agent(BaseModel):
	"""
	Agent instance class
	"""

	#: Add an additional UUID lookup index
	uuid = CharField(max_length=128, index=True, unique=True)

	#: The timestamp of the last activity of the agent
	lastActivity = IntegerField(default=0)
	#: The feature string responded by the entity at discovery
	features = CharField(default="")
	#: The version of the remote agent
	version = IntegerField(default=0)
	#: The slots this agent can provide
	slots = IntegerField(default=1)
	#: The state of the agent
	state = IntegerField(default=0)

	#: The timestamp of the last failure
	fail_timestamp = IntegerField(default=0)
	#: The number of failures before recovery
	fail_count = IntegerField(default=0)

	#: The group where it belongs to
	group = ForeignKeyField(AgentGroup, related_name='groups')
	#: The job currently running on the agent
	activeJob = CharField(default="")

	#: The owner of this agent
	owner = ForeignKeyField(User, null=True, default=None)

class AgentJobs(BaseModel):
	"""
	Agent/Job/Group binding for addressing 
	"""

	#: The related agent
	agent = ForeignKeyField(Agent)
	#: The related group
	group = ForeignKeyField(AgentGroup)
	#: Job ID
	jobid = CharField(default="")


class AgentMetrics(BaseModel):
	"""
	Agent metrics
	"""

	#: Add an additional UUID lookup index
	uuid = CharField(max_length=128, index=True, unique=True)

	#: The related agent
	agent = ForeignKeyField(Agent)
	#: Ammount of CPU time spent
	cputime = IntegerField(default=0)
	#: Number of jobs sent to this agent
	jobs_sent = IntegerField(default=0)
	#: Number of jobs succeeded in this agent
	jobs_succeed = IntegerField(default=0)
	#: Number of jobs failed in this agent
	jobs_failed = IntegerField(default=0)
	#: Number of jobs aborted in this agent
	jobs_aborted = IntegerField(default=0)


class Lab(BaseModel):
	"""
	Lab reference description
	"""

	#: Add an additional UUID lookup index that allows
	#: annonymization of the Lab IDs
	uuid = CharField(max_length=128, index=True, unique=True)
	#: The name of the lab
	name = CharField(max_length=128)
	#: The repository tag/version to checkout
	repoTag = CharField()
	#: The repository base that contains the software
	repoURL = CharField()
	#: The repository type that will be used
	repoType = CharField(max_length=12, default="svn")
	#: The non-tunable parameters for the job
	fixedParameters = TextField()
	#: The parameters the user can send
	tunableParameters = TextField()
	#: The observed histograms
	histograms = TextField()
	#: The type of the histograms
	histogramType = CharField(max_length=12, default="FLAT")

	def getParameters(self):
		"""
		Return the parsed parameters
		"""
		return json.loads(self.fixedParameters)

	def setParameters(self, data):
		"""
		Update the fixed parameters
		"""
		self.fixedParameters = json.dumps(data)

	def getTunableNames(self):
		"""
		Return the names of the tunables
		"""
		return str(self.tunableParameters).split(",")

	def setTunableNames(self, data):
		"""
		Update the names of the tunables
		"""
		self.tunableParameters = ",".join(data)

	def getHistograms(self):
		"""
		Return the names of the histograms to send to the user
		"""
		return str(self.histograms).split(",")
		
	def setHistograms(self, data):
		"""
		Set the names of the histograms to send to the user
		"""
		self.histograms = ",".join(data)

	def getTunables(self):
		"""
		Return the configuration for the tunable parameters
		"""

		config = []
		names = self.getTunableNames()
		for name in names:

			# Fetch the tunable record for every name
			config.append( Tunable.get(name=name) )

		# Return tunable configuration
		return config

	def formatTunables(self, tunables, asString=False):
		"""
		Format tunables
		"""

		# Prepare response
		ans = { }

		# Process tunables
		cfgTunables = self.getTunables()
		for t in cfgTunables:

			# Get value
			k = t.name
			v = 0.0
			if not k in tunables:
				# If we don't have the value, get default
				v = t.default
			else:
				# Otherwise, clamp to limits
				v = min( t.max, max( t.min, float(tunables[k]) ) )

			# Snap decimals when converting to string
			if asString:
				ans[k] = ("%." + str(t.dec) + "f") % v
			else:
				ans[k] = v

		# Return answer
		return ans

class Tunable(BaseModel):
	"""
	Description for the tunables as an individual parameter
	"""

	#: JSON Fields in this model
	JSON_FIELDS = ['options']

	#: The name of variable of the tunable parameter
	name = CharField(max_length=128, index=True, unique=True)
	#: The short (iconic title)
	short = CharField(max_length=50)
	#: The group this tunable belongs in
	group = CharField(max_length=128)
	#: The sub-group this tunable belongs in
	subgroup = CharField(max_length=128)
	#: The book for more details regarding this tunable
	book = CharField(max_length=128, default="")
	#: The human-readable name of the tunable
	title = CharField(max_length=128, default="")
	#: Units
	units = CharField(max_length=64, default="")

	#: A short description for this tunable
	desc = TextField(default="")
	#: an image that accompanies the short description
	descImage = CharField(max_length=128, default="")

	#: The UI component to use for visualizing this variable
	type = CharField(max_length=8, default="num")
	#: The default value for the tunable
	default = FloatField(default=0.0)
	#: The minimum value for the tunable
	min = FloatField(default=0.0)
	#: The maximum value for the tunable
	max = FloatField(default=1.0)
	#: The number of decimals to show on the value
	dec = IntegerField(default=4)

	#: A set of choices or additional options for the tunable
	options = TextField(default="")

	def getOptions(self):
		"""
		JSON-Decode options
		"""
		return json.loads(self.options)

	def setOptions(self, options=[]):
		"""
		JSON-Encode options
		"""
		self.options = json.dumps(options)

class Observable(BaseModel):
	"""
	The description of the ovservables
	"""

	#: The name of the histogram (AIDA Path) for this observable
	name = CharField(max_length=128, index=True, unique=True)
	#: The short (iconic title)
	short = CharField(max_length=50)
	#: The group this tunable belongs in
	group = CharField(max_length=128)
	#: The sub-group this tunable belongs in
	subgroup = CharField(max_length=128)
	#: The book for more details regarding this tunable
	book = CharField(max_length=128, default="")

	#: Description
	desc = TextField(default="")
	#: The human-readable name of the observable
	title = CharField(max_length=128)
	#: The rendered TeX title as an image
	titleImg = TextField(default="")
	#: The X-Label for the observable plot
	labelX = CharField(max_length=128, default="")
	#: The rendered TeX labelX as an image
	labelXImg = TextField(default="")
	#: The Y-Label for the observable plot
	labelY = CharField(max_length=128, default="")
	#: The rendered TeX labelY as an image
	labelYImg = TextField(default="")

	#: Logarithmic Y axis
	logY = IntegerField(default=1)
	#: Additional plot info
	plotInfo = TextField(default="")
	#: Polynomial fit score
	fitDegree = IntegerField(default=10)
	#: Analysis where this belongs to
	analysis = CharField(max_length=128,default="")

	#: Cuts
	cuts = CharField(max_length=64, default="")
	#: Parameters
	params = CharField(max_length=64, default="")
	#: Process
	process = CharField(max_length=64, default="")

	#: Accelerators (beam/energy) combinations
	accelerators = TextField(default="")

	def setAccelerators(self, tuples):
		"""
		Set the list of accelerator (beam/energy) combinations
		"""

		# Store accelerator tuples
		self.accelerators = ""
		for t in tuples:
			# Add Comma
			if self.accelerators:
				self.accelerators += ","
			# Store tuple
			self.accelerators += "%s/%s" % t

	def getAccelerators(self):
		"""
		Return the list of accelerator (beam/energy) combinations
		"""

		# Return accelerator tuples
		return map(lambda x: x.split("/"), self.accelerators.split(","))

class PostMortems(BaseModel):
	"""
	The description of post-mortems received from the worker nodes
	"""

	#: The timestamp of the post-mortem
	timestamp = IntegerField(default=0)
	#: The agent from which the PM originates
	agent = ForeignKeyField(Agent)
	#: The post-mortem payload
	data = TextField(default="")

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

class TeamNotebook(BaseModel):
	"""
	The shared notebook along teammates
	"""

	#: The team owning the book
	team = ForeignKeyField(Team)

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

class TunableToObservable(BaseModel):
	"""
	The description of the link between the tunable and the observable
	"""

	#: The tunable to link from
	tunable = CharField(max_length=128, index=True, unique=False)
	#: The observable where it links to
	observable = CharField(max_length=128, index=True, unique=False)

	#: The title of this relation
	title = CharField(max_length=128, default="")
	#: A short description for this link
	shortdesc = TextField(default="")
	#: A URL for the long description
	urldesc = CharField(max_length=128, default="")
	#: The UUID of the tutorial
	tutorial = CharField(max_length=64, default="")

	#: The importance of this relation
	importance = IntegerField(default=0)

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

