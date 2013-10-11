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

from liveq.net.adapter import Adapter
from liveq.config import AdapterConfig

from sleekxmpp import ClientXMPP
from sleekxmpp.exceptions import IqError, IqTimeout

"""
Configuration implementation
"""
class Config(AdapterConfig):

	"""
	Populate the adapter configuration using the stored config hash
	"""
	def __init__(self,config):
		self.SERVER = config["server"]
		self.DOMAIN = config["domain"]
		self.USERNAME = config["username"]
		self.PASSWORD = config["password"]
		self.RESOURCE = config["resource"]

	"""
	Create an XMPP Adapter instance with the given configuration
	"""
	def instance(self,userconfig):
		return XMPPAdapter(self,userconfig)

"""
XMPP Adapter
"""
class XMPPAdapter(Adapter, ClientXMPP):
	
	"""
	Initialize the XMPP adapter with the given static and user config
	"""
	def __init__(self,config,userconfig):

		# Setup superclasses
		Adapter.__init__(self,config,userconfig)
		ClientXMPP.__init__(self, "%s@%s/%s" % (config.SERVER, config.DOMAIN, config.RESOURCE), config.PASSWORD)

		# Register event handlers
		self.add_event_handler("session_start", self.session_start)
		self.add_event_handler("message", self.message)

	"""
	Session management
	"""
	def session_start(self, event):
		self.send_presence()
		self.get_roster()

	"""
	Message I/O
	"""
	def message(self, msg):
		if msg['type'] in ('chat', 'normal'):
			msg.reply("Thanks for sending\n%(body)s" % msg).send()
