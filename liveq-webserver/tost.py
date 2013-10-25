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

# ----------
import sys
sys.path.append("../liveq-common")
# ----------

import logging
import time
import signal
import sys

from webserver.config import Config
from webserver.server import MCPlotsServer

from liveq import handleSIGINT
from liveq.exceptions import ConfigException

# Prepare runtime configuration
runtimeConfig = { }

# Load configuration
try:
	Config.fromFile( "config/webserver.conf.local", runtimeConfig )
except ConfigException as e:
	print("ERROR   Configuration exception: %s" % e)
	sys.exit(1)

# Handle SigINT
handleSIGINT()

# Open a channel on RabbitMQ
c = Config.IBUS.openChannel("data")

c.send("hello", {"msg": "I am asking you, how are you?"})

while True:
	time.sleep(1)