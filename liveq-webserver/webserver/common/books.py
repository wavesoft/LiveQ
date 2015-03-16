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
import re
import collections
from webserver.models import Book

class BookKeywordCache:
	"""
	This class caches all the keywords from all the books and
	provides the means to dynamically inject keyword linking information
	"""

	#: Details for each book ID
	BOOK_DETAILS = {}

	#: The list of keywords that can be overwritten and their respective book
	KEYWORDS = {}

	#: The size of the scanning frame for keywords
	KEYWORD_FRAME_SIZE = 0

	#: Regex to match text anchor
	RE_ANCHOR = re.compile(r"[\s!,.\-&+\"'\(\)\[\]\{\}]+")

	@staticmethod
	def update():
		"""
		Update cache by loading all the book keywords in the database
		"""

		# Reset fields
		BookKeywordCache.KEYWORDS = {}
		BookKeywordCache.BOOK_DETAILS = {}

		# Process all books
		for book in Book.select(Book.id, Book.name, Book.aliases):

			# Get all keywords
			keywords = book.getAliases()
			keywords.append( book.name )

			# Store on book details
			BookKeywordCache.BOOK_DETAILS[book.id] = {
					'name': book.name
				}

			# Store keywords (in lower case)
			for kw in map(unicode.lower, keywords):
				BookKeywordCache.KEYWORDS[kw.lower()] = book.id

		# If empty, raise warning
		if len(BookKeywordCache.KEYWORDS) == 0:
			logger = logging.getLogger("book-keywords")
			logger.warn("The books database is empty!")
			return

		# Sort by size of the key in descending order
		BookKeywordCache.KEYWORDS = collections.OrderedDict(
				sorted(BookKeywordCache.KEYWORDS.iteritems(), key=lambda x: -len(x[0]))
			)

		# Maximum length is set to maximum frame size
		BookKeywordCache.KEYWORD_FRAME_SIZE = len(BookKeywordCache.KEYWORDS.keys()[0])

		# Create binary search algorithm
		# TODO

	@staticmethod
	def getKeyword(kw, excludeKeywords=[], excludeBooks=[]):
		"""
		Lookup on keyword database to check for a keyword replacement
		and respond the templated replacement
		"""

		# Lowercase keyword
		kw = kw.lower()

		# Ignore matching keywords
		if kw in excludeKeywords:
			return None

		# Ignore missing keywords
		if not kw in BookKeywordCache.KEYWORDS:
			return None

		# Ignore matching books
		v = BookKeywordCache.KEYWORDS[kw]
		if v in excludeBooks:
			return None

		# Return book
		return v

	@staticmethod
	def scanKeyword(textFrame, excludeKeywords=[], excludeBooks=[]):
		"""
		Lookup a keyword using the given text frame as source
		"""

		# Lowercase whole frame
		textFrame = textFrame.lower()

		# Run linear scan over the frame
		for k,v in BookKeywordCache.KEYWORDS.iteritems():
			# Match keywords, ignoring excluded
			if (textFrame[0:len(k)] == k) and not (k in excludeKeywords):
				# Exclude books
				if v in excludeBooks:
					continue

				# Return book and match offset
				return (v, len(k))

		# Not found
		return (None, 0)

	@staticmethod
	def applyTemplate(book, word, template):
		"""
		Apply the specified template to the book
		"""

		# If details are missing return word
		if not book in BookKeywordCache.BOOK_DETAILS:
			return word

		# Apply template
		return template % {
				'book': book,
				'name': BookKeywordCache.BOOK_DETAILS[book]['name'],
				'word': word
			}

	@staticmethod
	def replaceKeywords(body, template='<a href="#%(name)s)">%(word)s</a>', exclude=[]):

		# Rreplace only once
		usedBooks = []

		# Start from the beginning
		i = 0

		# Start lookup
		while i >= 0:

			# Check if this is a forced link
			if body[i-2:i] == "[[":
				j = body.find("]]", i)

				# Extract keyword
				word = body[i:j]

				# Replace book
				book = BookKeywordCache.getKeyword(word, exclude, usedBooks)
				if book:
					# Marke used books
					usedBooks.append(book)
					# Replace matched word
					word = BookKeywordCache.applyTemplate(book, word, template)

				# Replace & forward
				body = body[0:i-2] + word + body[j+2:]
				i += len(word)

			else:

				# Lookup keyword from frame
				(book, size) = BookKeywordCache.scanKeyword(
					body[i:i+BookKeywordCache.KEYWORD_FRAME_SIZE],
					exclude, usedBooks
					)

				# If we have a book, replace it
				if book:
					# Marke used books
					usedBooks.append(book)
					# Replace matched word
					word = BookKeywordCache.applyTemplate(book, body[i:i+size], template)

					# Replace & forward
					body = body[0:i] + word + body[i+size:]
					i += len(word)

			# Get next match on current position
			m = BookKeywordCache.RE_ANCHOR.search(body, i+1)
			if not m:
				# Cannot find more anchors? Exit
				break

			# Get the end of the whitespace
			i = m.end()

		# Return the new body
		return body
