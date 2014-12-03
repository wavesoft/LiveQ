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

"""
CouchDB Cache Class

This class provides a CouchDB interface for read-only, cached data.
"""

import couchdb
from liveq.config.classes import CacheConfigClass

class CouchDBCache:

	def __init__(self, url):
		"""
		Initialize coudhDB record
		"""
		self.couch = couchdb.Server(url)

	def get(self, database, key):
		"""
		Open couchdb database
		"""
		db = self.couch[database]
		return db.get(key)

class Config(CacheConfigClass):
	"""
	Configuration endpoint
	"""

	def __init__(self,config):
		"""
		Populate the database configuration
		"""
		self.CACHE_URL = config['url']

	def instance(self, runtimeConfig):
		"""
		Create an SQL instance
		"""
		return CouchDBCache(self.CACHE_URL)

