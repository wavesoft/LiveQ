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

import logging
import threading
import tornado.escape
import tornado.web
import tornado.websocket
import os.path
import uuid

from webserver.dashboardsocket import DashboardSocket
from webserver.config import Config

"""
Tornado Application class of the LiveQ Server
"""
class DashboardServer(tornado.web.Application):
	def __init__(self):

		# Setup handlers
		handlers = [
			(r"/dashboard/?", MainHandler),
			(r"/dashboard/socket/(.*)", DashboardSocket),
		]

		# Get root dir of files
		filesDir = os.path.dirname(os.path.dirname(__file__))

		# Setup tornado settings
		settings = dict(
			cookie_secret="zvn429jvANancjcaffeg4saacn40129def",
			template_path=os.path.join(filesDir, "templates"),
			static_path=os.path.join(filesDir, "static"),
			static_url_prefix="/dashboard/static/",
			xsrf_cookies=True,
		)

		# Setup tornado application
		tornado.web.Application.__init__(self, handlers, **settings)

"""
Root page handler
"""
class MainHandler(tornado.web.RequestHandler):
	def get(self):
		self.render("index.html")

