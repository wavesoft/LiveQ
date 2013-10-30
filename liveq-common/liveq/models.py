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
	for table in [ User, AgentGroup, AgentMetrics, Agent, Lab, LabInstance, Job ]:

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


class Agent(BaseModel):
	"""
	Agent instance class
	"""

	#: Add an additional UUID lookup index
	uuid = CharField(max_length=128, index=True, unique=True)

	#: When was the agent last seen active?
	lastSeen = DateTimeField(default=datetime.datetime.now)
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


class AgentGroup(BaseModel):
	"""
	Agent groups class
	"""

	#: Add an additional UUID lookup index
	uuid = CharField(max_length=128, index=True, unique=True)


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

	#: The SVN Revision of the base tools
	revision = IntegerField()


class LabInstance(BaseModel):
	"""
	Lab instance description
	"""

	#: The related lab
	lab = ForeignKeyField(Lab)
	#: The user instantiated the lab
	user = ForeignKeyField(User)

class Job(BaseModel):
	"""
	Jobs state table
	"""

	#: The related agent
	agent = ForeignKeyField(Agent)
	#: The related lab instance
	labinstance = ForeignKeyField(LabInstance)
	

