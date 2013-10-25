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


class Component:
	"""
	Core component is the base class for creating
	LiveQ applications.
	"""

	def __init__(self):
		"""
		Setup the core component
		"""
		self.running = True
		GlobalEvents.System.on('shutdown', self.onShutdown)

	def onShutdown(self):
		"""
		Handler for the system-wide shutdown function
		that forces main loop to exit
		"""
		logging.debug("Shutting down component %s" % self.__class__.__name__)
		self.running = False

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

