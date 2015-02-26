
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

	def get_table_record(self, docName, docIndex, expandJSON=True):
		"""
		Return the given table record
		"""

		# Check the table 
		if not docName in self.tables:
			return sendError("Table %s not found!" % docName)

		# Get table
		tab = self.tables[docName]

		# Check priviledges
		if not (tab['read'] is None) and not self.user.inGroups(tab['read']):
			return sendError("You are not authorized to access table %s" % docName)

		# Query table
		MODEL = tab['model']
		FIELDS = MODEL._meta.get_field_names()

		try:

			# Try to get record
			record = MODEL.get(MODEL.__dict__[tab['index']] == docIndex)

			# Compile document
			document = {}
			for f in FIELDS:
				if (f in MODEL.JSON_FIELDS) and expandJSON:
					if not record.__dict__[f]:
						document[f] = {}
					else:
						document[f] = json.loads(record.__dict__[f])
				else:
					document[f] = record.__dict__[f]

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
			return sendError("Table %s not found!" % docName)

		# Get table
		tab = self.tables[docName]

		# Check priviledges
		if not (tab['write'] is None) and not self.user.inGroups(tab['write']):
			return sendError("You are not authorized to access table %s" % docName)

		# Query table
		MODEL = tab['model']
		FIELDS = MODEL._meta.get_field_names()

		# Fetch or create new record
		try:
			# Try to get record
			record = MODEL.get(MODEL.__dict__[tab['index']] == docIndex)

		except MODEL.DoesNotExist:
			# Allocate new record
			record = MODEL()


		# Update fields
		for f in FIELDS:
			if f in docFields:
				if (f in MODEL.JSON_FIELDS) and expandJSON:
					if not docFields[f]:
						record.__dict__[f] = ""
					else:
						record.__dict__[f] = json.dumps(docFields[f])
				else:
					record.__dict__[f] = docFields[f]

		# Save record
		record.save()

		# Send data
		self.sendResponse({
			"status": "ok"
			})

	def handleAction(self, action, param):
		"""
		Handle database actions
		"""
		
		if action == "table.get":
			self.get_table_record(param['table'], param['index'])

		elif action == "table.set":
			self.update_table_record(param['table'], param['index'], param['doc'])

