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

class ConfigException(Exception):
	"""
	An exception occured while in the configuration
	"""
	def __init__(self, value):
		self.value = value
	def __str__(self):
		return repr(self.value)

class IntegrityException(Exception):
	"""
	An internal integrity check exception
	"""
	def __init__(self, value):
		self.value = value
	def __str__(self):
		return repr(self.value)

class JobException(Exception):
	"""
	Base class of job exceptions
	"""
	def __init__(self, value):
		self.value = value
	def __str__(self):
		return repr(self.value)

class JobConfigException(JobException):
	"""
	An exception occured when preparing to run a job
	"""
	def __init__(self, value):
		self.value = value
	def __str__(self):
		return repr(self.value)

class JobRuntimeException(JobException):
	"""
	An exception occured when running the job
	"""
	def __init__(self, value):
		self.value = value
	def __str__(self):
		return repr(self.value)

class JobInternalException(JobException, IntegrityException):
	"""
	An internal exception occured while running a job
	"""
	def __init__(self, value):
		self.value = value
	def __str__(self):
		return repr(self.value)

