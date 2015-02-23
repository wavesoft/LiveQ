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

import tornado.escape
import liveq.data.js as js

from liveq.models import Observable, Tunable

from webserver.common.reference import loadReferenceHistogram
from webserver.common.minimacros import convertMiniMacros

def compileObservableHistoBuffers(histo_ids):
	"""
	Compile a histogram buffer configuration for histograms with the
	specified list of IDs.
	"""

	histoBuffers = []
	for hid in histo_ids:

		# Fetch histogram
		descRecord = {}
		try:

			# Get histogram
			o = Observable.get(Observable.name == hid)

			# Compile description record
			descRecord = {
				'id': hid,

				# Visual information
				'name': o.name,
				'title': o.title,
				'short': o.short,
				'desc': convertMiniMacros(o.desc),
				'book': o.book,
				'group': o.group,
				'subgroup': o.subgroup,

				# Plot asistance
				'title': o.title,
				'titleImg': o.titleImg,
				'labelX': o.labelX,
				'labelXImg': o.labelXImg,
				'labelY': o.labelY,
				'labelYImg': o.labelYImg,
				'logY' : o.logY,

				# Metadata
				'accel' : o.getAccelerators(),
				'analysis': o.analysis,
				'cuts' : o.cuts,
				'params' : o.params,
				'process' : o.process,

			}

		# Raise error if missing
		except Observable.DoesNotExist:
			raise IOError("Could not find assisting information for histogram %s" % hid)

		# Lookup reference histogram
		refHisto = loadReferenceHistogram( hid )
		if not refHisto:
			raise IOError("Could not find reference data for %s" % hid)

		# Compile to buffer and store on histoBuffers array
		histoBuffers.append( js.packDescription( descRecord, refHisto ) )

	return histoBuffers

def compileTunableHistoBuffers(histo_ids):
	"""
	Compile a tunable buffer configuration for tunables with the
	specified list of IDs.
	"""

	# Fetch description for the tunables
	data = []
	for tid in histo_ids:

		# Fetch histogram
		try:

			# Get histogram
			t = Tunable.get(Tunable.name == tid)

			# Prepare record to send to javascript
			data.append({

					# Visual information
					'name': t.name,
					'title': t.title,
					'short': t.short,
					'desc': convertMiniMacros(t.desc),
					'book': t.book,

					# Parameter details
					'type': t.type,
					'opt': t.getOptions(),
					'def': t.default,
					'min': t.min,
					'max': t.max,
					'dec': t.dec,

				})

		# Raise error if missing
		except Tunable.DoesNotExist:
			raise IOError("Could not find assisting information for tunable %s" % tid)

	# Pack tunables in buffer
	return js.packString(tornado.escape.json_encode(data))

