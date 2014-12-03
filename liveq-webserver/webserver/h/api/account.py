
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

import time
import datetime
import json

from liveq.io.bus import Bus

from webserver.h.api import APIInterface
from webserver.config import Config
from tornado.ioloop import IOLoop

class AccountInterface(APIInterface):

	def __init__(self, socket):
		"""
		Initialize the CHAT API interface
		"""
		APIInterface.__init__(self, socket, "account")

	def ready(self):
		"""
		When socket is ready, get the user reference
		"""

		# Keep a local reference of the user
		self.user = self.socket.user

	def setVariable(self, group, key, value):
		"""
		Set a user variable in the dynamic variables
		"""
		# Load variable dump
		varDump = json.loads(self.user.variables)

		# Update variable
		if not group in varDump:
			varDump[group] = {}
		varDump[group][key] = value

		# Put back
		self.user.variables = json.dumps(varDump)

	def handleAction(self, action, param):
		"""
		Handle chat actions
		"""
		
		# Update user's dynamic variables
		if action == "variables":
			# Update variable
			self.user.variables = json.dumps(param['vars'])
			self.user.save()

		elif action == "profile":
			# Send user profile event
			self.socket.sendUserProfile()

		elif action == "knowledge.unlock":

			# Get knowledge id
			if not 'id' in param:
				self.sendError("Missing 'id' parameter")
				return

			# Get knowledge record
			knowledge = Config.CACHE.get("knowlege_grid", param['id'])
			if not knowledge:
				self.sendError("Could not locate specified knowledge")
				return

			# Check transaction
			if self.user.credits >= knowledge['info']['cost']:
				
				# Consume the credits
				self.user.credits -= knowledge['info']['cost']
				# Mark this knowledge as explored
				self.setVariable("explored_knowledge", param['id'], 1)

				# Save user record
				self.user.save()

				# Reply with status and the new user profile
				self.socket.sendUserProfile()
				self.sendAction("knowledge.unlock.response", { "status": "ok" })

			# Missing credits?
			else:				
				self.sendError("You don't have enough credits in order to buy this item!")

