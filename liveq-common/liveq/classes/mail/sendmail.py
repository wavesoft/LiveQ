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

from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from subprocess import Popen, PIPE

from liveq.config.classes import EmailConfigClass
from liveq.classes.mail import CommonMailClass

class SendmailClass(CommonMailClass):

	def __init__(self, config):
		"""
		Initialize coudhDB record
		"""

		# Initialize common mail class
		CommonMailClass.__init__(self)

		# Keep local reference of te configuration
		self.config = config

	def _send(self, me, to, subject, textPart=None, htmlPart=None ):
		"""
		Send the specified e-mail
		"""
		
		# Get a logger
		logger = logging.getLogger("email.sendmail")

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

		# Popen and pipe to sendmail
		logger.debug("Invoking sendmail binary %s" % self.config.SENDMAIL_BIN)
		p = Popen([ self.config.SENDMAIL_BIN, "-t", "-oi"], stdin=PIPE)
		p.communicate(msg.as_string())

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

		#: Sendmail binary
		self.SENDMAIL_BIN = config['sendmail']

	def instance(self, runtimeConfig):
		"""
		Create an SQL instance
		"""
		return SendmailClass( self )

