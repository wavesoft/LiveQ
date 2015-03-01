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

from webserver.models import User, KnowledgeGrid

class HLUserError(Exception):
	"""
	An error occured in a high-level user-action
	"""
	def __init__(self, message, code=None):
		self.message = message
		self.code = code
	def __str__(self):
		return repr(self.message)

class HLUser:
	"""
	Collection of high-level operations on the user object
	"""

	def __init__(self, user):
		"""
		Create a new instance of the user object
		"""

		# Keep user object
		self.dbUser = user

		# Preheat user cache
		self.loadCache_Knowledge()

	###################################
	# Cache Loading Functions
	###################################

	def loadCache_Knowledge(self):
		"""
		Build knowledge grid nodes from their ids
		"""

		# Load leaf knowledge grid nodes
		self.leafKnowledge = []
		for leaf_id in self.dbUser.getState('leaf_knowledge', []):

			# Get and store
			try:
				# Collect leaf knowledge
				self.leafKnowledge.append(
						KnowledgeGrid.get( KnowledgeGrid.id == leaf_id )
					)
			except:
				pass

	###################################
	# Cache Updating Functions
	###################################

	def updateCache_Knowledge(self):
		"""
		User the user's knowledge information
		"""

		# Get knowledgeGrid nodes discovered
		kb_ids = self.dbUser.getKnowledge()

		# Iterate over the currently explored knowledge grid features
		feats = KnowledgeGrid.getTotalFeatures( kb_ids )

		# Update knowledge features
		if 'observables' in feats:
			self.dbUser.setState("observables", feats['observables'])
		if 'tunables' in feats:
			self.dbUser.setState("tunables", feats['tunables'])
		if 'parts' in feats:
			self.dbUser.setState("parts", feats['parts'])
		if 'beams' in feats:
			self.dbUser.setState("beams", feats['beams'])
		if 'goals' in feats:
			self.dbUser.setState("goals", feats['goals'])

		# Find next leaf knowledge grid nodes
		self.leafKnowledge = []
		leaf_knowledge_ids = []
		for leaf_node in KnowledgeGrid.select().where(
				 (KnowledgeGrid.parent << kb_ids) &
				~(KnowledgeGrid.ud << kb_ids)
				):

			# Collect them and ID
			self.leafKnowledge.append( leaf_node )
			leaf_knowledge_ids.append( leaf_node.id )

		# Update 'leaf_knowledge' state
		self.dbUser.setState("leaf_knowledge", leaf_knowledge_ids)

	###################################
	# High-level functions
	###################################

	def reload(self):
		"""
		Reload user record from the database
		"""

		# Re-select and get user record
		self.user = User.get( User.id == self.user.id )

	def setVariable(self, group, key, value):
		"""
		Set a user variable in the dynamic variables
		"""
		# Load variable dump
		varDump = json.loads(self.dbUser.variables)

		# Update variable
		if not group in varDump:
			varDump[group] = {}
		varDump[group][key] = value

		# Put back
		self.dbUser.variables = json.dumps(varDump)

		# Save user record
		self.dbUser.save()

	def getVariable(self, group, key, defValue=None):
		"""
		Set a user variable in the dynamic variables
		"""
		# Load variable dump
		varDump = json.loads(self.dbUser.variables)

		# Update variable
		if not group in varDump:
			return defValue
		if not key in varDump[group]:
			return defValue

		# Return
		return varDump[group][key]

	def delVariable(self, group, key):
		"""
		Set a user variable in the dynamic variables
		"""
		# Load variable dump
		varDump = json.loads(self.dbUser.variables)

		# Update variable
		if not group in varDump:
			return
		if not key in varDump[group]:
			return

		# Delete key
		del varDump[group][key]

		# Put back
		self.dbUser.variables = json.dumps(varDump)

		# Save user record
		self.dbUser.save()

	def getKnownObservables(self):
		"""
		Return a list of the histogram IDs that the user
		is aware of. This is used for optimizing the interpolation
		and simulation queries.
		"""

		# Get known histograms state
		return self.dbUser.getState("observables", [])

	def getTriggerActions(self, name):
		"""
		Return the list of actions that will be triggered when
		a trigger with the given name is fired.
		"""

		# Prepare response
		ans = []

		# Look if that triggers a leaf knowledge element
		for kb in self.leafKnowledge:
			if kb.triggerEvent == name:
				ans.append({
						'action': 'knowledge',
						'id': kb.id
					})

		# Return list
		return ans

	def expandKnowledge(self, kgItem):
		"""
		Expand users knowledge by unlocking the specified item
		"""

		# Include item in user's list of knowledges
		self.dbUser.addKnowledge( kgItem )

		# Update knowledge cache
		self.updateCache_Knowledge()

		# Save user record
		self.dbUser.save()

	def spendPoints(self, points=0):
		"""
		Spend the given ammount of science points
		"""

		# If points are zero, do nothing
		if points == 0:
			return

		# Reload user record
		self.reload()

		# Check if we have points
		if self.user.points >= points:

			# Trim and save
			self.user.points -= points
			self.user.save()

		else:
			# Raise error
			raise HLUserError("You don't have enough science points", "not-enough-points")

	def earnPoints(self, points=0):
		"""
		Earn the given ammount of science points
		"""

		# Reload user record
		self.reload()

		# Update and save
		self.user.points += points
		self.user.totalPoints += points

		# Save record
		self.user.save()

	def getProfile(self):
		"""
		Return user profile information
		"""

		# Shorthand for the user property
		user = self.dbUser

		# Compile analytics profile
		analytics = None
		if user.analyticsProfile:
			analytics = {
				'uuid'				: user.analyticsProfile.uuid,
				'gender' 			: user.analyticsProfile.gender,
				'birthYear' 		: user.analyticsProfile.birthYear,
				'audienceSource'	: user.analyticsProfile.audienceSource,
				'audienceInterests'	: user.analyticsProfile.audienceInterests,
				'lastEvent' 		: str(user.analyticsProfile.lastEvent),
				'metrics' 			: json.loads(user.analyticsProfile.metrics),
			}

		# Send user profile
		return {
			'email' 		: user.email,
			'displayName' 	: user.displayName,
			'avatar' 		: user.avatar,
			'points'		: user.points,
			'groups'		: user.groups,
			'vars' 			: json.loads(user.variables),
			'state' 		: json.loads(user.state),
			'analytics'		: analytics
			}

