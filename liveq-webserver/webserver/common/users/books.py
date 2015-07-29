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

import copy
import random

from webserver.models import *
from webserver.config import GameConfig
from webserver.common.users.exceptions import HLUserError
from webserver.common.books import BookKeywordCache

def weighted_choice(weights):
	"""
	Return the index based on weighted random choice
	of the given set of weights
	"""
	totals = []
	running_total = 0

	for w in weights:
		running_total += w
		totals.append(running_total)

	rnd = random.random() * running_total
	for i, total in enumerate(totals):
		if rnd < total:
			return i

class HLUser_Books:

	def getBook(self, bookName):
		"""
		Return the specified book details, including user-specific information
		"""
		
		# First, fetch book
		try:
			book = Book.get( Book.name == bookName )
		except Book.DoesNotExist:
			return None

		# Keyword replacement template
		tpl = '<a href="javascript:;" data-book="%(name)s" class="book-link" title="%(name)s">%(word)s</a>'

		# Get keywors (to ignore when replacing keywords)
		ignoreKw = book.getAliases()
		ignoreKw.append( book.name.lower() )

		# Then, serialize and replace body hyperlinks
		book = book.serialize()
		book['short'] = BookKeywordCache.replaceKeywords( book['short'], tpl, ignoreKw )
		book['description'] = BookKeywordCache.replaceKeywords( book['description'], tpl, ignoreKw )

		# Return book
		return book

	def getBookStatistics(self):
		"""
		Return the user book statistics
		"""

		# Get user's visited books
		userBooks = self.dbUser.getVisitedBooks()

		# Populate all books
		books = []
		for book in Book.select(Book.id, Book.name).dicts():

			# Check user's status on this book
			if book['id'] in self.bookState:
				qLen = self.bookState[book['id']]['questions']
				qCorrect = self.bookState[book['id']]['correct']

				# Answered all? Mastered!
				if qCorrect >= qLen:
					state = 2
				else:
					state = 1

			elif book['id'] in userBooks:
				# Just seen
				state = 1
			else:
				# Not yet seen
				state = 0

			# Add book state
			book['state'] = state
			books.append(book)

		# Return books sorted by state
		return sorted( books, lambda x,y: y['state']-x['state'] )

	def getBookExam(self, count=5):
		"""
		Return a new book exam
		"""

		# Require a book-exam cooldown timer
		if not self.isCooldownExpired("book-exam"):
			raise HLUserError("You will have to wait a bit more until you are able to take another exam", "wait")

		# Get user's visited books
		nonMasteredBooks = self.dbUser.getVisitedBooks()

		# Remove mastered books from nonMasteredBooks
		for k,v in self.bookState.iteritems():
			if v['correct'] >= v['questions']:
				try:
					i = nonMasteredBooks.index(k)
					del nonMasteredBooks[i]
				except ValueError:
					continue

		# If nothing to query, return none
		if not nonMasteredBooks:
			return None

		# Get all questions for non-mastered, visited books
		questions = {}
		for q in BookQuestion.select().where(
				(BookQuestion.book << nonMasteredBooks)
			):

			# Store question indexed
			questions[q.id] = q.serialize()
			questions[q.id]['trials'] = 0

		# If no questions, return none
		if not questions:
			return None

		# Get trials and remove correct responses on the above answers
		maxTrials = 0
		for ans in BookQuestionAnswer.select(
				BookQuestionAnswer.trials,
				BookQuestionAnswer.answer,
				BookQuestionAnswer.question
			).where(
				(BookQuestionAnswer.user == self.dbUser) &
				(BookQuestionAnswer.question << questions.keys())
			):

			# Skip correct answers
			if ans.answer == questions[ans._data['question']]['correct']:
				del questions[ans._data['question']]
				continue

			# Append trial counters on questions
			questions[ans._data['question']]['trials'] = ans.trials
			if ans.trials > maxTrials:
				maxTrials = ans.trials

		# If we have limited choices, just return the set
		if len(questions) <= count:
			return questions.values()

		# Otherwise, compile a random set
		else:

			# Generate question weights, basing on trials
			questions = questions.values()
			qWeights = map(lambda x: maxTrials-x['trials']+1, questions)

			# Start collecting weighted random indices
			indices = []
			n = None
			while (len(indices) < count):
				# Get random element
				n = weighted_choice(qWeights)
				# If n is not in indices, add it
				if (n not in indices):
					indices.append(n)

			# Return subset of questions
			return map(lambda x: questions[x], indices)


	def handleBookQuestionAnswers(self, replies):
		"""
		Reply the book questions
		"""

		# Don't do anything if we don't really have replies
		if not replies:
			return

		# Copy the user's book status
		oBookState = copy.deepcopy(self.bookState)

		# Process replies individually
		for reply in replies:

			# Get or create record
			try:
				q = BookQuestionAnswer.get(
						(BookQuestionAnswer.user == self.dbUser) &
						(BookQuestionAnswer.question == reply['id'])
					)
			except BookQuestionAnswer.DoesNotExist:
				q = BookQuestionAnswer(
					user=self.dbUser,
					question=reply['id']
				)
			
			# Update
			q.trials += 1
			q.answer = reply['choice']
			q.save()


		# Update cache
		self.updateCache_Books()
		self.dbUser.save()

		# Update cooldown timer
		self.setCooldown("book-exam", GameConfig.GAME_EXAM_COOLDOWN)

		# Give 5 points for successfully taking the quiz
		self.earnPoints(2, "for taking a quiz")

		# If any of the books just become 'mastered', it
		# happened because of our answer. Trigger the 'mastered'
		# event.
		for k,v in oBookState.iteritems():
			nv = self.bookState[k]

			# Check if they were/is mastered
			wasMastered = (v['questions'] ==  v['correct'])
			isMastered = (nv['questions'] == nv['correct'])

			# Check if the question is now mastered
			if not wasMastered and isMastered:

				# Get book details
				book = Book.get( Book.id == k )

				# Fire event
				self.userEvents.send("alert", {
					"type"   : "flash",
					"icon"   : "flash-icons/books.png",
					"title"  : "Mastered topic",
					"message": "You have just mastered the topic <em>%s</em>!" % book.name
					})

				# Give 5 points for mastering the topic
				self.earnPoints(8, "for mastering the topic")


	def markBookAsRead(self, bookName):
		"""
		User has read the specified book
		"""

		# Get book by name
		try:
			book = Book.get( Book.name == bookName )
		except Book.DoesNotExist:
			return

		# If this book does not exist in user's books, update it
		if not self.dbUser.hasVisitedBook(book.id):

			# Update visited book
			self.dbUser.visitBook(book.id)

			# Update book cache
			self.updateCache_Books();

			# Save 
			self.dbUser.save()

			# Trigger notification
			self.userEvents.send("alert", {
				"type"   : "info",
				"title"  : "Knowledge explored",
				"message": "That's the first time you see the term <em>%s</em>" % bookName
				})
