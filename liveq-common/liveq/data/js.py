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
import json

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
	"""

	# Start with histogram name
	buf = packString( histo.name )

	# Get number of events from histogram metadata
	nevts = 0
	if 'nevts' in histo.meta:
		nevts = int(histo.meta['nevts'])

	# Continue with histogram header (8 bytes)
	buf += struct.pack("<II", histo.bins, nevts )

	# Combine all numpy buffers into a multi-dimentional array
	npBuf = np.array([
			histo.y, histo.yErrPlus, histo.yErrMinus,
			histo.x, histo.xErrPlus, histo.xErrMinus
		])

	# Reshape array so the values are interleaved per bin,
	# like this: y, yErrPlus, yErrMinus, x, xErrPlus, xErrMinus
	npBuf = np.swapaxes(npBuf, 0, 1).flatten()

	# Dump numpy buffer
	buf += str(np.getbuffer(npBuf))

	# Return buffer
	return buf

def packDescription(desc):
	"""
	Pack a histogram description, as obtained from HistoDescriptionLab.describeHistogram
	"""

	# Create a copy only with the useful info
	uDesc = dict(desc)
	del uDesc['files']

	# Pack the useful info dictionary
	buf = packString( json.dumps(uDesc) )

	# Pack Title,X,Y pngs
	buf += packFile( desc['files']['title'] )
	buf += packFile( desc['files']['xlabel'] )
	buf += packFile( desc['files']['ylabel'] )

	# Pack reference histogram
	refHisto = Histogram.fromFLAT( desc['files']['ref'] )
	buf += packHistogram( refHisto )

	# Return buffer
	return buf


