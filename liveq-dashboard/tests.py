#!/usr/bin/python
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

# ----------
import sys
sys.path.append("../liveq-common")
# ----------

import time
import socket
import select

import pprint
from liveq.reporting.lars import *

class LARSHeartbeatMonitor:

	def __init__(self, collector, key, timeout=DEFAULT_HB_INTERVAL, timeoutOverdrift=10):
		"""
		"""

		# Store collector and key
		self.timeout = timeout
		self.timeoutOverdrift = timeoutOverdrift
		self.collector = collector
		self.key = key

		# Reset times
		self.lastPulse = collector.get("%s/keepalive/time" % self.key, time.time())
		self.active = collector.get("%s/keepalive/active" % self.key, False)

	def start(self):
		"""
		Turn on heartbeat monitor and flag as active
		"""

		# Update local variables
		self.active = True
		self.lastPulse = time.time()

		# Update parameters on collector
		self.collector.set("%s/keepalive/active" % self.key, True)
		self.collector.set("%s/keepalive/time" % self.key, time.time())

	def stop(self):
		"""
		Turn off heartbeat monitor and flag as inactive
		"""

		# Update local variables
		self.active = False

		# Update parameters on collector
		self.collector.set("%s/keepalive/active" % self.key, False)

	def pulse(self, sequence):
		"""
		Update pulse
		"""

		# Make sure we are active
		if not self.active:
			self.active = True
			self.collector.set("%s/keepalive/active" % self.key, True)

		# Update timestamp
		self.lastPulse = time.time()
		self.collector.set("%s/keepalive/time" % self.key, time.time())

	def check(self):
		"""
		Check if we have expired
		"""

		# If we are active, check for timeout
		if self.active:
			if time.time() > self.lastPulse + self.timeout + self.timeoutOverdrift:
				self.active = False
				self.collector.set("%s/keepalive/active" % self.key, False)

class LARSStorage:

	def getIndex(self):
		"""
		Return a dictionary with the key structures in the store
		"""
		raise NotImplementedError("LARS storage getIndex() function not implemented")

	def setIndex(self, index):
		"""
		Update the index dictionary
		"""
		raise NotImplementedError("LARS storage setIndex() function not implemented")

	def set(self, key, value):
		"""
		Update key value
		"""
		raise NotImplementedError("LARS storage set() function not implemented")

	def get(self, key, value):
		"""
		Return the key value
		"""
		raise NotImplementedError("LARS storage get() function not implemented")

	def has(self, key):
		"""
		Check if the store contains the given key
		"""
		raise NotImplementedError("LARS storage has() function not implemented")

class LARSMemoryStorage(LARSStorage):

	def __init__(self):
		"""
		Initialize keys
		"""

		#: Memory key/value store
		self.keys = { }

	def getIndex(self):
		"""
		Return the stored index
		"""
		return self.get("@index", {})

	def setIndex(self, index):
		"""
		Update the stored index
		"""
		self.set("@index", index)

		# Index updated
		pprint.pprint(index)

	def set(self, key, value):
		"""
		Update item key
		"""
		self.keys[key] = value

	def get(self, key, default=None):
		"""
		Fetch key value
		"""

		# Return default if missing
		if not key in self.keys:
			return default

		# Return key value
		return self.keys[key]

	def has(self, key):
		"""
		Check if the specified key exists in the key database
		"""

		return key in self.keys

