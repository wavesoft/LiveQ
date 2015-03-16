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

import _mysql
from peewee import InsertQuery

def SQLExport( toFile, peeweeModel, records, batchSize=50 ):
	"""
	Create one or multiple insert queries for the specified records
	"""

	# Add a comment regarding the model name
	toFile.write("-- Model: %s (%s)\n" % (peeweeModel.__name__, peeweeModel._meta.name))
	toFile.write("-- --------------------------------\n\n")

	# Collect rows
	rows = []
	for rec in records:
		rows.append( rec._data )

	print "Dumping %s : %i records" % (str(peeweeModel.__name__), len(rows))

	# Insert in batches
	ofs = 0
	toFile.write("BEGIN;\n")
	while ofs < len(rows):

		# Creqte the InsertQuery
		iq = peeweeModel.insert_many( rows[ofs:ofs+batchSize] )
		ofs += batchSize

		# Insert
		sql = iq.sql()
		sqlStr = sql[0] % tuple(map(lambda x: "'%s'" % _mysql.escape_string(unicode(x).encode('utf-8')), sql[1]))
		toFile.write("REPLACE %s;\n" % sqlStr[7:])

	toFile.write("COMMIT;\n")
