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

class RedisClient:
	
	"""
	Establish a connection to redis
	"""
	def __init__(self, host, port, db):
		self.db = redis.StrictRedis(host=host, port=port, db=db)

	"""
	Return a redis value
	"""
	def get(self, key):
		return self.db.get(key)

	"""
	Set a redis key value
	"""
	def set(self, key, value):
		return self.db.set(key, value)
