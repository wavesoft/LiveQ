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

class Scheduler:
	"""
	Scheduler for functions
	(Just like stack, but does not pollute the stack - Used for
	very lightweight FSM implementations)
	"""
		
	def __init__(self):
		"""
		Initialize scheduler
		"""
		self.stack = Queue.LifoQueue()

	def schedule(self, function, *args, **kwargs):
		"""
		Schedule a function for execution
		"""

		# Put new entry on stack
		newRun = self.stack.empty()
		self.stack.put([function, args, kwargs])
		
		# Start frame execution if that's the first frame on stack
		if newRun:
			self.__startFrameLoop()

	def __startFrameLoop(self):
		"""
		Run next frame
		"""

		# Run frame loop
		while not self.stack.empty():

			# Fetch next frame
			frame = self.stack.get()
			# Execute it
			frame[0](*frame[1], **frame[2])


class Component(Scheduler):
	"""
	Core component is the base class for creating
	LiveQ applications.
	"""

	def __init__(self):
		"""
		Setup the core component
		"""
		Scheduler.__init__(self)
		self.running = True
		GlobalEvents.System.on('shutdown', self.onShutdown)

	def onShutdown(self):
		"""
		Handler for the system-wide shutdown function
		that forces main loop to exit
		"""
		logging.debug("Shutting down component %s" % self.__class__.__name__)
		self.running = False

		# Empty scheduler queue
		self.stack = Queue.LifoQueue()

	def schedule(self, function, *args, **kwargs):
		"""
		Override scheduler to prohibit adding new frames
		if we are not running any more
		"""

		# Allow function scheduling only on system shutdown
		if self.running:
			Scheduler.schedule(self, function, *args, **kwargs)
		else:
			logging.warn("Attemp to schedule function call on system shutdown")

	def step(self):
		"""
		Main loop of the component
		"""

		# Unless implemented, just wait for 1 sec
		time.sleep(1)

	def run(self):
		"""
		Main function that unless overriden it waits for shutdown signal
		"""

		# Run main loop as long as we are running
		while self.running:
			self.step()

	@classmethod
	def runThreaded(cls):
		"""
		Class method to run the component in a different thread
		that will allow signals to reach main thread.

		(This is a hack to allow threads to use Event() objects while
		still allowing signals to reach main thread.)
		"""

		# Define a main thread function
		def thread_main():
			cls().run()

		# Start and wait for thread to exit
		# (join also blocks signals)
		thread = threading.Thread(target=thread_main)
		thread.start()

		# Wait
		while thread.is_alive():
			time.sleep(1)

