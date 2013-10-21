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

import ConfigParser
import logging

"""
Core configuration class
Each agent overrides this one in order to create it's own
"""
class CoreConfig:

	LOG_LEVEL = logging.INFO

	"""
	Update public variables by reading the config
	contents of the specified filename
	"""
	@staticmethod
	def fromConfig(config):

		# Setup logging level mapping
		level_map = {

			# String mapping
			"debug": logging.DEBUG,
			"info": logging.INFO,
			"warn": logging.WARNING,
			"warning": logging.WARNING,
			"error": logging.ERROR,
			"critical": logging.CRITICAL,
			"fatal": logging.FATAL,

			# Numeric mapping
			"5": logging.DEBUG,
			"4": logging.INFO,
			"3": logging.WARNING,
			"2": logging.ERROR,
			"1": logging.CRITICAL,
			"0": logging.FATAL,
		}
		CoreConfig.LOG_LEVEL = level_map[ config.get("general", "loglevel") ]

		# Initialize config
		logging.basicConfig(level=CoreConfig.LOG_LEVEL, format='%(levelname)-8s %(message)s')
