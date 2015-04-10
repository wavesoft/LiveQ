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
import tornado.escape
import tornado.web

from webserver.config import Config
from webserver.models import UserActivationMailToken

"""
E-Mail activation handler
"""
class MailActivateHandler(tornado.web.RequestHandler):
	def get(self):
		"""
		Handle GET requests
		"""

		# Require an authentication token from get request
		token = self.get_argument("token", None)
		if token is None:
			self.render(
				"error.html",
				message="Missing authentication token!"
				)
			return

		# Get the activation token
		try:
			
			# Get activation token
			tok = UserActivationMailToken.get( token=token )

			# Activate inactive user (bit 0 not set)
			user = tok.user
			if (user.state & 1) == 0:

				# Activate
				user.state |= 1
				user.save()

				# Success
				self.render(
					"redirect.html", 
					url="",
					message="Welcome %s! Your e-mail address is now fully validated!" % user.displayName
					)

			else:
				self.render(
					"error.html",
					message="You don't have to re-activate your account because it's already activated!"
					)

			# Delete token
			tok.delete_instance()

		except UserActivationMailToken.DoesNotExist:
			self.render(
				"error.html",
				message="The specified activation token does not exist!"
				)

