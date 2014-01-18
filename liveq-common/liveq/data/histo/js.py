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

import struct
import numpy as np

def _strPack(string, lenType="B"):
	"""
	Return a size-prefixed string
	"""
	# Length-prefixed string (up to 255 chars)
	return struct.pack("!%s" % lenType, len(string)) + string

def packHistogram(histo, descriptor):
	"""
	Serialize historgram so it can be optimally streamed to the browser.
	"""

	# Prepare metadata
	meta = [ histo.bins ]
	meta += descriptor.describe( histo ).values()

	# Combine all numpy buffers
	tp = np.array([], dtype=np.float64)
	npBuf = np.merge([
			tp, # This blank array will be used for type reference
			histo.y, histo.yErrPlus, histo.yErrMinus,
			histo.x, histo.xErrPlus, histo.xErrMinus
		])

	# Dump numpy buffer
	buf = str(np.getbuffer(npBuf))

	# Return buffer
	return (meta, buf)
