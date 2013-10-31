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

from liveq.utils.fsm import StoredFSM

class JobMonitor(StoredFSM):
	"""
	This class controls the job of the given ID
	"""

	#: The database instances
	INSTANCES = { }

	@staticmethod
	def getInstance(jid):
		"""
		Return the JobMonitor instance for the given ID.
		If the ID does not exist, create a new one and store it in the database.
		"""

		# If we have instance, get it from store
		if jid in JobMonitor.INSTANCES:
			return JobMonitor.INSTANCES[jid]

		# We don't have an instance, create a new one
		instance = JobMonitor(jid)
		

	def broadcast():
		"""
		"""
		pass
