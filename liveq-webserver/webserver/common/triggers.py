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

class TriggerCache:

	#: Trigger tree
	TRIGGER_TREE = {}

	#: Trigger
	TRIGGER_NODES = []

	@staticmethod
	def update():
		"""
		Update trigger cache
		"""
		pass

class TriggerHandlers:

	def book_read(self, book=0):
		"""
		Handle book read
		"""
		pass

class Triggers:

	def __init__(self, user):
		"""
		Initialize the triggers class
		"""

		# Keep a reference to the database user
		self.user = user

	def trigger(self, name, **kwargs):
		"""
		Trigger the specified trigger with the appropriate arguments
		"""

		# When a value change enable estimation 
		if name == "tuning.values.change":

			# Enable interpolation option
			if not self.user.hasConfigEnabled("sim-interpolate"):
				self.user.enableConfig("sim-interpolate")	

		elif name == "tuning.values.estimate":

			# Enable interpolation option
			if not self.user.hasConfigEnabled("sim-validate"):
				self.user.enableConfig("sim-validate")	

				# Trigger video introduction
				print ">>> >SENDING TUTORIAL"
				self.user.userEvents.send({
					"type"  : "tutorial",
					"name"	: "general.action.estimate"
					})
