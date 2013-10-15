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

import zlib
import json
import urllib
from base64 import b64encode

"""
Hugedata Class

This class provides an interface of managing huge data structures. It is currently
used by the interface-updating mechanism, where many histograms needs to be pushed 
to the client.
"""
class Hugedata:

	"""
	Compress huge data for javascript use

	This function does the following:

		1. Convers the given dictionary/array structure into a JSON array
		2. Compresses it with gzip encoding
		3. Optionally encodes it in Base64

	The data structure can be converted back to array using the jsxcompressor.js library.
	"""
	@staticmethod
	def jsCompress(hugedat, encode=True):

		# Convert dictionary into a json string
		json_data = json.dumps(hugedat)

		# GZip data
		gz_data = zlib.compress(urllib.quote(json_data), 9)

		# Base64-encode if specified
		if encode:
			return b64encode(gz_data)
		else:
			return gz_data
