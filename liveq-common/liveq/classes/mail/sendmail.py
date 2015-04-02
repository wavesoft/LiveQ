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

class SendmailClass:

	def __init__(self, config):
		"""
		Initialize coudhDB record
		"""
		self.config = config

	def send( self, recepients, subject, text=None, html=None, macros=None ):
		"""
		Send an e-mail
		"""

		# Open e-mail logger
		logger = logging.getLogger("email.sendmail")

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

		# Log-in to the SMTP server if it's required
		if self.config.SMTP_USERNAME:
			smtp.login( self.config.SMTP_USERNAME, self.config.SMTP_PASSWORD )

		# Repeat this for every recepient
		i = 0
		for to in recepients:
			try:

				# Create message container - the correct MIME type is multipart/alternative.
				msg = MIMEMultipart('alternative')
				msg['Subject'] = subject
				msg['From'] = self.config.FROM
				msg['To'] = to

				# Pick personalization macros
				macroRecord = macros[ i % len(macros) ]
				i += 1

				# Check for TEXT version
				if not text is None:

					# Create TEXT multipart
					part = MIMEText(text % macroRecord, 'plain')
					msg.attach(part)

				# Check for HTML version
				if not html is None:

					# Create HTML multipart
					part = MIMEText(html % macroRecord, 'html')
					msg.attach(part)

				# Popen and pipe to sendmail
				p = Popen([ self.config.SENDMAIL_BIN, "-t", "-oi"], stdin=PIPE)
				p.communicate(msg.as_string())

				# Count successful transmissions
				success += 1

			except Exception as e:

				# Trap exceptions
				traceback.print_exc()
				logging.error("Exception sending an e-mail %s: %s" % ( e.__class__.__name__, str(e) ))

		# Return successful mail sent
		return success		

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

