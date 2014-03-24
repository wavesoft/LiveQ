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

import threading
import time

from liveq.reporting.lars import *
from liveq.events import GlobalEvents

def _sanitize(key):
	"""
	Sanitize the given key by replacing invalid characters
	"""

	# Replace slashes and semicolons
	key = key.replace("/", "#")
	key = key.replace("=", "-")
	return key

class LARSGroup:
	"""
	LiveQ LARS Group

	This class addresses a particular path on the LARS
	data tree and provides some basic functionality.
	"""

	def __init__(self, path, alias=None):
		"""
		Initialize a LARS group on the given root path
		"""

		# Prepare path
		self.path = path

		# If we have an alias, store us on the LARS alias store
		if alias:
			LARS.alias[alias] = self

	def openGroup(self, key, alias=None):
		"""
		Open a sub-group on this LARS group
		"""

		# Return a LARSGroup instance
		return LARSGroup( "%s/%s" % (self.path, _sanitize(key)), alias )

	def openEntity(self, key, autoKeepalive=False, interval=DEFAULT_HB_INTERVAL, alias=None):
		"""
		Open a sub-entity on this LARS group
		"""

		# Return a LARSEntry instance
		return LARSEntity( "%s/%s" % (self.path, _sanitize(key)), autoKeepalive, interval, alias )

	def set(self, key, value):
		"""
		Set a value on a key on a LARS tree node
		"""

		# Send SET Message
		LARS.sendMessage( ACTION_SET, "%s/%s" % (self.path, _sanitize(key)) , value)
		return self

	def add(self, key, value):
		"""
		Add a numeric value on the LARS tree node
		"""

		# Send ADD Message
		LARS.sendMessage( ACTION_ADD, "%s/%s" % (self.path, _sanitize(key)) , value)
		return self

	def append(self, key, value):
		"""
		Append a string on a list
		"""

		# Send LIST ADD Message
		LARS.sendMessage( ACTION_LIST_ADD, "%s/%s" % (self.path, _sanitize(key)) , value)
		return self

	def remove(self, key, value):
		"""
		Remove a string from a list
		"""

		# Send LIST REMOVE Message
		LARS.sendMessage( ACTION_LIST_REMOVE, "%s/%s" % (self.path, _sanitize(key)) , value)
		return self


	def event(self, key, name, *args):
		"""
		Send an event on the LARS server
		"""

		# Prepare arguments
		arg_list = [name]
		arg_list += map(str, args)

		# Build value by joining the arguments
		value = ",".join(arg_list)

		# Send EVENT Message
		LARS.sendMessage( ACTION_EVENT, "%s/%s" % (self.path, _sanitize(key)) , value)
		return self


class LARSEntity(LARSGroup):
	"""
	LiveQ LARS Entity

	An entity refers to an object which health status
	is actively monitored.
	"""

	def __init__(self, path, autoKeepalive=False, interval=DEFAULT_HB_INTERVAL, alias=None):
		"""
		Create a new LARS Entity
		"""

		# Initialize the LARS group
		LARSGroup.__init__(self, path)

		# If we have an alias, store us on the LARS alias store
		if alias:
			LARS.alias[alias] = self

		#: The interval between the keepalive transmittions
		self.interval = interval

		# Register on system shutdown
		GlobalEvents.System.on('shutdown', self._onShutdown)

		# Prepare variables
		self.time = 0
		self.seq = 0
		self.active = True

		# Check if we should start an autoKeepalive timer
		if autoKeepalive:

			# Start main thread
			self.thread = threading.Thread(target=self._keepaliveThread)
			self.thread.start()

		# Notify LARS server for keep-alive initiation
		LARS.sendMessage( ACTION_HB_START, self.path, 0 )

	def keepalive(self):
		"""
		Send a keepalive signal to the LARS server
		"""

		# Send a keepalive message to LARS server
		self.seq += 1
		LARS.sendMessage( ACTION_HB_SEND, self.path, self.seq )
		return self

	def _onShutdown(self):
		"""
		Clear the active flag
		"""
		self.active = False

		# Send LARS Keepalive termination
		LARS.sendMessage( ACTION_HB_STOP, self.path, self.seq )

	def _keepaliveThread(self):
		"""
		Main thread that fires keepalive
		"""

		# Infintie loop
		while self.active:

			# Wait keep track of time passed
			time.sleep(0.125)
			self.time += 0.125

			# Send keep alive when the time has passed
			if self.time >= self.interval:

				# Send keepalive
				self.time = 0
				self.keepalive()

