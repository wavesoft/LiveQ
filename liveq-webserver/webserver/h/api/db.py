
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

import liveq.models

from liveq.io.bus import Bus

from webserver.h.api import APIInterface
from webserver.config import Config
from tornado.ioloop import IOLoop

class DatabaseInterface(APIInterface):

	def __init__(self, socket):
		"""
		Initialize the DATABASE API interface
		"""
		APIInterface.__init__(self, socket, "db")

		# Table names and mapping to the allowed models
		self.tables = {
			'tunable' : {
				'model'  : liveq.models.Tunable,
				'index'	 : 'name',
				'read'   : None,
				'write'  : ['admin']
			},
			'observable' : {
				'model'  : liveq.models.Observable,
				'index'	 : 'name',
				'read'   : None,
				'write'  : ['admin']
			},
			'knowledge_grid' : {
				'model'  : liveq.models.KnowledgeGrid,
				'index'	 : 'id',
				'read'   : None,
				'write'  : ['admin']
			}
		}


	def ready(self):
		"""
		When socket is ready, get the user reference
		"""
		
		# Keep a local reference of the user
		self.user = self.socket.user

	def serialize(self, MODEL, record, expandJSON=True):
		"""
		Serialize the given record to a dictionary
		"""

		# Get model fields
		FIELDS = MODEL._meta.get_field_names()

		# Compile document
		document = {}
		for f in FIELDS:
			if (f in MODEL.JSON_FIELDS) and expandJSON:
				if not getattr(record, f):
					document[f] = {}
				else:
					document[f] = json.loads(getattr(record, f))
			else:
				document[f] = getattr(record, f)

		# Return document
		return document

	def get_table_record(self, docName, docIndex, expandJSON=True):
		"""
		Return the given table record
		"""

		# Check the table 
		if not docName in self.tables:
			return self.sendError("Table %s not found!" % docName)

		# Get table
		tab = self.tables[docName]

		# Check priviledges
		if not (tab['read'] is None) and not self.user.inGroups(tab['read']):
			return self.sendError("You are not authorized to access table %s" % docName)

		# Query table
		MODEL = tab['model']

		try:

			# Try to get record
			record = MODEL.get( getattr(MODEL,tab['index']) == docIndex )

			# Compile document
			document = self.serialize( MODEL, record, expandJSON=expandJSON )

			# Send data
			self.sendResponse({
				"status": "ok",
				"doc": document
				})


		except MODEL.DoesNotExist:

			# Does not exist
			self.sendResponse({
				"status": "error",
				"error": "Document does not exist",
				"error_id": "does-not-exist"
				})


	def update_table_record(self, docName, docIndex, docFields, expandJSON=True):
		"""
		Update the specified table record
		"""

		# Check the table 
		if not docName in self.tables:
			return self.sendError("Table %s not found!" % docName)

		# Get table
		tab = self.tables[docName]

		# Check priviledges
		if not (tab['write'] is None) and not self.user.inGroups(tab['write']):
			return self.sendError("You are not authorized to access table %s" % docName)

		# Query table
		MODEL = tab['model']
		FIELDS = MODEL._meta.get_field_names()

		# Fetch or create new record
		try:
			# Try to get record
			record = MODEL.get( getattr(MODEL,tab['index']) == docIndex )

		except MODEL.DoesNotExist:
			# Allocate new record
			record = MODEL()


		# Update fields
		for f in FIELDS:
			if f in docFields:
				if (f in MODEL.JSON_FIELDS) and expandJSON:
					if not docFields[f]:
						setattr(record, f, "")
					else:
						setattr(record, f, json.dumps(docFields[f]))
				else:
					setattr(record, f, docFields[f])

		# Save record
		record.save()

		# Send data
		self.sendResponse({
			"status": "ok"
			})

	def get_all_records(self, docName, expandJSON=True):
		"""
		Return all records
		"""

		# Check the table 
		if not docName in self.tables:
			return self.sendError("Table %s not found!" % docName)

		# Get table
		tab = self.tables[docName]

		# Check priviledges
		if not (tab['read'] is None) and not self.user.inGroups(tab['read']):
			return self.sendError("You are not authorized to access table %s" % docName)

		# Query table
		MODEL = tab['model']

		# Get all records
		ans = []
		for record in MODEL.select():

			# Serialize document
			ans.append( self.serialize( MODEL, record, expandJSON=expandJSON ) )

		# Send data
		self.sendResponse({
			"status": "ok",
			"docs": ans
			})

	def find_records(self, docName, docQuery, expandJSON=True):
		"""
		Return all records
		"""

		# Check the table 
		if not docName in self.tables:
			return self.sendError("Table %s not found!" % docName)

		# Get table
		tab = self.tables[docName]

		# Check priviledges
		if not (tab['read'] is None) and not self.user.inGroups(tab['read']):
			return self.sendError("You are not authorized to access table %s" % docName)

		# Query table
		MODEL = tab['model']

		# Build where query
		whereFirst = True
		whereQuery = None
		for k,v in docQuery.iteritems():

			# Query component
			com = (getattr(MODEL,k) == v)

			# Create or append
			if whereFirst:
				whereFirst = False
				whereQuery = com
			else:
				whereQuery &= com

		# Get all records
		ans = []
		for record in MODEL.select().where(whereQuery):

			# Serialize document
			ans.append( self.serialize( MODEL, record, expandJSON=expandJSON ) )

		# Send data
		self.sendResponse({
			"status": "ok",
			"docs": ans
			})


	def handleAction(self, action, param):
		"""
		Handle database actions
		"""
		
		if action == "table.get":
			self.get_table_record(param['table'], param['index'])

		elif action == "table.set":
			self.update_table_record(param['table'], param['index'], param['doc'])

		elif action == "table.all":
			self.get_all_records(param['table'])

		elif action == "table.find":
			self.find_records(param['table'], param['query'])
