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

	def serialize(self, expandJSON=True, expandForeigns=[]):
		"""
		Serialize the current record to a dictionary
		"""

		# Get model fields
		FIELDS = self.__class__._meta.get_field_names()

		# Compile document
		document = {}
		for f in FIELDS:
			v = getattr(self, f)
			if (f in self.__class__.JSON_FIELDS) and expandJSON:
				if not v:
					document[f] = {}
				else:
					document[f] = json.loads(v)
			else:
				if isinstance(v, Model):

					# If we are asked to expand this foreign key, 
					# do it now.
					if (expandForeigns == True) or (f in expandForeigns):
						# Expand foreign key? Serialize
						document[f] = v.serialize()
					else:
						# Foreign key? Just get the raw key value
						document[f] = self._data[f]  #getattr(v, v._meta.primary_key.name)

				elif isinstance(v, datetime.datetime):
					# Convert datetime to UTC Time
					document[f] = str(v)
				else:
					# Otherwise keep it as it is
					document[f] = v

		# Return document
		return document


def createBaseTables():
	"""
	Create the database models in the ``liveq.models`` module, if
	their structure does not already exist.
	"""

	# Create the tables in the basic model
	for table in [ AgentGroup, Agent, AgentMetrics, Lab, Tunable, Observable, TunableToObservable, 
				   PostMortems, JobQueue ]:

		# Do nothing if the table is already there
		table.create_table(True)

# -----------------------------------------------------
#  In production
# -----------------------------------------------------

class Lab(BaseModel):
	"""
	Lab reference description
	"""

	#: Add an additional UUID lookup index that allows
	#: annonymization of the Lab IDs
	uuid = CharField(max_length=128, index=True, unique=True)
	#: The name of the lab
	name = CharField(max_length=128)
	#: If this lab is default to new users
	default = IntegerField(default=0)
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

	def getEventCount(self, defaultEvents=100000):
		"""
		Return number of events from parameters
		"""

		# Check if missing
		params = self.getParameters()
		if not 'events' in params:
			return defaultEvents

		# Return events
		return params['events']

class JobQueue(BaseModel):
	"""
	Queue of jobs pending in the LiveQ jobManager
	"""

	#: When the job was submitted
	submitted = DateTimeField(default=datetime.datetime.now)

	#: Last time user performed an analytics-aware action
	lastEvent = DateTimeField(default=datetime.datetime.now)

	#: The channel name where real-time I/O is performed
	dataChannel = CharField(max_length=128)

	#: The tunes the user submitted for this job
	userTunes = TextField(default="")

	#: The team that owns this job
	team_id = IntegerField(default=0)
	#: The user who submitted this job
	user_id = IntegerField(default=0)
	#: The paper to update after completion
	paper_id = IntegerField(default=0)

	#: The agent group where to run this job
	group = CharField(max_length=128)

	#: The lab where this job is going to run into
	lab = ForeignKeyField(Lab)

	#: The actual parameters sent to agent
	parameters = TextField(default="")

	#: The job status (indexable)
	status = IntegerField(default=0, index=True, unique=False)

	#: Events processed
	events = IntegerField(default=0)

	#: Job status can be one of the following:
	PENDING  	= 0
	RUN  		= 1
	COMPLETED  	= 2
	FAILED  	= 3
	CANCELLED   = 4
	STALLED		= 5

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

	def save(self, *args, **kwargs):
		"""
		Auto-update lastEvent on save
		"""
		self.lastEvent = datetime.datetime.now()
		return super(JobQueue, self).save(*args, **kwargs)

class AgentGroup(BaseModel):
	"""
	Agent groups class
	"""

	#: Add an additional UUID lookup index
	uuid = CharField(max_length=128, index=True, unique=True)

class Agent(BaseModel):
	"""
	Agent instance class
	"""

	#: Add an additional UUID lookup index
	uuid = CharField(max_length=128, index=True, unique=True)

	#: Agent's IP Address
	ip = CharField(max_length=45, index=True, unique=True)
	#: Lattitude and longitude
	latlng = CharField(max_length=20, index=True, unique=True)

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
	activeJob = IntegerField(default=0)
	#: The number of events on these workers
	activeJobEvents = IntegerField(default=0)
	#: The job emtadata
	activeJobRuntime = TextField(default="{}")

	#: The owner ID of this agent
	owner_id = IntegerField(default=0)

	def getRuntime(self):
		"""
		Get runtime configuration
		"""
		if not self.activeJobRuntime:
			return {}
		return json.loads(self.activeJobRuntime)

	def setRuntime(self, runtime):
		"""
		Update runtime configuration
		"""
		if not runtime:
			# Reset runtime
			self.activeJobRuntime = ""
			self.activeJobEvents = 0
		else:
			# Update runtime
			self.activeJobRuntime = json.dumps(runtime)
			# Update runtime events
			if 'events' in runtime:
				self.activeJobEvents = int(runtime['events'])

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

class Tunable(BaseModel):
	"""
	Description for the tunables as an individual parameter
	"""

	#: JSON Fields in this model
	JSON_FIELDS = ['options']

	#: The name of variable of the tunable parameter
	name = CharField(max_length=128, index=True, unique=True, default="")
	#: The short (iconic title)
	short = CharField(max_length=50, default="")
	#: The group this tunable belongs in
	group = CharField(max_length=128, default="")
	#: The sub-group this tunable belongs in
	subgroup = CharField(max_length=128, default="")
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

