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

from peewee import fn, JOIN_LEFT_OUTER

from webserver.models import *
from webserver.common.users.exceptions import HLUserError

class HLUser_Team:


	def requestToJoinTeam(self, team_id):
		"""
		Switch user membership to the specified team
		"""

		# Create membership if missing
		if not self.teamMembership:
			self.teamMembership = TeamMembers.create(
				user=self.dbUser,
				status=TeamMembers.USER,
				)

		# Update membership
		self.teamMembership.team = team_id
		self.teamMembership.save()

		# Cache details
		self.teamID = self.teamMembership.team.id
		self.resourceGroup = self.teamMembership.team.agentGroup

		# Send notification
		self.userEvents.send("alert", {
			"type"   : "info",
			"title"  : "Changed Team",
			"message": "You are now member of the team <strong>%s</strong>" % self.teamMembership.team.name
			})

		# Inform server that the profile has changed
		self.userEvents.send("server", {
			"event"	 : "profile.changed"
			})

	def getTeamListing(self):
		"""
		Return list of all teams
		"""

		# Scan all teams
		ans = []
		for t in Team \
			.select(
				Team,
				fn.Count( TeamMembers.id ).alias("members"),
				fn.Count( Paper.id ).alias("papers")
			) \
			.join( TeamMembers, JOIN_LEFT_OUTER) \
			.switch( Team ) \
			.join( Paper, JOIN_LEFT_OUTER) \
			.group_by( Team.id ) \
			.dicts():

			# Collect team
			ans.append(t)

		# Return teams
		return ans

	def getTeamResources(self):
		"""
		Query all worker nodes of our current team
		"""

		# This only works if member of team
		if self.resourceGroup is None:
			return []

		# Collect relevant agents
		ans = []
		for p in Agent \
			.select(
				Agent, AgentMetrics
			) \
			.join( AgentMetrics ) \
			.where( Agent.group == self.resourceGroup ) \
			.where( Agent.state == 1 ) \
			.dicts():

			# Append additional information
			ans.append(p)

		# Return answer
		return ans

	def getTeamCitedPapers(self):
		"""
		Get papers team has cited
		"""

		# This only works if member of team
		if self.teamMembership is None:
			return []

		# Collect relevant papers
		ans = []
		for p in PaperCitation.select().where( PaperCitation.team == self.teamMembership.team ):

			# Append additional information
			book = p.citation.serialize()
			book['citations'] = p.countCitations()
			book['team_name'] = p.team.name
			book['fit_formatted'] = "%.4f" % p.fit
			ans.append( book )

		# Return answer
		return ans

	def getTeamDetails(self, team_id=None):
		"""
		Return details for the specified team
		"""

		# Use user's team if team_id is missing
		if team_id is None:

			# This only works if member of team
			if self.teamMembership is None:
				return None

			# Get user
			team = self.teamMembership.team

		else:

			# Get team
			try:
				team = Team.get( Team.id == team_id )
			except Team.DoesNotExist:
				raise HLUserError("The specified team does not exist", "not-exist")

		# Get members
		myMembershipState = 0
		members = []
		for member in TeamMembers.select( 
				TeamMembers,
				User.displayName, 
				User.points, 
				User.totalPoints, 
				User.id
			).where( TeamMembers.team == team ).join( User ):

			# Collect members
			members.append({
				"id": member.user.id,
				"name": member.user.displayName,
				"points": member.user.points,
				"totalPoints": member.user.totalPoints,
				"papers": member.user.countPapers(),
				})

			# Check if I am part of this membership
			if member.user.id == self.id:
				myMembershipState = member.status

		# Serialize team
		team_dict = team.serialize()
		team_dict['members'] = members

		# Select options
		team_dict['is_moderator'] = False
		team_dict['is_admin'] = False
		team_dict['is_owner'] = False
		if myMembershipState >= 1:
			team_dict['is_moderator'] = True
		if myMembershipState >= 2:
			team_dict['is_admin'] = True
		if myMembershipState >= 3:
			team_dict['is_owner'] = True

		return team_dict


	def getTeamPapers(self):
		"""
		Return the full list of team papers
		"""

		# This only works if member of team
		if self.teamMembership is None:
			return []

		# Collect relevant papers
		ans = []
		for p in Paper.select().where(
				((Paper.team == self.teamMembership.team) & (Paper.status << [ Paper.PUBLISHED, Paper.TEAM_REVIEW ]))
			  & (Paper.owner != self.dbUser)
			):

			# Append additional information
			book = p.serialize()
			book['citations'] = p.countCitations()
			book['fit_formatted'] = "%.4f" % p.fit
			ans.append( book )

		# Return
		return ans