class LARSCollector:

	def __init__(self, storage=None):
		"""
		Initialize LARS collector
		"""

		# The storage class where the data I/O occurs
		self.storage = storage

		# The list of heartbeats in the map
		self.heartbeats = { }

	def set(self, key, value):
		"""
		Update the value of the given key
		"""

		# If we are creating a new key, update tree mapping
		if not self.storage.has(key):

			# Create missing nodes
			node = self.storage.getIndex()
			index = node
			parts = key.split("/")
			for p in parts:
				if not p in node:
					node[p] = {}
				node = node[p]

			# Update index
			self.storage.setIndex(index)

		# Update key value
		self.storage.set(key, value)

		print "       -->  %s=%s" % (key, value)

	def get(self, key, default=None):
		"""
		Return the value of the given key, using the default value given if missing
		"""

		# Get key from storage
		return self.storage.get(key, default)

	def handleInput(self, alias, action, key, value):
		"""
		Handle input from the specified
		"""

		if action == ACTION_ATTRIB:
			pass

		elif action == ACTION_SET:
			self.set(key, value)

		elif action == ACTION_ADD:

			# Get previous value
			v = 0
			if not self.storage.has(key):
				try:
					v = int(self.get(key, 0))
				except ValueError:
					pass

			# Add value
			try:
				self.set(key, v + int(value))
			except ValueError:
				pass

		elif action == ACTION_LIST_ADD:

			# Make sure the value is a list
			list_value = self.get(key, [])
			if type(list_value) != list:
				list_value = [list_value]

			# Append on list
			list_value.append(value)
			self.set(key, list_value)

		elif action == ACTION_LIST_REMOVE:

			# Make sure the value is a list
			list_value = self.get(key, None)
			if not list_value:
				return

			# Remove from list
			list_value.remove(value)
			self.set(key, list_value)

		elif action == ACTION_HB_START:

			# Create a heartbeat if we don't have something already
			if not key in self.heartbeats:
				self.heartbeats[key] = LARSHeartbeatMonitor( self, key )

			# Start heartbeat
			self.heartbeats[key].start()

		elif action == ACTION_HB_STOP:

			# Don't do anything if we are don't monitor anything already
			if not key in self.heartbeats:
				return

			# Start heartbeat
			self.heartbeats[key].stop()

		elif action == ACTION_HB_SEND:

			# Create a heartbeat if we don't have something already
			if not key in self.heartbeats:
				self.heartbeats[key] = LARSHeartbeatMonitor( self, key )

			# Start heartbeat
			self.heartbeats[key].pulse( value )

	def process(self):
		"""
		Handle timeouts
		"""

		# Check iteritems
		for k,v in self.heartbeats.iteritems():
			v.check()


class LARSSocket:

	def __init__(self, collector, host="0.0.0.0", port=4545):
		"""
		Setup the socket information
		"""

		# Store collector
		self.collector = collector

		# Setup socket
		self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
		self.sock.bind((host, port))

		# Make it non-blocking
		self.sock.setblocking(0)

		# Aliases for the host/port pairs
		self.aliases = { }

		print "Listening on %s:%i" % (host, port)

	def process(self, timeout=0.5):
		"""
		Process incoming packet
		"""

		# Wait for some data
		ready = select.select([self.sock], [], [], timeout)
		if not ready[0]:
			return

		# Listen 
		data, addr = self.sock.recvfrom(1024)

		# Fetch action
		d_action = ord(data[0]) - 64
		data = data[1:]

		# Split path/value
		d_path = data
		d_value = None
		if "=" in data:
			(d_path, d_value) = data.split("=")

		# Split IP/Port
		(d_ip, d_port) = addr

		# Build an IP:Port string
		d_alias = "%s:%i" % (d_ip, d_port)

		# ====================
		# Log
		# --------------------
		actions = [
				"attrib",
				"set",
				"add",
				"list_add",
				"list_remove",
				"keepalive_start",
				"keepalive_send",
				"keepalive_stop"
			]
		print "[%s] {%s} %s : %s" % (d_ip, actions[d_action], d_path, d_value )
		# ====================

		# Forward to the collector
		self.collector.handleInput( d_alias, d_action, d_path, d_value )


# Initialize LARS Connector
collector = LARSCollector(storage=LARSMemoryStorage())

# Bind a socket on the listener
sock = LARSSocket(collector)

# Start main loop
while True:
	sock.process()
	collector.process()

