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
import tornado.ioloop
import os.path
import uuid
import signal

from tornado.web import URLSpec
from webserver.h.configure import *
from webserver.h.apisocket import APISocketHandler
from webserver.h.index import IndexHandler
from webserver.h.tootr import TootrGetAnimation
from webserver.config import Config

from webserver.common.books import BookKeywordCache
from webserver.common.userevents import UserEvents

from liveq.io.eventbroadcast import EventBroadcast
from liveq.events import GlobalEvents

class VirtualAtomSmasherServer(tornado.web.Application):
	"""
	Tornado Application class of the LiveQ Server
	"""

	#: Universal notifications channel
	NOTIFICATIONS_CHANNEL = None

	def __init__(self):
		"""
		Initialize the virtual atom smasher server
		"""

		##########################################
		# Tornado Configuration
		##########################################

		# Setup handlers
		handlers = [
			URLSpec(r"%s" % Config.BASE_URL, 					IndexHandler),
			URLSpec(r"%s/" % Config.BASE_URL, 					IndexHandler, 				name="index"),
			URLSpec(r"%s/config" % Config.BASE_URL, 			ConfigHandler, 				name="config"),
			URLSpec(r"%s/config/books" % Config.BASE_URL, 		ConfigBooksHandler, 		name="config.books"),
			URLSpec(r"%s/config/books/edit" % Config.BASE_URL, 	ConfigEditBookHandler, 		name="config.books.edit"),
			URLSpec(r"%s/config/books/del" % Config.BASE_URL, 	ConfigDeleteBookHandler,	name="config.books.del"),
			URLSpec(r"%s/config/tun" % Config.BASE_URL, 		ConfigTunablesHandler, 		name="config.tunables"),
			URLSpec(r"%s/config/tun/edit" % Config.BASE_URL, 	ConfigEditTunableHandler, 	name="config.tunables.edit"),
			URLSpec(r"%s/config/tun/del" % Config.BASE_URL, 	ConfigDeleteTunableHandler,	name="config.tunables.del"),
			URLSpec(r"%s/apisocket" % Config.BASE_URL,			APISocketHandler, 			name="api"),
			URLSpec(r"%s/tootr/anim" % Config.BASE_URL,			TootrGetAnimation, 			name="tootr.anim"),
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

		##########################################
		# VAS Configuration
		##########################################

		# Register a cron job for processing periodical events
		self.cronTimer = tornado.ioloop.PeriodicCallback( self.cronJobs, 1000 )
		self.cronTimer.start()

		# Open a notifications channel
		VirtualAtomSmasherServer.NOTIFICATIONS_CHANNEL = EventBroadcast.forChannel("notifications")

		# Listen for global notifications of interest
		VirtualAtomSmasherServer.NOTIFICATIONS_CHANNEL.on('job.completed', self.onNotification_JobCompleted)

		# Populate initial keyword cache
		BookKeywordCache.update()

		# Handle SIGUSR1
		GlobalEvents.System.on("signal.usr1", self.sigUSR1Handler)


	def sigUSR1Handler(self):
		"""
		When SIGUSR1 is received, alert all users for an imminent reboot
		"""

		# Fire notification to all sessions
		for sess in APISocketHandler.SESSIONS:
			sess.sendNotification("The server is going to be restarted in 30 seconds and you will be disconnected. Refresh to join again.", "error", "Server Message")

	def cronJobs(self):
		"""
		Process queued event for the active users
		"""

		# Processed queued user events
		UserEvents.processQueuedEvents()

	def onNotification_JobCompleted(self, data):
		"""
		Handle notification message
		"""

		# Handle errors
		if not 'jid' in data:
			return

		# # Send notification if matching
		# job = session.user.getJob(data['jid'])
		# if job:

		# 	# Send user event
		# 	self.user.userEvents.send({
		# 		"type"   : "info",
		# 		"title"  : "Validation",
		# 		"message": "Your validation job #%i is completed!" % job.id
		# 		}, important=True)

		pass

