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

import redis
from liveq.config.classes import StoreConfigClass

"""
REDIS Store Class

This class provides a REDIS implementation to the key-value store.
"""

class Config(StoreConfigClass):
	"""
	Configuration endpoint
	"""

	def __init__(self,config):
		"""
		Populate the database configuration
		"""
		self.HOST = config['server']
		self.PORT = int(config['port'])
		self.DATABASE = config['db']

	def instance(self, runtimeConfig):
		"""
		Create an SQL instance
		"""
		return redis.StrictRedis(host=self.HOST, port=self.PORT, db=self.DATABASE)

