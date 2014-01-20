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

from liveq.data.histo import Histogram

def packString(string, pad=8):
	"""
	Return a size-prefixed string, padded to the specified length
	"""

	# Prepare buffer
	buf = struct.pack("<H", len(string)) + string

	# Calculate and append require pad for pad-size alignment
	padSize = len(buf) % pad
	if padSize > 0:
		buf += "\x00" * (pad-padSize)

	# Return buffer
	return buf

def packFile(fname, pad=8):
	"""
	Return the contents of the given file, padded to the specified length
	"""

	# Read file buffer
	buf = ""
	with open(fname, "rb") as f:
		buf = f.read()

	# Prefix length
	buf = struct.pack("<I", len(buf)) + buf

	# Calculate and append require pad for pad-size alignment
	padSize = len(buf) % pad
	if padSize > 0:
		buf += "\x00" * (pad-padSize)

	# Return buffer
	return buf

def packHistogram(histo):
	"""
	Serialize historgram so it can be optimally streamed to the browser.

	Note: This function ensure 64-bit alignment of the data.
	"""

	# Start with histogram name
	buf = packString( histo.name )

	# Continue with histogram header (8 bytes)
	buf += struct.pack("<IBBBB", histo.bins, 0,0,0,0 )

	# Combine all numpy buffers
	tp = np.array([], dtype=np.float64)
	npBuf = np.concatenate([
			tp, # This blank array will be used for type reference
			histo.y, histo.yErrPlus, histo.yErrMinus,
			histo.x, histo.xErrPlus, histo.xErrMinus
		])

	# Dump numpy buffer
	buf += str(np.getbuffer(npBuf))

	# Return buffer
	return buf

def packDescription(id, desc, path="/Users/icharala/Develop/LiveQ/tools/ref.local"):
	"""
	Pack a histogram description
	"""

	# Pack histogram ID
	buf = packString(id)

	# Pack histogram name
	buf += packString( desc[7] )

	# Pack Title,X,Y pngs
	buf += packFile( "%s/tex/%s.png" % (path, desc[9]) )
	buf += packFile( "%s/tex/%s-x.png" % (path, desc[9]) )
	buf += packFile( "%s/tex/%s-y.png" % (path, desc[9]) )

	# Pack reference histogram
	refFile = "%s/ref/%s" % (path, desc[8])
	refHisto = Histogram.fromFLAT( refFile )
	buf += packHistogram( refHisto )

	# Return buffer
	return buf


