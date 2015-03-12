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

import json
import logging
import tornado.escape
import tornado.web

from webserver.config import Config
from webserver.common.navbar import getNavbarData
from webserver.models import Book, BookQuestion, Tunable, Observable

"""
Lab configuration page handler
"""
class ConfigHandler(tornado.web.RequestHandler):
	def get(self):
		self.render("configure.html", navbar=getNavbarData())

"""
Books configuration handler
"""
class ConfigBooksHandler(tornado.web.RequestHandler):
	def get(self):

		# Get all books
		books = []
		for b in Book.select().dicts():

			# Split aliases
			aliases = []
			if b['aliases']:
				aliases = b['aliases'].split(",")
			b['aliases'] = aliases

			# Collect
			books.append(b)

		# Render
		self.render("editor_books.html", 
			navbar=getNavbarData(),
			books=books
		)

"""
Edit book handler
"""
class ConfigEditBookHandler(tornado.web.RequestHandler):
	def get(self):

		# Check if user requested a book
		book_id = self.get_argument("book", None)
		if book_id is None:
			# Create new book if not exists
			book = Book()
		else:
			# Resume previous book if already exists
			book = Book.get( Book.id == int(book_id) )

		# Collect questions to the book
		book_questions = []
		for q in book.selectQuestions():
			book_questions.append( q.serialize() )

		# Render
		self.render("editor_books_edit.html", 
			navbar=getNavbarData(),
			book=book,
			book_questions=json.dumps( book_questions )
			)

	def post(self):

		# Get fields
		book_id = self.get_argument("book", None)
		if book_id == "None":
			# Create new book if not exists
			book = Book()
		elif book_id is None:
			# Error
			return
		else:
			# Resume previous book if already exists
			book = Book.get( Book.id == int(book_id) )

		# Update fields
		book.name = self.get_body_argument("name", "")
		book.aliases = self.get_body_argument("aliases", "")
		book.short = self.get_body_argument("short", "")
		book.description = self.get_body_argument("description", "")
		book.games = self.get_body_argument("games", "")
		book.material = self.get_body_argument("material", "")

		# Save book
		book.save()

		# Check which books to delete
		del_questions = { }
		for q in book.selectQuestions():
			del_questions[q.id] = q

		# Process questions
		book_questions = json.loads(self.get_body_argument("book_questions", ""))
		for q in book_questions:

			# Get item id
			qid = int(q['id'])
			if qid < 0:
				bq = BookQuestion(book=book)
			else:
				try:
					bq = BookQuestion.get( BookQuestion.id == qid )
					del del_questions[qid]
				except BookQuestion.DoesNotExist:
					continue

			# Update item
			bq.question = q['question']
			bq.answers = json.dumps( q['answers'] )
			bq.correct = int(q['correct'])

			# Save question
			bq.save()

		# Delete books
		for q in del_questions.values():
			q.delete_instance(True)

		# Redirect
		self.redirect( self.reverse_url('config.books') )


"""
Edit book handler
"""
class ConfigDeleteBookHandler(tornado.web.RequestHandler):
	def get(self):

		# Check if user requested a book
		book_id = self.get_argument("book", None)
		if not book_id is None:

			# Resume previous book if already exists
			book = Book.get( Book.id == int(book_id) )

			# Delete instance
			book.delete_instance(True)

		# Redirect
		self.redirect( self.reverse_url('config.books') )


"""
Tunables configuration handler
"""
class ConfigTunablesHandler(tornado.web.RequestHandler):
	def get(self):

		# Get all tunables
		tunables = []
		for b in Tunable.select().order_by( Tunable.book.desc() ).dicts():

			# Collect
			tunables.append(b)

		# Render
		self.render("editor_tunables.html", 
			navbar=getNavbarData(),
			tunables=tunables
		)

"""
Edit Tunable handler
"""
class ConfigEditTunableHandler(tornado.web.RequestHandler):
	def get(self):

		# Check if user requested a tunable
		tunable_id = self.get_argument("tunable", None)
		if tunable_id is None:
			# Create new tunable if not exists
			tunable = Tunable()
		else:
			# Resume previous tunable if already exists
			tunable = Tunable.get( Tunable.id == int(tunable_id) )

		# Get all books
		books = Book.select( Book.id, Book.name )[:]

		# Render
		self.render("editor_tunables_edit.html", 
			navbar=getNavbarData(),
			tunable=tunable,
			books=books
			)

	def post(self):

		# Get fields
		tunable_id = self.get_argument("tunable", None)
		if tunable_id == "None":
			# Create new tunable if not exists
			tunable = Tunable()
		elif tunable_id is None:
			# Error
			return
		else:
			# Resume previous tunable if already exists
			tunable = Tunable.get( Tunable.id == int(tunable_id) )

		# Update fields
		tunable.name = self.get_body_argument("name", "")
		tunable.short = self.get_body_argument("short", "")
		tunable.title = self.get_body_argument("title", "")
		tunable.group = self.get_body_argument("group", "")
		tunable.subgroup = self.get_body_argument("subgroup", "")
		tunable.book = self.get_body_argument("book", "")
		tunable.units = self.get_body_argument("units", "")
		tunable.desc = self.get_body_argument("desc", "")
		tunable.default = float(self.get_body_argument("default", "0.0"))
		tunable.min = float(self.get_body_argument("min", "0.0"))
		tunable.max = float(self.get_body_argument("max", "0.0"))
		tunable.dec = int(self.get_body_argument("dec", "0.0"))

		# Save tunable
		tunable.save()

		# Redirect
		self.redirect( self.reverse_url('config.tunables') )


"""
Edit Tunable handler
"""
class ConfigDeleteTunableHandler(tornado.web.RequestHandler):
	def get(self):

		# Check if user requested a tunable
		tunable_id = self.get_argument("tunable", None)
		if not tunable_id is None:

			# Resume previous tunable if already exists
			tunable = tunable.get( tunable.id == int(tunable_id) )

			# Delete instance
			tunable.delete_instance(True)

		# Redirect
		self.redirect( self.reverse_url('config.tunables') )

