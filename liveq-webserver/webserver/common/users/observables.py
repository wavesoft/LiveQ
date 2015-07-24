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

class HLUser_Observables:

	def getObservableDetails(self, observableList):
		"""
		Return details for the user regarding one or more observables
		"""

		# Convert to list if not already
		if (type(observableList) is str) or (type(observableList) is unicode):
			observableList = [observableList]

		# Get known observables
		knownTunables = self.getKnownTunables()

		# Get all records
		ans = []
		for record in Observable.select().where( Observable.name << observableList ):

			# Get correlated histograms
			correlations = [ ]
			for corr in TunableToObservable.select() \
				.where( TunableToObservable.observable == record.name ) \
				.order_by( TunableToObservable.importance.desc() ):

				# Skip unknown tunables
				if not corr.tunable in knownTunables:
					continue

				# Get correlation
				correlations.append( corr.serialize() )

			# Serialize record
			doc = record.serialize()
			doc['correlations'] = correlations
			ans.append(doc)

		# Send data
		return ans


