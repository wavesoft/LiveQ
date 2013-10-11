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

from liveq.internal.job.parameters import JobParameters
from liveq.internal.job.results import JobResults
from liveq.internal.job.app import JobApplication
from liveq.internal.job.logs import JobLogger

class Job:

	"""
	Job constructor
	"""
	def __init__(self,app,cfg):
		self.app = app
		self.config = cfg
		self.instance = None
		self.logger = JobLogger()
		self.results = JobResults()

	"""
	Start the simulation with the given parameter set
	"""
	def start(self):

		# Instantiate the given application configuration
		self.instance = self.app.instance(self.logger, self.results)

		# Set the config
		self.instance.setConfig( self.config.render() )

		# Start the job
		self.instance.start()

	"""
	Abort a running job
	"""
	def stop(self):
		
		# Kill the instance
		self.instance.kill()

	"""
	Callback from the application
	"""
	def update(self, cfg):

		# Update config
		self.config = cfg

		# Commit changes and reload config
		self.instance.setConfig( self.config.render() )
		self.instance.reload()
