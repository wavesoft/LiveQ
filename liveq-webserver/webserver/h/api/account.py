
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

	def getVariable(self, group, key, defValue=None):
		"""
		Set a user variable in the dynamic variables
		"""
		# Load variable dump
		varDump = json.loads(self.user.variables)

		# Update variable
		if not group in varDump:
			return defValue
		if not key in varDump[group]:
			return defValue

		# Return
		return varDump[group][key]

	def delVariable(self, group, key):
		"""
		Set a user variable in the dynamic variables
		"""
		# Load variable dump
		varDump = json.loads(self.user.variables)

		# Update variable
		if not group in varDump:
			return
		if not key in varDump[group]:
			return

		# Delete key
		del varDump[group][key]

		# Put back
		self.user.variables = json.dumps(varDump)

	def handleAction(self, action, param):
		"""
		Handle chat actions
		"""
		
		##################################################
		# Update user's dynamic variables
		# ------------------------------------------------
		if action == "variables":
			# Update variable
			self.user.variables = json.dumps(param['vars'])
			self.user.save()

		##################################################
		# Request profile
		# ------------------------------------------------
		elif action == "profile":
			# Send user profile event
			self.socket.sendUserProfile()

		##################################################
		# Get a value from a save slot
		# ------------------------------------------------
		elif action == "save.get":

			# Check for missing parameters
			if not 'id' in param:
				self.sendError("Missing 'id' parameter")
				return

			# Return save slot values or blank array if missing
			self.sendResponse({ 
					"status": "ok",
					"values": self.getVariable("save_slots", param['id'], {})
				})


		##################################################
		# Set a value to a save slot
		# ------------------------------------------------
		elif action == "save.set":

			# Check for missing parameters
			if not 'id' in param:
				self.sendError("Missing 'id' parameter")
				return
			if not 'values' in param:
				self.sendError("Missing 'values' parameter")
				return

			# Set variable
			self.setVariable( "save_slots", param['id'], param['values'] )
			self.user.save()

			# Send response
			self.sendResponse({ 
					"status": "ok"
					})

		##################################################
		# Claim credits for a particular achievement
		# ------------------------------------------------
		elif action == "credits.claim":

			# Check for missing parameters
			if not 'claim' in param:
				self.sendError("Missing 'claim' parameter")
				return
			if not 'category' in param:
				self.sendError("Missing 'category' parameter")
				return

			# Get credits group
			claims = self.getVariable("credit_claims", param['category'], {})

			# Check if claim is placed
			if param['claim'] in claims:
				# Send response
				self.sendResponse({
							"status": "error",
							"error_id": "credits-claimed",
							"error": "Credits already claimed"
						})
				return

			# Accept this claim
			claims[param['claim']] = 1
			self.setVariable("credit_claims", param['category'], claims)

			# Find how much credits it's worth
			credits = 0
			if param['category'] == "estimate":
				if param['claim'] == "perfect":
					credits = 8
				elif param['claim'] == "good":
					credits = 4
				elif param['claim'] == "fair":
					credits = 2
				else:
					credits = 1
			elif param['category'] == "run":
				if param['claim'] == "perfect":
					credits = 16
				elif param['claim'] == "good":
					credits = 8
				elif param['claim'] == "fair":
					credits = 4
				else:
					credits = 2

			# Check if this action gives no credit
			if credits == 0:
				self.sendResponse({
							"status": "error",
							"error_id": "no-credits-awarded",
							"error": "No credits awarded"
						})
				return

			# Place credits in user's profile
			self.user.credits += credits
			self.user.save()

			# Reply with status and the new user profile
			self.socket.sendUserProfile()
			self.sendResponse({
				"status": "ok",
				"credits": credits
				})


		##################################################
		# Reset the claims of a particular achievement
		# ------------------------------------------------
		elif action == "credits.reset":

			# Check for missing parameters
			if not 'category' in param:
				self.sendError("Missing 'category' parameter")
				return

			# Get credits group
			self.delVariable("credit_claims", param['category'])
			self.user.save()


		##################################################
		# Unlock a particular knowlege with credits
		# ------------------------------------------------
		elif action == "knowledge.unlock":

			# Check for missing parameters
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

				# Delete the credits claim regarding estimations
				self.delVariable("credit_claims", "estimate")

				# Save user record
				self.user.save()

				# Reply with status and the new user profile
				self.socket.sendUserProfile()
				self.sendResponse({ "status": "ok" })


			# Missing credits?
			else:				
				self.sendError("You don't have enough credits in order to buy this item!")

