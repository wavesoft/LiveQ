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

from peewee import *
from liveq.config.database import DatabaseConfig

# -----------------------------------------------------
#  Base class for the models
# -----------------------------------------------------

"""
Base Model

Base model class for all of the LiveQ Models. It automatically
binds the model with the configured database.
"""
class BaseModel(Model):
    class Meta:
        database = DatabaseConfig.DB

# -----------------------------------------------------
#  Model Implementation
# -----------------------------------------------------

"""
The user registry
"""
class User(BaseModel):

	# The name of the user
	username = CharField()
	# Binding index to external entry
	bindid = CharField(index=True, unique=True)


"""
Agent groups class
"""
class AgentGroup(BaseModel):

	# The user where this group belongs to
	owner = ForeignKeyField( User )

"""
Agent metrics
"""
class AgentMetrics(BaseModel):

	# Add an additional UUID lookup index
	uuid = CharField(max_length=32, index=True, unique=True)

	# Ammount of CPU time spent
	cputime = IntegerField()
	# Number of jobs sent to this agent
	jobs_sent = IntegerField()
	# Number of jobs succeeded in this agent
	jobs_succeed = IntegerField()
	# Number of jobs failed in this agent
	jobs_failed = IntegerField()


"""
Agent instance class
"""
class Agent(BaseModel):

	# Add an additional UUID lookup index
	uuid = CharField(max_length=32, index=True, unique=True)

	# When was the agent last seen active?
	lastSeen = DateTimeField()
	# The feature string responded by the entity at discovery
	features = CharField()
	# The version of the remote agent
	version = IntegerField()
	# The group where it belongs to
	group = ForeignKeyField(AgentGroup, related_name='groups')

	# Metrics are stored on another table for performance
	metrics = ForeignKeyField(AgentMetrics)


"""
Lab instance description
"""
class Lab(BaseModel):

	# Add an additional UUID lookup index that allows
	# annonymization of the Lab IDs
	uuid = CharField(max_length=32, index=True, unique=True)

	# The SVN Revision of the base tools
	revision = IntegerField()
