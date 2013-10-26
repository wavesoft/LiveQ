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

import os
import uuid
import atexit

from liveq.events import GlobalEvents

class CoreConfig:
	"""
	Core configuration class provides the system-wide configuration parameters.
	It reads configuration from the [general] section.
	"""

	#: The currently active system-wide log level
	LOG_LEVEL = logging.INFO

	@staticmethod
	def fromConfig(config, runtimeConfig):
		"""
		Update public variables by reading the config
		contents of the specified filename
		"""

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

class StaticConfig:
	"""
	Static configuration
	"""

	#: Unique ID of this node
	UUID = ""

	@staticmethod
	def initialize(staticFile=""):
		"""
		Initialize the static configuration class. Unless the optional parameter ``staticFile=`` is defined,
		the static configuration will be stored on ``<current dir>/liveq.static.conf``.
		"""
		
		# If we don't have an etc folder specified, use the
		# current folder that we are in.
		if not staticFile:
			staticFile = os.getcwd() + "/static.conf.local"

		# Create a config parser
		parser = ConfigParser.RawConfigParser()
		parser.read( staticFile )

		# Check if we have static section
		if not parser.has_section("static"):
			parser.add_section("static")

		# Setup static parameters
		if not parser.has_option("static", "uuid"):
			parser.set("static", "uuid", uuid.uuid4().hex )

		# Read parameters
		# -----------------------
		StaticConfig.UUID = parser.get("static", "uuid")
		# -----------------------

		# Save the parser
		StaticConfig.__staticConfigFile = staticFile
		StaticConfig.__staticConfigParser = parser

		# Register the shutdown handler
		def static_sync():

			# Fetch static parser
			parser = StaticConfig.__staticConfigParser

			# Sync parameters
			# -----------------------
			parser.set("static", "uuid", StaticConfig.UUID )
			# -----------------------

			# Store changes
			with open(StaticConfig.__staticConfigFile, 'wb') as configfile:
				parser.write(configfile)

		# Register exit and shutdown handlers
		atexit.register( static_sync )
		GlobalEvents.System.on('shutdown', static_sync)
