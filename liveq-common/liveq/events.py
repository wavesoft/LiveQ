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
import signal
import sys

class EventDispatcher:

	"""
	Initialize event dispatcher variables
	"""
	def __init__(self):
		self.__eventHandlers = {}

	"""
	Add an event listener object in the listeners
	"""
	def on(self,event,handler,**kwargs):

		# Allocate event groups
		if not event in self.__eventHandlers:
			self.__eventHandlers[event] = []

		# Append entry
		self.__eventHandlers[event].append( [handler,kwargs] )

	"""
	Remove an event listener object from the listeners
	"""
	def off(self,event,handler):

		# Check for event names
		if not event in self.__eventHandlers:
			return

		# Remove handler
		try:

			# Iterate over the handlers
			i = 0
			for k in self.__eventHandlers[event]:

				# Check if the handler callback is the same
				if k[0] == handler:
					del self.__eventHandlers[event][i]
					break

				# Increment index
				i += 1

		except ValueError:
			pass

	"""
	Dispatch an event to the appropriate listeners
	"""
	def trigger(self,event,*args):
		logging.debug("Dispatching event '%s' %s" % (event, args))

		# Check for event names
		if not event in self.__eventHandlers:
			return

		# Dispatch
		for handler in self.__eventHandlers[event]:
			try:
				handler[0](*args, **handler[1])
			except Exception as e:
				logging.error("Exception while dispatching event %s to handler %s: %s" % (event, str(handler), str(e)))

"""
Static class container for global events
"""
class GlobalEvents:

	"""
	Create a system-wide event queue

	In principle any event might appear here, but here is a short list
	of the most common events:

	- shutdown : Raised usually by user's input in order to safely shutdown the daemon

	"""
	System = EventDispatcher()
