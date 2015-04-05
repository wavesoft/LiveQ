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
import logging
import traceback

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

		# Open e-mail logger
		logger = logging.getLogger("email.queue")

		# Draining queue flag
		drainingQueue = False

		# Infinite loop
		while True:

			# Notify for completed queue drain
			if drainingQueue and self.egress.empty():
				drainingQueue = False
				logger.debug("Queue drained")
				self._queue_endDrain()

			# Wait for event
			email = self.egress.get(True)

			# Quit on shutdown flag
			if self.shutdownFlag:
				break

			# Notify for imminent queue drain
			if not drainingQueue:
				drainingQueue = True
				logger.debug("Draining queue")
				self._queue_startDrain()

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

		# Open e-mail logger
		logger = logging.getLogger("email.common")

		# Successful mail sent
		success = 0

		# Make sure recepients is an array
		if type(recepients) is str:
			recepients = [recepients]

		# Prepare macros
		if not macros is None:
			# Make sure macros is an array
			if not type(macros) is list:
				macros = [ macros ]

		# Start bulk send
		self._send_startBulk()

		# Repeat this for every recepient
		i = 0
		for to in recepients:
			try:

				# Setup personalization macro record
				macroRecord = {}
				if not macros is None:
					macroRecord = macros[ i % len(macros) ]
				i += 1

				# Prepare fields
				tFrom = self.config.FROM
				tTo = to

				# Prepare subject
				tSubject = subject % macroRecord

				# Check for TEXT version
				tText = None
				if not text is None:
					# Create TEXT multipart
					tText = text % macroRecord

				# Check for HTML version
				tHTML = None
				if not html is None:
					# Create HTML multipart
					tHTML = html % macroRecord

				# Popen and pipe to sendmail
				logger.info("Sending e-mail to '%s' with subject '%s'" % (to, subject))

				# Send mail
				self._send( tFrom, tTo, tSubject, tText, tHTML )

				# Count successful transmissions
				success += 1

			except Exception as e:

				# Trap exceptions
				traceback.print_exc()
				logger.error("Exception sending an e-mail %s: %s" % ( e.__class__.__name__, str(e) ))

		# Complete bulk send
		self._send_endBulk()

		# Return successful mail sent
		return success

	def _queue_startDrain(self):
		"""
		We started draining the queue
		"""
		pass

	def _queue_endDrain(self):
		"""
		We finished draining the queue
		"""
		pass

	def _send_startBulk(self):
		"""
		We started sending (possibly bulky) email
		"""
		pass

	def _send_endBulk(self):
		"""
		We finished sending (possibly bulky) email
		"""
		pass

	def _send(self, me, to, subject, textPart=None, htmlPart=None ):
		"""
		Send the specified e-mail
		"""
		pass
