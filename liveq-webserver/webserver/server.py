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

from tornado.web import URLSpec
from webserver.h.configure import *
from webserver.h.apisocket import APISocketHandler
from webserver.h.index import IndexHandler
from webserver.h.tootr import TootrGetAnimation
from webserver.config import Config

"""
Tornado Application class of the LiveQ Server
"""
class MCPlotsServer(tornado.web.Application):
	def __init__(self):

		# Setup handlers
		handlers = [
			URLSpec(r"%s" % Config.BASE_URL, 					IndexHandler),
			URLSpec(r"%s/" % Config.BASE_URL, 					IndexHandler, 			name="index"),
			URLSpec(r"%s/config" % Config.BASE_URL, 			ConfigHandler, 			name="config"),
			URLSpec(r"%s/config/books" % Config.BASE_URL, 		ConfigBooksHandler, 	name="config.books"),
			URLSpec(r"%s/config/books/edit" % Config.BASE_URL, 	ConfigEditBookHandler, 	name="config.books.edit"),
			URLSpec(r"%s/config/books/del" % Config.BASE_URL, 	ConfigDeleteBookHandler,name="config.books.del"),
			URLSpec(r"%s/apisocket" % Config.BASE_URL,			APISocketHandler, 		name="api"),
			URLSpec(r"%s/tootr/anim" % Config.BASE_URL,			TootrGetAnimation, 		name="tootr.anim"),
		]

		# Get root dir of files
		filesDir = os.path.dirname(os.path.dirname(__file__))

		# Setup tornado settings
		settings = dict(
			cookie_secret="ckjbe3n3809713g7baf13n8vapjtd64xfkjgd",
			template_path=os.path.join(filesDir, "templates"),
			static_path=os.path.join(filesDir, "static"),
			static_url_prefix="%s/static/" % Config.BASE_URL,
			xsrf_cookies=True,
		)

		# Setup tornado application
		tornado.web.Application.__init__(self, handlers, **settings)
