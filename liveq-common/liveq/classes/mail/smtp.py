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

"""
SendMail Class

This class provides a SendMail interface for sending e-mail.
"""

import traceback
import logging
import smtplib

from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from liveq.config.classes import EmailConfigClass
from liveq.classes.mail import CommonMailClass

class SMTPClass(CommonMailClass):

	def __init__(self, config):
		"""
		Initialize coudhDB record
		"""

		# Initialize common mail class
		CommonMailClass.__init__(self)

		# Keep local reference of te configuration
		self.config = config

		# Local SMTP instance
		self.smtp = None

	def _queue_startDrain(self):
		"""
		We started draining the queue
		"""

		# Get a logger
		logger = logging.getLogger("email.smtp")
		
		# Open a connection to the SMTP server
		logger.debug("Connecting to SMTP Server %s:%i" % (self.config.SMTP, self.config.SMTP_PORT))
		self.smtp = smtplib.SMTP( self.config.SMTP, self.config.SMTP_PORT )

		# Log-in to the SMTP server if it's required
		if self.config.SMTP_USERNAME:
			logger.debug("Starting TLS and logging-in")
			self.smtp.starttls()
			self.smtp.login( self.config.SMTP_USERNAME, self.config.SMTP_PASSWORD )

	def _queue_endDrain(self):
		"""
		We finished draining the queue
		"""

		# Get a logger
		logger = logging.getLogger("email.smtp")

		# Logout from the SMTP server
		logger.debug("Disconnecting from SMTP server")
		self.smtp.quit()
		self.smtp = None

	def _send(self, me, to, subject, textPart=None, htmlPart=None ):
		"""
		Send the specified e-mail
		"""
		
		# Get a logger
		logger = logging.getLogger("email.smtp")

		# Reuire an SMTP instance, so if we haven't
		# got one, acquire one now
		withoutQueue = False
		if not self.smtp:
			# Get an SMTP server and disconnect when done
			self._queue_startDrain()
			withoutQueue = True

		# Create message container - the correct MIME type is multipart/alternative.
		msg = MIMEMultipart('alternative')
		msg['Subject'] = subject
		msg['From'] = me
		msg['To'] = to

		# Check for TEXT version
		if not textPart is None:

			# Create TEXT multipart
			part = MIMEText(textPart, 'plain')
			msg.attach(part)

		# Check for HTML version
		if not htmlPart is None:

			# Create HTML multipart
			part = MIMEText(htmlPart, 'html')
			msg.attach(part)

		# sendmail function takes 3 arguments: sender's address, recipient's address
		# and message to send - here it is sent as one string.
		logger.debug("Sending message via SMTP")
		self.smtp.sendmail(me, to, msg.as_string())

		# Disconnect if logged-in without queue
		if withoutQueue:
			self._queue_endDrain()

class Config(EmailConfigClass):
	"""
	Configuration endpoint
	"""

	def __init__(self,config):
		"""
		Populate the database configuration
		"""

		#: Source e-mail to use for e-mails
		self.FROM = config['from']

		#: SMTP Server for sending e-mails
		self.SMTP = config['smtp_server']

		#: Username for the SMTP server
		self.SMTP_USERNAME = config['smtp_username']

		#: Password for the SMTP server
		self.SMTP_PASSWORD = config['smtp_password']

		#: SMTP Port
		self.SMTP_PORT = int(config['smtp_port'])

	def instance(self, runtimeConfig):
		"""
		Create an SQL instance
		"""
		return SMTPClass( self )

