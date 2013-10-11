#!/usr/bin/python
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

import sys
import logging
from liveq.config import Config
from liveq.internal.exceptions import *

# Setup logging
logging.basicConfig(level=logging.DEBUG, format='%(levelname)-8s %(message)s')

# Load configuration
try:
	Config.readFile( "config/liveq.conf" )
except ConfigException as e:
	print("[ERROR] Error parsing configuration: %s" % e)

# Tests
print Config.ADAPTER.SERVER

adapter = Config.ADAPTER.instance({})
adapter.connect()
adapter.process(block=True)
