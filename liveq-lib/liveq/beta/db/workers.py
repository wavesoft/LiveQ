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

import uuid
import cPickle as pickle
from cStringIO import StringIO

from liveq.beta.db.core.redis import RedisClient

class Agent:
	
	def __init__(self, uuid=None):
		self.uuid = uuid.uuid4().hex
		self.lastSeen = 0
		self.features = { }
		self.group = None
		self.slots = 0
		self.jobs = None1

class WorkersDB(RedisClient):
	
	"""
	Return an agent entry from the REDIS database
	"""
	def getAgent(self, key):

		# Get pickled agent from store
		packed_data = self.get(key)
		if not packed_data:
			return None

		#
 
		dst = StringIO(datastream)
		up = pickle.Unpickler(dst)
