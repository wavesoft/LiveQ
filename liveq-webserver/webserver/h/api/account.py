
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
from webserver.models import MachinePart

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
		try:

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
			# User private messages
			# ------------------------------------------------
			elif action == "messages":

				# Send response
				self.sendResponse({ 
						"status": "ok",
						"messages": self.user.getUserMessages()
						})

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
			# Return profile paper status
			# ------------------------------------------------
			elif action == "papers.profile":

				# Return paper status
				self.sendResponse({
						"status": "ok",
						"user" : self.user.getUnpublishedPapers(),
						"team" : self.user.getTeamPapers()
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
			# Focus on a particular paper
			# ------------------------------------------------
			elif action == "papers.focus":

				# Focus on paper
				self.user.focusPaper(param['id'])

				# Trigger action
				self.user.trigger("paper.focus", paper=param['id'])

				# Send response
				self.sendResponse({
						"status": "ok"
					})

				# Update the user profile
				self.socket.sendUserProfile()

			##################################################
			# Create a new paper
			# ------------------------------------------------
			elif action == "papers.create":

				# Make sure user is member of a team
				if self.user.teamID == 0:
					self.sendError("You must be member of a team before you can create a paper!", "not-in-team")

				# Return paper status
				self.sendResponse({
						"status": "ok",
						"data" : self.user.createPaper()
					})

			##################################################
			# Delete a particular paper
			# ------------------------------------------------
			elif action == "papers.delete":

				# Delete paper
				if self.user.deletePaper(param['id']):

					# Return paper status
					self.sendResponse({
							"status": "ok",
						})

				else:

					# Return paper status
					self.sendError('Could not delete paper', 'delete-error')

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
			# Cite a particular paper
			# ------------------------------------------------
			elif action == "papers.cite":

				# Cite paper
				self.user.citePaper(param['id'])

				# Trigger action
				self.user.trigger("paper.cite", paper=param['id'])

				# Return paper status
				self.sendResponse({
						"status": "ok"
					})

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
			# Get a book exam
			# ------------------------------------------------
			elif action == "books.exam":

				# Read a particular book
				self.sendResponse({
						"status": "ok",
						"data" : self.user.getBookExam()
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

				# Send user profile
				self.socket.sendUserProfile()

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
			# Get machine parts
			# ------------------------------------------------
			elif action == "parts.details":

				# Lookup stage
				try:
					part = MachinePart.get( MachinePart.name == param['part'] )
				except MachinePart.DoesNotExist:
					self.sendError("The specified machine part does not exist!", "not-exists")
					return

				# Return details
				self.sendResponse({
						"status": "ok",
						"data" : self.user.getMachinePartDetails(part)
					})

			##################################################
			# Unlock the specified machine part
			# ------------------------------------------------
			elif action == "parts.unlock":

				# Unlock machine part
				self.user.unlockMachinePartStage(param['id'])

				# Return paper status
				self.sendResponse({
						"status": "ok",
					})

				# Resend user profile
				self.socket.sendUserProfile()


			##################################################
			# Request the achievements tree
			# ------------------------------------------------
			elif action == "achievements.tree":

				# Return achievements tree
				self.sendResponse({
					"status": "ok",
					"data": self.user.getAchievementsTree()
					})

		#######################################################
		# Handle all exceptions
		# -----------------------------------------------------
		except HLUserError as e:

			# An error occured while trying to spend credits
			self.sendError(e.message, e.code)

