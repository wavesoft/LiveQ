#!/bin/env python
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
import os
import sys
sys.path.append("%s/liveq-common" % os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
# ----------

import threading
import logging
import time
import signal
import sys

from webserver.config import Config
from webserver.server import MCPlotsServer

import tornado.options
import tornado.ioloop
import tornado.httpserver
from tornado.options import define, options

from liveq import handleSIGINT, exit
from liveq.exceptions import ConfigException

# Prepare runtime configuration
runtimeConfig = { }

# Load configuration
try:
	Config.fromFile( "config/webserver.conf.local", runtimeConfig )
except ConfigException as e:
	print("ERROR   Configuration exception: %s" % e)
	exit(1)

# Hook CTRL+C
handleSIGINT()

# Setup port defaults
define("port", default=Config.SERVER_PORT, help="Port to listen for incoming connections", type=int)
define("ssl_port", default=Config.SSL_PORT, help="The SSL Port to use (if equal to 'port', HTTP will be disabled)", type=int)
define("ssl_certificate", default=Config.SSL_CERTIFICATE, help="The host certificate for the server", type=str)
define("ssl_key", default=Config.SSL_KEY, help="The host certificate key for the server", type=str)
define("ssl_ca", default=Config.SSL_CA, help="The CA certificate", type=str)
define("ssl", default=Config.SSL, help="Set to 1 to enable SSL", type=bool)

def main():

	# Parse cmdline and start Tornado Server
	tornado.options.parse_command_line()
	app = MCPlotsServer()

	# Start an additional HTTP server
	if options.port != options.ssl_port:
		http_server = tornado.httpserver.HTTPServer(app)
		logging.info("Starting HTTP server on port %s" % options.port)
		http_server.listen(options.port)

	# Setup the SSL Server if requested to do so
	if options.ssl and options.ssl_port:
		https_server = tornado.httpserver.HTTPServer(app, ssl_options={
			"certfile": options.ssl_certificate,
			"keyfile": options.ssl_key,
			"ca_certs": options.ssl_ca
		})
		logging.info("Starting HTTPS server on port %s" % options.ssl_port)
		https_server.listen(options.ssl_port)

	# Start the main loop
	tornado.ioloop.IOLoop.instance().start()

# Prepare thread for the webserver
t = threading.Thread(target=main)
t.start()

# Main idle loop
while True:

	# If thread has died, exit
	if not t.is_alive():
		exit(0)
		break

	# Idle loop
	time.sleep(0.25)
