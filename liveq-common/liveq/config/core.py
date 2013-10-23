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
	def fromConfig(config, runtimeConfig):

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


"""
Static configuration
"""
class StaticConfig:

	# Unique ID of this node
	UUID = ""

	@staticmethod
	def initialize(staticFile=""):
		
		# If we don't have an etc folder specified, use the
		# current folder that we are in.
		if not staticFile:
			staticFile = os.getcwd() + "/liveq.static.conf"

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

		atexit.register( static_sync )
