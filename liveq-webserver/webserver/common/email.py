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

import os
from liveq.config.email import EmailConfig
from webserver.config import WebserverConfig

class EMailTemplate:
	"""
	E-mail template cache entry
	"""

	def __init__(self, tplBuffer):
		"""
		Load the e-mail template from the specified buffer
		"""

		# Parser helpers
		firstLine = True

		# Prepare destinations
		self.subject = ""
		self.text = ""
		self.html = ""

		# Parse buffer into the sections
		target = 0
		for line in tplBuffer.split("\n"):
			line = line.strip()

			# Skip empty first lines
			if not line and firstLine:
				continue
			firstLine = False

			# Split according to section
			if line == "===SUBJECT===":
				target = 1
			elif line == "===TEXT===":
				target = 2
			elif line == "===HTML===":
				target = 3

			# Read section
			elif target == 1:

				# Subject (no newlines and no empty lines).
				if not line:
					continue
				self.subject += line

			elif target == 2:
				# Text version of mail
				self.text += line + "\n"
			elif target == 3:
				# HTML Version of mail
				self.html += line + "\n"

		# Switch missing parts to none
		if not self.text:
			self.text = None
		if not self.html:
			self.html = None

class EMail:
	"""
	E-mail template loader class
	"""

	#: E-mail template cache
	CACHE = { }

	@staticmethod
	def loadTemplate(template):
		"""
		Load the specified e-mail template
		"""

		# Check for cache
		if template in EMail.cache:
			return EMail.cache[ template ]

		# Ensure it exists
		fileName = "%s/%s.tpl" % ( WebserverConfig.EMAIL_PATH, template )
		if not os.path.exists(fileName):
			raise IOError("Cannot find e-mail template file %s" % fileName)

		# Load template and place on cache
		with open(fileName, 'r') as f:

			# Read and create template wrapper
			tpl = EMailTemplate(f.read())

			# Cache and return template
			EMail.cache[ template ] = tpl
			return tpl

	@staticmethod
	def queue(recepients, template, macros=None):
		"""
		Schedule an e-mail sent to be sent to the specified list of 
		recepients, using the specified macros
		"""

		# Ensure e-mail configuration
		if not EmailConfig.EMAIL:
			raise IOError("E-Mail queue not configured")

		# Load tempate
		tpl = EMail.loadTemplate(template)
		if not tpl:
			raise IOError("Template '%s' could not be loaded" % template)

		# Queue e-mails
		EmailConfig.EMAIL.queue(
			recepients,
			tpl.subject,
			tpl.text,
			tpl.html,
			macros
			)
