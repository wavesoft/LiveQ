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
	This class provides the core functionality of registering event handlers
	and firing events. It is very similar to jQuery's event system.

	To fire an event you can use the :func:`trigger` function. To register an event
	handler use the :func:`on` function and to unregister it use the :func:`off` function.
	"""

	def __init__(self):
		"""
		Initialize event dispatcher variables
		"""
		self.__eventHandlers = {}
		self.safeEvents = True

	def on(self,event,handler,**kwargs):
		"""
		Add an event listener object in the listeners
		"""

		# Allocate event groups
		if not event in self.__eventHandlers:
			self.__eventHandlers[event] = []

		# Append entry
		self.__eventHandlers[event].append( [handler,kwargs] )

	def off(self,event,handler):
		"""
		Remove an event listener object from the listeners
		"""

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

	def trigger(self,event,*args):
		"""
		Dispatch an event to the appropriate listeners
		"""
		logging.debug("Dispatching event '%s' %s" % (event, args))

		# Check for event names
		if not event in self.__eventHandlers:
			return

		# Dispatch
		for handler in self.__eventHandlers[event]:

			# If told so, run the code with exception handlers
			try:
				handler[0](*args, **handler[1])
			except Exception as e:
				logging.error("Exception while dispatching event %s to handler %s: %s" % (event, str(handler), str(e)))

				# Re-throw exception if we are running unsafe
				if not self.safeEvents:
					raise e


class GlobalEvents:
	"""
	Static class container for global events
	"""

	System = EventDispatcher()
	"""
	A system-wide event queue

	In principle any event might appear here, but here is a short list
	of the most common events:

	* ``shutdown`` : Raised usually by user's input in order to safely shutdown the daemon

	"""
