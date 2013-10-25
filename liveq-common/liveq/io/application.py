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

import logging
from liveq.events import EventDispatcher

"""
State constants
"""
# Final state constants
STATE_ABORTED 	= 0
STATE_RUNNING 	= 1
STATE_COMPLETED = 2

# Intermediate state constants
STATE_KILLING 	= 10
STATE_STARTING 	= 11

class JobApplication(EventDispatcher):
	"""
	Job template that is overloaded by each job
	"""

	def __init__(self,cfg):
		"""
		Constructor
		"""
		EventDispatcher.__init__(self)
		self.logger = logging.getLogger("application")
		self.logger.debug("Class '%s' instantiated" % self.__class__.__name__)

	def start(self):
		"""
		Launch application binaries
		"""
		raise NotImplementedError("The application class did not implement the start() function")

	def kill(self):
		"""
		Kill all instances
		"""
		raise NotImplementedError("The application class did not implement the kill() function")

	def reload(self):
		"""
		Reload configuration (this might mean restarting the simulation)
		"""
		raise NotImplementedError("The application class did not implement the reload() function")

	def setConfig(self,config):
		"""
		Set/Update configuration files
		"""
		raise NotImplementedError("The application class did not implement the setConfig() function")

