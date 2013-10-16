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
An exception occured while in the configuration
"""
class ConfigException(Exception):
	def __init__(self, value):
		self.value = value
	def __str__(self):
		return repr(self.value)

"""
An internal integrity check exception
"""
class IntegrityException(Exception):
	def __init__(self, value):
		self.value = value
	def __str__(self):
		return repr(self.value)

"""
Base class of job exceptions
"""
class JobException(Exception):
	def __init__(self, value):
		self.value = value
	def __str__(self):
		return repr(self.value)

"""
An exception occured when preparing to run a job
"""
class JobConfigException(JobException):
	def __init__(self, value):
		self.value = value
	def __str__(self):
		return repr(self.value)

"""
An exception occured when running the job
"""
class JobRuntimeException(JobException):
	def __init__(self, value):
		self.value = value
	def __str__(self):
		return repr(self.value)

"""
An internal exception occured while running a job
"""
class JobInternalException(JobException, IntegrityException):
	def __init__(self, value):
		self.value = value
	def __str__(self):
		return repr(self.value)

