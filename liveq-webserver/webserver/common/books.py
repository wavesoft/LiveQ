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

import re
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

	#: Regex to match text anchor
	RE_ANCHOR = re.compile(r"[\s!,.\-&+\"'\(\)\[\]\{\}]+")

	@staticmethod
	def update():
		"""
		Update cache by loading all the book keywords in the database
		"""

		# Process all books
		for book in Book.select(Book.id, Book.name, Book.aliases):

			# Get all keywords
			keywords = book.getAliases()
			keywords.append( book.name )

			# Store on book details
			BookKeywordCache.BOOK_DETAILS[book.id] = {
					'name': book.name
				}

			# Store keywords
			for kw in keywords:
				BookKeywordCache.KEYWORDS[kw.lower()] = book.id

		# Create binary search algorithm
		# TODO

	@staticmethod
	def replaceKeywords(body, template='<a href="#%(name)s)">%(word)s</a>', exclude=[]):

		# Rreplace only once
		once = []

		# Start from the beginning
		i = 0

		# Start lookup
		while i >= 0:

			# Check if this is a forced link
			if body[i-2:i] == "[[":
				j = body.find("]]", i)

				# Get the keyword
				kw = body[i:j]

				# Check if we have it on store
				if (kw in BookKeywordCache.KEYWORDS) and not (kw in exclude):
					v = BookKeywordCache.KEYWORDS[kw]

					# Calculate replacement
					rpw = template % {
							'book': v,
							'name': BookKeywordCache.BOOK_DETAILS[v]['name'],
							'word': body[i:i+l]
						}

				else:
					# Remobe brackets
					rpw = kw

				# Replace & forward
				body = body[0:i-2] + rpw + body[j+2:]
				i = j+2

			else:

				# Check if a keyword matches at the current anchor
				for k,v in BookKeywordCache.KEYWORDS.iteritems():
					if (body[i:i+len(k)].lower() == k) and not (k in exclude):

						# Replace only once
						if k in once:
							break
						once.append(k)

						# get keyword length
						l = len(k)

						# Calculate replacement
						rpw = template % {
								'book': v,
								'name': BookKeywordCache.BOOK_DETAILS[v]['name'],
								'word': body[i:i+l]
							}

						# Replace & forward index
						body = body[0:i] + rpw + body[i+l:]
						i += len(rpw)-1

						# Exit loop
						break

			# Get next match on current position
			m = BookKeywordCache.RE_ANCHOR.search(body, i+1)
			if not m:
				# Cannot find more anchors? Exit
				break

			# Get the end of the whitespace
			i = m.end()

		# Return the new body
		return body
