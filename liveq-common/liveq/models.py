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

def createBaseTables():
	"""
	Create the database models in the ``liveq.models`` module, if
	their structure does not already exist.
	"""

	# Create the tables in the basic model
	for table in [ User, AgentGroup, Agent, AgentJobs, AgentMetrics, Lab, 
					Tutorials, Tunables, Observables, TunableToObservable ]:

		# Do nothing if the table is already there
		table.create_table(True)

# -----------------------------------------------------
#  Model Implementation
# -----------------------------------------------------

class User(BaseModel):
	"""
	The user registry
	"""

	#: The name of the user
	username = CharField()
	#: Binding index to external entry
	bindid = CharField(index=True, unique=True)


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

	#: The group where it belongs to
	group = ForeignKeyField(AgentGroup, related_name='groups')
	#: The job currently running on the agent
	activeJob = CharField(default="")

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
			config.append( Tunables.get(name=name) )

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


class Tunables(BaseModel):
	"""
	Description for the tunables as an individual parameter
	"""

	#: The name of variable of the tunable parameter
	name = CharField(max_length=128, index=True, unique=True)
	#: The short (iconic title)
	short = CharField(max_length=50)

	#: Beam type where this tunable is valid
	beam = CharField(max_length=12, default="ee")
	#: Beam energy where this tunable is valid
	energy = CharField(max_length=12, default="91.2")
	#: Simulation process where this tunable is valid
	process = CharField(max_length=12, default="zhad")

	#: The human-readable name of the tunable
	title = CharField(max_length=128)
	#: A short description for this tunable
	shortdesc = TextField(default="")
	#: A long description for this tunable
	longdesc = TextField(default="")
	#: A URL for the long description
	urldesc = CharField(max_length=128, default="")
	#: The UUID of the tutorial
	tutorial = CharField(max_length=64, default="")

	#: The UI component to use for visualizing this variable
	type = CharField(max_length=8, default="slider")
	#: The default value for the tunable
	default = FloatField(default=0.0)
	#: The minimum value for the tunable
	min = FloatField(default=0.0)
	#: The maximum value for the tunable
	max = FloatField(default=1.0)
	#: The number of decimals to show on the value
	dec = IntegerField(default=4)

class Observables(BaseModel):
	"""
	The description of the ovservables
	"""

	#: The name of the histogram (AIDA Path) for this observable
	name = CharField(max_length=128, index=True, unique=True)
	#: The short (iconic title)
	short = CharField(max_length=50)

	#: Beam type where this observable is valid
	beam = CharField(max_length=12, default="ee")
	#: Beam energy where this observable is valid
	energy = CharField(max_length=12, default="91.2")
	#: Simulation process where this observable is valid
	process = CharField(max_length=12, default="zhad")

	#: The human-readable name of the observable
	title = CharField(max_length=128)
	#: A short description for this observable
	shortdesc = TextField(default="")
	#: A long description for this observable
	longdesc = TextField(default="")
	#: A URL for the long description
	urldesc = CharField(max_length=128, default="")
	#: The UUID of the tutorial
	tutorial = CharField(max_length=64, default="")

	#: Image for the far-left side of the histogram
	leftImg = CharField(max_length=128, default="")
	#: Description for the far-left side of the histogram
	leftDesc = TextField(default="")

	#: Image for the far-right side of the histogram
	rightImg = CharField(max_length=128, default="")
	#: Description for the far-right side of the histogram
	rightDesc = TextField(default="")


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

