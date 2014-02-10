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
from webserver.common.navbar import getNavbarData
from liveq.models import Lab

"""
Root page handler
"""
class IndexHandler(tornado.web.RequestHandler):
	def get(self):

		# Get lab ID
		lab_id = self.get_argument("lab")

		# Get lab object
		lab = Lab.get( Lab.uuid == lab_id )

		self.render(
			"play-2.html", 
			navbar=getNavbarData(),
			lab_uuid=lab.uuid
			)
