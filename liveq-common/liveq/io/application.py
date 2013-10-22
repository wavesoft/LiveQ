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
from liveq.internal.events import EventDispatcher

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

"""
Job template that is overloaded by each job
"""
class JobApplication(EventDispatcher):

	"""
	Constructor
	"""
	def __init__(self,cfg):
		EventDispatcher.__init__(self)
		self.logger = logging.getLogger("application")
		self.logger.debug("Class '%s' instantiated" % self.__class__.__name__)

	"""
	Launch application binaries
	"""
	def start(self):
		pass

	"""
	Kill all instances
	"""
	def kill(self):
		pass

	"""
	Reload configuration (this might mean restarting the simulation)
	"""
	def reload(self):
		pass

	"""
	Set/Update configuration files
	"""
	def setConfig(self,config):
		pass
