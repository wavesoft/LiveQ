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
import json

from liveq.events import EventDispatcher
from webserver.config import Config
from webserver.models import User

#: Global user event instances in the stack
USEREVENT_INSTANCES = {}

class UserEvents:

	def __init__(self, user_id):
		"""
		Initialize user events for the given user ID
		"""

		# Keep a reference of the user 
		self.user = user_id

		# Reference counter
		self.ref = 0

		# Listener objects
		self.listeners = []

	def _trigger(self, event):
		"""
		Trigger the event to the listeners
		"""

		# Fire event to all listeners
		handled = False
		for l in self.listeners:
			# Call listener
			l(event)
			# The event is handled
			handled = True

		# Return true if it was handled
		return handled

	def send(self, eventName, eventData={}, important=False):
		"""
		Push the specified event object to the event queue.
		If the event is important it will also be stored on the user's queue.
		"""

		# Build an event
		event = {
			"name": eventName,
			"data": eventData
		}

		# If nobody handled the message and it's important, push it on queue
		if not self._trigger(event) and important:
			# Store event on userevents queue
			Config.STORE.lpush( "userevents", json.dumps({
					'user_id': self.user,
					'event' : event
				}) )

	def removeListener(self, callback):
		"""
		Remove a previously registered listener callback
		"""

		# Lookup listener
		i = self.listeners.index(callback)
		if i < 0:
			return

		# Remove listener
		del self.listeners[i]

	def addListener(self, callback):
		"""
		Register a listener that is going to receive the user events
		"""

		# Add listener		
		self.listeners.append(callback)

	def release(self):
		"""
		Release this user event delegate
		"""

		# Decrement reference counter
		self.ref -= 1

		# Unregister from public instances if counter reached zero
		if self.ref <= 0:
			del USEREVENT_INSTANCES[self.user]

	@staticmethod
	def processQueuedEvents(num=10):
		"""
		Process all the events in the user queue
		"""

		# Pop and handle events from config store
		while True:

			# Pop next event from queue
			event = Config.STORE.rpop( "userevents" )
			if not event:
				# No more events
				break

			# Handle event if it's part of our USEREVENT_INSTANCES
			e = json.loads(event)
			if not ((e['user_id'] in USEREVENT_INSTANCES) and \
				(USEREVENT_INSTANCES[e['user_id']]._trigger( e['event'] ))):

				# Was not handled, put it back in ring-buffer
				Config.STORE.lpush( "userevents", event )

			# Decrement event counter
			num -= 1
			if num <= 0:
				break

	@staticmethod
	def sendTo(user, event, important=False):
		"""
		Send an event to the specified user without fully instantiating
		the class.
		"""

		# Get user instance and send event
		inst = UserEvents.forUser(user)
		inst.send( event, important )

	@staticmethod
	def forUser(user):
		"""
		Create an instance of UserEvents (or get reference to an already
		existing one) for the user with the given database object or user ID
		"""

		# Check if this is a user instance
		if isinstance(user, User):
			user = user.id

		# Check if already exists
		if user in USEREVENT_INSTANCES:
			ue = USEREVENT_INSTANCES[user]
			ue.ref += 1
			return ue

		# Create a new instance if not
		ue = UserEvents(user)
		USEREVENT_INSTANCES[user] = ue

		# Return UserEvents instance
		ue.ref += 1
		return ue
