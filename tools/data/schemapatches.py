#!/usr/bin/env python
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
from playhouse.migrate import *

class SchemaPatches:

	def patch_1(self, migrator):
		"""
		Adding the 'playTime' field in the User model
		"""

		# Insert the 'playTime' field in the user table
		migrate(
		    migrator.add_column('user', 'playTime', IntegerField(default=0)),
		)

	def patch_2(self, migrator):
		"""
		Adding the 'valueIndex' field in the User model
		"""

		# Insert the 'valueIndex' field in the user table
		migrate(
		    migrator.add_column('jobqueue', 'valueIndex', CharField(max_length=256, index=True, unique=False, default="")),
		)

		# Update all current fields
		from liveq.models import JobQueue
		for record in JobQueue.select():

			# Define value index
			record.valueIndex = JobQueue.getValueIndex( record.getTunableValues() )
			record.save()

