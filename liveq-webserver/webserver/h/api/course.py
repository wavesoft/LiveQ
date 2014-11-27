
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

import time
import datetime

from liveq.io.bus import Bus

from webserver.h.api import APIInterface
from webserver.config import Config
from tornado.ioloop import IOLoop

class CourseInterface(APIInterface):

	def __init__(self, socket):
		"""
		Initialize the CHAT API interface
		"""
		APIInterface.__init__(self, socket, "course")

		# Sync timer placeholder
		self.syncTimer = None

	def close(self):
		"""
		Cleanup logic when the channel is closed
		"""
		pass

	def ready(self):
		"""
		When socket is ready, get the user reference
		"""

		# Keep a local reference of the user
		self.user = self.socket.user


	def handleAction(self, action, param):
		"""
		Handle chat actions
		"""
		
		# Enter a particular courseroom
		if action == "enter":

			# Schedule a course in 5 minutes
			delta = self.scheduleSync(2)

			# Return course information
			self.sendAction("info", {
					'time': delta
				})

		# Leave the courseroom
		elif action == "leave":
			pass

	####################################################################################
	# --------------------------------------------------------------------------------
	#                                 CHATROOM CALLBACKS
	# --------------------------------------------------------------------------------
	####################################################################################

	def onCoursePing(self):
		"""
		Send courseroom sync
		"""

		# Send courseroom synchronization
		self.sendAction("sync", {})


	####################################################################################
	# --------------------------------------------------------------------------------
	#                                 HELPER FUNCTIONS
	# --------------------------------------------------------------------------------
	####################################################################################
	
	def scheduleSync( self, freq_min ):
		"""
		Schedule a sync callback when the interval hits the particular minute slot.
		This function returns the time in seconds until the given time
		"""

		# Calculate how much time it takes until the next scheduled slot
		freq_sec = freq_min * 60
		delta = freq_sec - time.time() % freq_sec

		# Remove the timeout timer
		if self.syncTimer:
			IOLoop.instance().remove_timeout(self.syncTimer)

		# Schedule a sync
		self.syncTimer = IOLoop.instance().add_timeout(datetime.timedelta(0,delta), self.onCoursePing)

		# Return the time delta until the next course slot
		return delta

