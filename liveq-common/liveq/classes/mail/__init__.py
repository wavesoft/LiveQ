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

import Queue
import threading

from liveq.events import GlobalEvents

class CommonMailClass:
	"""
	Common email actions
	"""

	def __init__(self):
		"""
		Initialize egress queue thread
		"""

		# Prepare egress queue
		self.egress = Queue.Queue()
		self.queueThread = threading.Thread(target=self._queue_thread, args=(self.egress,))

		# Start main thread
		self.queueThread.start()
		self.shutdownFlag = False

		# Register on system shutdown
		GlobalEvents.System.on('shutdown', self._shutdown)

	def _shutdown(self):
		"""
		Shutdown the queue thread
		"""

		# Raise shutdown flag
		self.shutdownFlag = True

		# Put junk in the queue so it unblocks 
		self.egress.put( True )

	def _queue_thread(self, queue):
		"""
		Queue thread
		"""

		# Infinite loop
		while True:

			# Wait for event
			email = self.egress.get(True)

			# Quit on shutdown flag
			if self.shutdownFlag:
				break

			# Send the e-mail
			self.send( email[0], email[1], email[2], email[3], email[4] )

	def queue( self, recepients, subject, text=None, html=None, macros=None ):
		"""
		Queue an e-mail transmission
		"""

		# Put the e-mail
		self.egress.put( [recepients, subject, text, html, macros] )

	def send( self, recepients, subject, text=None, html=None, macros=None ):
		"""
		Abstract function for sending emails
		"""
		pass

