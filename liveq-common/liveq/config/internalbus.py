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

from liveq.exceptions import ConfigException
from liveq.config import configexceptions
from liveq.config.classes import BusConfigClass

"""
Internal Bus Configration

An internal bus is a transport class that exchanges messages between the
code LiveQ Components. 
"""
class InternalBusConfig:

	# Key-Value store instance and confguration
	IBUS_CLASS = ""
	IBUS_CONFIG = None
	IBUS = None

	"""
	Update class variables by reading the config file
	contents of the specified filename
	"""
	@staticmethod
	@configexceptions(section="internal-bus")
	def fromConfig(config):

		# Populate classes
		InternalBusConfig.IBUS_CLASS = config.get("internal-bus", "class")
		InternalBusConfig.IBUS_CONFIG = BusConfigClass.fromClass( InternalBusConfig.IBUS_CLASS, config._sections["internal-bus"] )
		InternalBusConfig.IBUS = InternalBusConfig.IBUS_CONFIG.instance()