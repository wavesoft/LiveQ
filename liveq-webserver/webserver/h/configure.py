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
from webserver.models import Lab, Book, BookQuestion, Tunable, Observable, MachinePart, MachinePartStage

class ConfigHandler(tornado.web.RequestHandler):
	"""
	Lab configuration page handler
	"""

	def get(self):
		self.render("configure.html", 
			navbar=getNavbarData()
			)

class ConfigBooksHandler(tornado.web.RequestHandler):
	"""
	Books configuration handler
	"""

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
			books=books,
		)

class ConfigEditBookHandler(tornado.web.RequestHandler):
	"""
	Edit book handler
	"""

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
			book_questions=json.dumps( book_questions ),
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


class ConfigDeleteBookHandler(tornado.web.RequestHandler):
	"""
	Edit book handler
	"""

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


class ConfigTunablesHandler(tornado.web.RequestHandler):
	"""
	Tunables configuration handler
	"""

	def get(self):

		# Pick the active lab
		lab = self.get_argument("lab", "")
		if not lab:
			lab = self.get_cookie("lab", "")
		else:
			self.set_cookie("lab", lab)

		# Prepare query
		query = Tunable.select().order_by( Tunable.book.desc() )

		# Apply lab filter
		if lab:

			# Get names of observables in the lab
			labInst = Lab.get(id=int(lab))
			query = query.where( Tunable.name << labInst.getTunableNames() )

		# Render
		self.render("editor_tunables.html", 
			navbar=getNavbarData(),
			tunables=query.dicts(),
			labs=Lab.select(),
			lab=lab,
		)

class ConfigEditTunableHandler(tornado.web.RequestHandler):
	"""
	Edit Tunable handler
	"""

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


class ConfigDeleteTunableHandler(tornado.web.RequestHandler):
	"""
	Delete Tunable handler
	"""

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


class ConfigObservablesHandler(tornado.web.RequestHandler):
	"""
	Observable configuration handler
	"""

	def get(self):

		# Pick the active lab
		lab = self.get_argument("lab", "")
		if not lab:
			lab = self.get_cookie("lab", "")
		else:
			self.set_cookie("lab", lab)

		# Pick sort key
		sort = self.get_argument("sort", "book")
		try:
			order_key = getattr( Observable, sort )
		except AttributeError:
			sort = "book"
			order_key = getattr( Observable, sort )

		# Prepare query
		query = Observable.select().order_by( order_key.desc() )

		# Apply lab filter
		if lab:

			# Get names of observables in the lab
			labInst = Lab.get(id=int(lab))
			query = query.where( Observable.name << labInst.getHistograms() )

		# Render
		self.render("editor_observables.html", 
			navbar=getNavbarData(),
			observables=query.dicts(),
			labs=Lab.select(),
			lab=lab,
		)

class ConfigEditObservableHandler(tornado.web.RequestHandler):
	"""
	Edit Observable handler
	"""

	def get(self):

		# Check if user requested a tunable
		observable_id = self.get_argument("observable", None)
		if observable_id is None:
			# Create new observable if not exists
			observable = Observable()
		else:
			# Resume previous observable if already exists
			observable = Observable.get( Observable.id == int(observable_id) )

		# Get all books
		books = Book.select( Book.id, Book.name )[:]

		# Render
		self.render("editor_observables_edit.html", 
			navbar=getNavbarData(),
			observable=observable,
			books=books
			)

	def post(self):

		# Get fields
		observable_id = self.get_argument("observable", None)
		if observable_id == "None":
			# Create new observable if not exists
			observable = Observable()
		elif observable_id is None:
			# Error
			return
		else:
			# Resume previous observable if already exists
			observable = Observable.get( Observable.id == int(observable_id) )

		# Update fields
		observable.name = self.get_body_argument("name", "")
		observable.short = self.get_body_argument("short", "")
		observable.title = self.get_body_argument("title", "")
		observable.group = self.get_body_argument("group", "")
		observable.subgroup = self.get_body_argument("subgroup", "")
		observable.book = self.get_body_argument("book", "")
		observable.desc = self.get_body_argument("desc", "")
		observable.analysis = self.get_body_argument("analysis", "")
		observable.labelX = self.get_body_argument("labelX", "")
		observable.labelY = self.get_body_argument("labelY", "")
		observable.logY = int(self.get_body_argument("logY", ""))
		observable.process = self.get_body_argument("process", "")
		observable.cuts = self.get_body_argument("cuts", "")
		observable.params = self.get_body_argument("params", "")
		observable.accelerators = self.get_body_argument("accelerators", "")

		# Save tunable
		observable.save()

		# Redirect
		self.redirect( self.reverse_url('config.observables') )


class ConfigDeleteObservableHandler(tornado.web.RequestHandler):
	"""
	Delete Observables handler
	"""

	def get(self):

		# Check if user requested a tunable
		observable_id = self.get_argument("observable", None)
		if not observable_id is None:

			# Resume previous observable if already exists
			observable = Observable.get( Observable.id == int(observable_id) )

			# Delete instance
			observable.delete_instance(True)

		# Redirect
		self.redirect( self.reverse_url('config.observables') )

class ConfigLevelsHandler(tornado.web.RequestHandler):
	"""
	Levels configuration
	"""

	def get(self):

		# Levels structure
		levels = []

		# Iterate over machine parts
		for part in MachinePart.select():

			# Iterate over stages
			stages = []
			for stage in MachinePartStage.select().where( MachinePartStage.part == part ).dicts():

				# Collect stages
				stages.append( stage )

			# Update stages
			levels.append({
				'part': part.serialize(),
				'stages': stages
				})

		# Render
		self.render("editor_levels.html", 
			navbar=getNavbarData(),
			levels=levels,
			)
