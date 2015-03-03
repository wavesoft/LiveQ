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

from webserver.models import TootrAnimation
from webserver.config import Config
from webserver.common.navbar import getNavbarData

"""
Tootr Handler
"""
class TootrGetAnimation(tornado.web.RequestHandler):
	def get(self):
		"""
		Playback animation with id=...
		/tootr/animation?play=<id>
		"""

		# Check request
		anim_id = self.get_argument("play")

		# Lookup entry
		try:
			anim = TootrAnimation.get( TootrAnimation.name == anim_id )
		except TootrAnimation.DoesNotExist:
			# Not found
			return self.send_error(404)

		# Serialize and send
		self.write({ "status": "ok", "data": anim.serialize() })

	def post(self):
		"""
		Store animation with id=...
		/tootr/animation?save=<id>
		"""

		# Check request
		anim_id = self.get_argument("save")

		# Get authentication information
		user_auth = self.get_argument("userName")
		user_key = self.get_argument("userKey")

		# Parse document
		docBody = tornado.escape.json_decode(self.request.body)

		# Lookup entry
		try:
			anim = TootrAnimation.get( TootrAnimation.name == anim_id )
		except TootrAnimation.DoesNotExist:
			# Not found? Create new
			anim = TootrAnimation.create( name=anim_id )

		# Update information

		# Save
		anim.save()
		self.write({ "status": "ok" })
