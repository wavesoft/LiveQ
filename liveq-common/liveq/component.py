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

import threading
import time
import Queue
import logging

from liveq.events import GlobalEvents

"""
Scheduler for functions
(Just like stack, but does not pollute the stack)
"""
class Scheduler:
		
	"""
	Initialize scheduler
	"""
	def __init__(self):
		self.stack = Queue.LifoQueue()

	"""
	Schedule a function for execution
	"""
	def schedule(self, function, *args, **kwargs):

		# Put new entry on stack
		newRun = self.stack.empty()
		self.stack.put([function, args, kwargs])
		
		# Start frame execution if that's the first frame on stack
		if newRun:
			self.__startFrameLoop()

	"""
	Run next frame
	"""
	def __startFrameLoop(self):

		# Run frame loop
		while not self.stack.empty():

			# Call next function
			frame = self.stack.get()

			# Safely
			try:
				frame[0](*frame[1], **frame[2])
			except Exception as e:
				logging.error("Exception while handing scheduled function %s: %s" % (str(frame[0]), str(e)))


"""
Core component is the base class for creating
LiveQ applications.
"""
class Component(Scheduler):

	"""
	Setup the core component
	"""
	def __init__(self):
		Scheduler.__init__(self)
		self.running = True
		GlobalEvents.System.on('shutdown', self.onShutdown)

	"""
	Handler for the system-wide shutdown function
	that forces main loop to exit
	"""
	def onShutdown(self, message):
		self.running = False

	"""
	Main loop of the component
	"""
	def step(self):

		# Unless implemented, just wait for 1 sec
		time.sleep(1)

	"""
	Main function that unless overriden it waits for shutdown signal
	"""
	def run(self):

		# Run main loop as long as we are running
		while self.running:
			self.step()

