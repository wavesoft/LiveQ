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

# ----------
import sys
sys.path.append("../liveq-common")
# ----------

import threading
import logging
import time
import signal
import sys

from dashboard.config import Config
from dashboard.server import DashboardServer

import tornado.options
import tornado.ioloop
from tornado.options import define, options

from liveq import handleSIGINT
from liveq.exceptions import ConfigException

# Prepare runtime configuration
runtimeConfig = { }

# Load configuration
try:
	Config.fromFile( "config/dashboard.conf.local", runtimeConfig )
except ConfigException as e:
	print("ERROR   Configuration exception: %s" % e)
	sys.exit(1)

# Hook CTRL+C
handleSIGINT()

# Setup port defaults
define("port", default=Config.SERVER_PORT, help="Port to listen for incoming connections", type=int)

def main():

	# Parse cmdline and start Tornado Server
	tornado.options.parse_command_line()
	app = DashboardServer()
	app.listen(options.port)
	tornado.ioloop.IOLoop.instance().start()

t = threading.Thread(target=main)
t.start()

while True:
	time.sleep(1)
