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

import logging
import struct
import numpy as np
import base64

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

def packFile(fname, pad=8, missing=""):
	"""
	Return the contents of the given file, padded to the specified length
	"""

	# Read file buffer
	buf = ""
	try:
		# Try to read file
		with open(fname, "rb") as f:
			buf = f.read()
	except IOError as e:
		logging.warn("Error while packing file %s! Using placeholder" % fname)
		# File not exist, replace with missing buffer
		buf = missing

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

	C:\\Users\\icharala\\Local\\Develop\\Work\\LiveQ\\dat.local\\ee\\zhad\\T\\aleph1\\91.2\\ALEPH_2004_S5765862.dat
	"""

	# Start with histogram name
	buf = packString( histo.name )

	# Continue with histogram header (8 bytes)
	buf += struct.pack("<IBBBB", histo.bins, 0,0,0,0 )

	# Combine all numpy buffers
	npBuf = np.concatenate([
			histo.y, histo.yErrPlus, histo.yErrMinus,
			histo.x, histo.xErrPlus, histo.xErrMinus
		])

	# Reshape array so the values are interleaved per bin,
	# like this: y, yErrPlus, yErrMinus, x, xErrPlus, xErrMinus
	npBuf = np.reshape(npBuf, (6, histo.bins))
	npBuf = np.swapaxes(npBuf, 0, 1).flatten()

	# Dump numpy buffer
	buf += str(np.getbuffer(npBuf))

	# Return buffer
	return buf

def packDescription(desc):
	"""
	Pack a histogram description, as obtained from HistoDescriptionLab.describeHistogram
	"""

	# Pack histogram ID
	buf = packString( desc['id'] )

	# Pack histogram name
	buf += packString( desc['title'] )

	# Pack observable description
	buf += packString( desc['observable'] )

	# Pack group name
	buf += packString( desc['group'] )

	# Pack Title,X,Y pngs
	buf += packFile( desc['files']['title'] )
	buf += packFile( desc['files']['xlabel'] )
	buf += packFile( desc['files']['ylabel'] )

	# Pack reference histogram
	refHisto = Histogram.fromFLAT( desc['files']['ref'] )
	buf += packHistogram( refHisto )

	# Return buffer
	return buf


