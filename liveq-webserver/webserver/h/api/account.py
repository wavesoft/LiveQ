
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
from webserver.models import KnowledgeGrid

from webserver.common.users import HLUserError

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

	def handleAction(self, action, param):
		"""
		Handle chat actions
		"""

		##################################################
		# Request profile
		# ------------------------------------------------
		if action == "profile":
			# Send user profile event
			self.socket.sendUserProfile()

		##################################################
		# User variables
		# ------------------------------------------------
		elif action == "variables":
			# Update user variables
			self.user.setVariables( param['vars'] )

		##################################################
		# Trigger an arbitrary action
		# ------------------------------------------------
		elif action == "trigger":

			# Pop event
			event = param['event']
			del param['event']

			# Forward trigger
			self.user.trigger( event, **param )

			# Send response
			self.sendResponse({ 
					"status": "ok"
					})

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
					"values": self.user.getVariable("save_slots", param['id'], {})
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
			self.user.setVariable( "save_slots", param['id'], param['values'] )

			# Send response
			self.sendResponse({ 
					"status": "ok"
					})

		##################################################
		# Return tuning configuration
		# ------------------------------------------------
		elif action == "data.tuning":

			# Return tuning configuration
			self.sendResponse({
					"status": "ok",
					"data" : self.user.getTuningConfiguration()
				})

		##################################################
		# Return knowledge configuration
		# ------------------------------------------------
		elif action == "data.knowledge":

			# Return knowledge configuration
			self.sendResponse({
					"status": "ok",
					"data" : self.user.getKnowledgeTree()
				})

		##################################################
		# Return papers status
		# ------------------------------------------------
		elif action == "papers.list":

			# Return paper status
			self.sendResponse({
					"status": "ok",
					"data" : self.user.getPapers(param['query'])
				})

		##################################################
		# Read a particular paper
		# ------------------------------------------------
		elif action == "papers.read":

			# Trigger action
			self.user.trigger("paper.read", paper=param['id'])

			# Return paper status
			self.sendResponse({
					"status": "ok",
					"data" : self.user.getPaper(param['id'])
				})

		##################################################
		# Update a particular paper
		# ------------------------------------------------
		elif action == "papers.update":

			# Update paper
			if self.user.updatePaper(param['id'], param['fields']):

				# Trigger action
				self.user.trigger("paper.update", paper=param['id'], fields=param['fields'])

				# Return paper status
				self.sendResponse({
						"status": "ok",
					})

			else:

				# Return paper status
				self.sendError('Could not update paper', 'update-error')

		##################################################
		# Get a particular book
		# ------------------------------------------------
		elif action == "books.read":

			# Trigger action
			self.user.trigger("book.read", book=param['name'])

			# Mark book as read
			self.user.markBookAsRead( param['name'] )

			# Read a particular book
			self.sendResponse({
					"status": "ok",
					"data" : self.user.getBook(param['name'])
				})

		##################################################
		# Get a book questions
		# ------------------------------------------------
		elif action == "books.questions":

			# Read a particular book
			self.sendResponse({
					"status": "ok",
					"data" : self.user.getBookQuestions()
				})

		##################################################
		# Handle answers to book question
		# ------------------------------------------------
		elif action == "books.answers":

			# Handle answers
			self.user.handleBookQuestionAnswers( param['answers'] )
			
			# Send OK
			self.sendResponse({
					"status": "ok",
				})

		##################################################
		# Get a books profile
		# ------------------------------------------------
		elif action == "profile.books":

			# Get a particular book
			self.sendResponse({
					"status": "ok",
					"data" : self.user.getBookStatistics()
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
			claims = self.user.getVariable("credit_claims", param['category'], {})

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
			self.user.setVariable("credit_claims", param['category'], claims)

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
			self.user.points += points

			# Reply with status and the new user profile
			self.socket.sendUserProfile()
			self.sendResponse({
				"status": "ok",
				"points": points
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
			self.user.delVariable("credit_claims", param['category'])

		##################################################
		# Unlock a particular knowlege with credits
		# ------------------------------------------------
		elif action == "knowledge.unlock":

			# Check for missing parameters
			if not 'id' in param:
				self.sendError("Missing 'id' parameter")
				return

			# Check the user has already unlocked this item
			if self.user.knows(param['id']):
				self.sendResponse({ "status": "ok" })

			# Lookup knowledge grid item
			try:
				knowledge = KnowledgeGrid.get( KnowledgeGrid.id == param['id'] )
			except KnowledgeGrid.DoesNotExist:
				self.sendError("Could not locate specified knowledge item")
				return

			# Check transaction
			try:

				# Spend user points
				self.user.spendPoints( knowledge.cost )

				# Expand knowledge
				self.user.expandKnowledge( knowledge )

				# Reply with status and the new user profile
				self.socket.sendUserProfile()
				self.sendResponse({
					"status": "ok",
					"knowledge": knowledge.serialize()
					})

			except HLUserError as e:

				# An error occured while trying to spend credits
				self.sendError(e.message, e.code)

