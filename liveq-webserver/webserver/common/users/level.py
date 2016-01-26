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

from webserver.models import *
from webserver.common.users.exceptions import HLUserError

class HLUser_Level:
	"""
	Level-related API to the Users Class
	"""
	
	def getLevels(self):
		"""
		Return a list of Level objects, along with it's status information
		from the Level query
		"""

		# Fetch all levels
		levels = Level.select().order_by('order')[:]

		# Prepare query
		query = UserLevel.select().where(UserLevel.user == self.dbUser)
		if levels:
			query = query.where( UserLevel.level << levels )

		# Compile user-levels lookup table
		user_state = { }
		for l in query:
			user_state[l.level.id] = l

		# Calculate level index
		index = 1

		# Compile a unified response
		response = []
		for l in levels:

			# Serialize record
			r = l.serialize()
			r['status'] = None

			# Update level index
			r['index'] = index
			index += 1

			# Check if we have a user status
			if l.id in user_state:
				r['status'] = user_state[l.id].serialize()

			# Store in responses
			response.append(r)

		# Return level
		return response

	def getLevelDetails(self, level):
		"""
		Compile and return level details
		"""

		# Get level configuration
		try:
			level = Level.get( Level.id == level )
		except Level.DoesNotExist:
			raise HLUserError("The specified error does not exists!", "not-exists")

		# Check were to focus
		focusTun = level.getFocusTunables()

		# Get tunables
		tunObjects = []
		tunDict = {}
		tunNames = level.getTunables()
		if tunNames:

			# Fast access on database using 'for X in Y'
			for tun in Tunable.select().where( Tunable.name << tunNames ).dicts():
				tun['focus'] = tun['name'] in focusTun
				tunDict[tun['name']] = tun

			# Correct ordering of the items
			for n in tunNames:
				tunObjects.append( tunDict[n] )

		# Collect level details
		return {
			'index'   : level.id,
			'tunables': tunObjects,
			'features': level.getFeatures(),
			'title'	  : level.title,
			'desc'    : level.desc,
			'ref'	  : level.reference,
		}

	def handleJobCompletion(self, job):
		"""
		Handle the fact that a job just completed
		"""

		# Get root level details
		try:
			level = Level.get( Level.id == job.level_id )
		except Level.DoesNotExist:
			self.logger.warn("Could not find level #%i!" % level.id)
			return

		# Get/Create user state of specific level
		try:
			userLevel = UserLevel.get( 
				UserLevel.level == level, 
				UserLevel.user == self.dbUser
			)
		except UserLevel.DoesNotExist:
			userLevel = UserLevel.create(
					user=self.dbUser,
					level=level,
				)

		# Get last fit
		scoreBefore = userLevel.score

		# If there was no previous fit, assume it
		# was a bad number
		if not scoreBefore:
			scoreBefore = 10000000000

		# Calculate fit on known observables
		jobMeta = job.getResultsMeta()
		scoreAfter = scoreBefore
		if 'levelscore' in jobMeta:
			scoreAfter = jobMeta['levelscore']

		# Check the level score 
		stars = 0
		msgTitle = "Simulation Completed"
		msgText = "You are still far from what scientists have already discovered."
		msgIcon = "bad.png"

		# Check for the unlock flag tha controls the animation
		firstStarAnimation = False

		if scoreAfter < 1.0:
			stars = 3
			msgText = "You might have actually found something new!"
			msgIcon = "perfect.png"
		elif scoreAfter < 2.0:
			stars = 2
			msgText = "Your results are in aggreement with what scientists see."
			msgIcon = "good.png"
		elif scoreAfter < 4.0:
			stars = 1
			msgText = "You are close to what scientists have discovered."
			msgIcon = "fair.png"

		# Update level only on better cases
		if scoreAfter < scoreBefore:

			# Unlock flag is set only if new levels is > 0
			# and previous was 0 
			if (userLevel.status == 0) and (stars > 0):
				firstStarAnimation = True

			# Give points exponentially according to how many levels we jumped since last time
			if stars > 0:
				points = pow( 2, stars - userLevel.status ) * 10
				self.earnPoints(points, "for your results")

			# Update score
			userLevel.score = scoreAfter
			userLevel.status = stars
			userLevel.job_id = job.id
			userLevel.save()

			# Append details
			msgText += "<br /><em color=\"color: #CCC\">You scored better <br />than before!</e>"

		else:

			# Otherwise give points only on successful completions
			if job.status == JobQueue.COMPLETED:
				self.earnPoints(2, "for completing a simulation")

			# Append details
			msgText += "<br /><em color=\"color: #CCC\">You scored worse <br />than before!</e>"

		# Prepare what to pass to the 'unlock' paraemeter
		unlockValue = None
		if firstStarAnimation:
			unlockValue = level.id

		# Send notification
		self.userEvents.send("simulation_results", {
			"icon"    		: "models/%s" % msgIcon,
			"title"   		: msgTitle,
			"message" 	 	: msgText,
			"unlocks_level" : unlockValue,
			})


		# fitAfter = 0.0
		# fitCount = 0
		# if 'fitscores' in jobMeta:

		# 	# Get level observables
		# 	observables = level.getObservables()

		# 	# Collect only known histograms
		# 	for k,v in jobMeta['fitscores'].iteritems():
		# 		if k in observables:
		# 			if v > 0.0:
		# 				fitAfter += v
		# 				fitCount += 1

		# 	# Average
		# 	fitAfter /= fitCount
		# else:
		# 	fitAfter = job.fit

		# Import properties into the paper
		# paper.fit = fitAfter
		# paper.job_id = job.id

		# # Import tunbles from the job
		# paper.setTunableValues( job.getTunableValues() )

		# # Check for better score
		# if fitAfter < fitBefore:

		# 	# Update best fit
		# 	paper.bestFit = fitAfter

		# 	# Check which cases are we in
		# 	if (fitAfter < 1.0) and ((fitBefore >= 1.0) and (fitBefore <= 4.0)):

		# 		# 4.0 -> 1.0 Great [Give extra 20 points]

		# 		# Give 20 points
		# 		self.earnPoints(20, "for a perfect match")

		# 		# Send analytics helper
		# 		self.userEvents.send("analytics", {
		# 			"id"     : "tuning.values.validate",
		# 			"data"	 : {
		# 				"fit": fitAfter,
		# 				"lastFit": fitBefore,
		# 				"status": "not-good"
		# 				}
		# 			})

		# 		# Send notification
		# 		self.userEvents.send("alert", {
		# 			"type"   : "flash",
		# 			"icon"   : "models/good.png",
		# 			"title"  : "Perfect Match",
		# 			"message": "Your simulation scored <em>%.4f</em>, which is better than your previous attempt!" % fitAfter
		# 			})

		# 	elif (fitAfter < 1.0) and (fitBefore > 4.0):

		# 		# +4.0 -> 1.0 Superb [Give 30 points]

		# 		# Give 20 points
		# 		self.earnPoints(30, "for a perfect match, right away!")

		# 		# Send analytics helper
		# 		self.userEvents.send("analytics", {
		# 			"id"     : "tuning.values.validate",
		# 			"data"	 : {
		# 				"fit": fitAfter,
		# 				"lastFit": fitBefore,
		# 				"status": "perfect"
		# 				}
		# 			})

		# 		# Send notification
		# 		self.userEvents.send("alert", {
		# 			"type"   : "flash",
		# 			"icon"   : "models/perfect.png",
		# 			"title"  : "Perfect Match",
		# 			"message": "Your simulation scored <em>%.4f</em>, right away! That's amazing!" % fitAfter
		# 			})

		# 	elif (fitAfter < 1.0):

		# 		# <1.0 to a better <1.0? [Give 5 points]

		# 		# Give 5 points
		# 		self.earnPoints(5, "for a better match!")

		# 		# Send analytics helper
		# 		self.userEvents.send("analytics", {
		# 			"id"     : "tuning.values.validate",
		# 			"data"	 : {
		# 				"fit": fitAfter,
		# 				"lastFit": fitBefore,
		# 				"status": "good"
		# 				}
		# 			})

		# 		# Send notification
		# 		self.userEvents.send("alert", {
		# 			"type"   : "flash",
		# 			"icon"   : "models/good.png",
		# 			"title"  : "Amazing!",
		# 			"message": "You got even better on your already perfect score, with <em>%.4f</em>" % fitAfter
		# 			})

		# 	elif (fitAfter < 4.0) and (fitBefore >= 4.0):

		# 		# +4.0 -> 4.0 Good [Give 10 points]

		# 		# Give 20 points
		# 		self.earnPoints(10, "for a good match")

		# 		# Send analytics helper
		# 		self.userEvents.send("analytics", {
		# 			"id"     : "tuning.values.validate",
		# 			"data"	 : {
		# 				"fit": fitAfter,
		# 				"lastFit": fitBefore,
		# 				"status": "fair"
		# 				}
		# 			})

		# 		# Send notification
		# 		self.userEvents.send("alert", {
		# 			"type"   : "flash",
		# 			"icon"   : "models/fair.png",
		# 			"title"  : "Good Match",
		# 			"message": "Your simulation scored <em>%.4f</em>, which is a really good result." % fitAfter
		# 			})

		# 	elif (fitAfter < 4.0):

		# 		# <4.0 to a better <4.0? [Give 2 points]

		# 		# Give 2 points
		# 		self.earnPoints(2, "for a better match!")

		# 		# Send analytics helper
		# 		self.userEvents.send("analytics", {
		# 			"id"     : "tuning.values.validate",
		# 			"data"	 : {
		# 				"fit": fitAfter,
		# 				"lastFit": fitBefore,
		# 				"status": "could-be-better"
		# 				}
		# 			})

		# 		# Send notification
		# 		self.userEvents.send("alert", {
		# 			"type"   : "flash",
		# 			"icon"   : "models/fair.png",
		# 			"title"  : "Good Match",
		# 			"message": "Your simulation scored <em>%.4f</em>. Can you bring it below <em>1.000</em>?" % fitAfter
		# 			})

		# 	else:

		# 		# Send analytics helper
		# 		self.userEvents.send("analytics", {
		# 			"id"     : "tuning.values.validate",
		# 			"data"	 : {
		# 				"fit": fitAfter,
		# 				"lastFit": fitBefore,
		# 				"status": "bad"
		# 				}
		# 			})

		# 		# Send notification
		# 		self.userEvents.send("alert", {
		# 			"type"   : "flash",
		# 			"icon"   : "models/bad.png",
		# 			"title"  : "Bad Match",
		# 			"message": "Your simulation scored <em>%.4f</em>. You need to bring this below <em>4.000</em>." % fitAfter
		# 			})

		# else:

		# 	# Send analytics helper
		# 	self.userEvents.send("analytics", {
		# 		"id"     : "tuning.values.validate",
		# 		"data"	 : {
		# 			"fit": fitAfter,
		# 			"lastFit": fitBefore,
		# 			"status": "not-better"
		# 			}
		# 		})

		# 	# Send notification
		# 	self.userEvents.send("alert", {
		# 		"type"   : "flash",
		# 		"icon"   : "models/acceptable.png",
		# 		"title"  : "Not good",
		# 		"message": "Your simulation scored <em>%.4f</em> which is not better than the current best score of <em>%.4f</em>." % (fitAfter, fitBefore)
		# 		})

		# # Save paper
		# paper.save()


