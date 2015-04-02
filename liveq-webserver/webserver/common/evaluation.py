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

from webserver.common.users import HLUser
from webserver.models import Questionnaire, QuestionnaireResponses

class UserEvaluation:
	"""
	User evaluation controller
	"""

	def __init__(self, user):
		"""
		Initialize user evaluation record
		"""

		# Get the HLUser record
		self.user = user

	def getQuestions(self, questionnaire=1):
		"""
		Get the evaluation questions
		"""

		# Load questionnaire
		try:
			q = Questionnaire.get( Questionnaire.id == questionnaire )
		except Questionnaire.DoesNotExist:
			raise HLError("Such questionnaire does not exist in the database!" "not-exists")

		# Return questions from the questionnaire
		return q.getQuestions()

	def handleAnswers(self, answers, questionnaire=1):
		"""
		Handle evaluation answers
		"""
		
		# Create entry
		r = QuestionnaireResponses.create(
			user=self.user.dbUser,
			to=questionnaire
			)

		# Append responses
		r.setResponses( answers )
		
		# Save
		r.save()

