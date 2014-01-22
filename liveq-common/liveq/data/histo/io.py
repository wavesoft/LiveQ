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
import base64
import pylzma
import numpy as np
import cPickle as pickle

from liveq.data.histo.collection import HistogramCollection
from liveq.data.histo import Histogram

def packHistogram(histo):
	"""
	Pack the given histogram into a binary stream that can be sent over network
	"""

	# Split to two buffers: numpy and metadata
	buf_numpy = str(np.getbuffer(np.concatenate([
			histo.y, histo.yErrPlus, histo.yErrMinus,
			histo.x, histo.xErrPlus, histo.xErrMinus
		])))
	buf_meta = str(pickle.dumps({
			'bins': histo.bins,
			'name': histo.name,
			'meta': histo.meta
		}))

	# Combine two buffers and return
	return struct.pack("<BII", 1, len(buf_numpy), len(buf_meta)) + buf_numpy + buf_meta

def packHistogramCollection(collection, encode=False, compress=False):
	"""
	Pack a collection of histograms
	"""

	# Prepare header of the buffer
	buf = struct.pack("<BI", 1, len(collection))

	# Place histograms
	for h in collection:
		buf += packHistogram(h)

	# Compress if asked
	if compress:
		buf = pylzma.compress(buf)
	# Encode if asked
	if encode:
		buf = base64.b64encode(buf)

	# Return buffer
	return buf

def unpackHistogram(buf, offset=0):
	"""
	Extract a histogram from the given buffer
	"""

	# Read header
	(var, lenNumpy, lenMeta) = struct.unpack("<BII", buf[offset:offset+9])
	p = offset+9

	# Extract numpy buffer
	values = np.frombuffer( buf[p:p+lenNumpy] , dtype=np.float64)
	p += lenNumpy

	# Extract metadata dictionary
	meta = np.loads( buf[p:p+lenMeta ]) 
	p += lenMeta

	# Count the length of each numpy chunk
	csize = len(values) / 6

	# Return histogram
	return (
			# Return histogram instance
			Histogram(
				bins=meta['bins'],
				name=meta['name'],
				meta=meta['meta'],
				y=values[:csize],
				yErrPlus=values[csize:csize*2],
				yErrMinus=values[csize*2:csize*3],
				x=values[csize*3:csize*4],
				xErrMinus=values[csize*4:csize*5],
				xErrPlus=values[csize*5:csize*6]
			),
			# And the number of bytes used from buffer
			p
		)

def unpackHistogramCollection(buf, decode=False, decompress=False):
	"""
	Unpack a collection of histograms
	"""

	# Dencode if asked
	if decode:
		buf = base64.b64decode(buf)
	# Deompress if asked
	if decompress:
		buf = pylzma.decompress(buf)

	# Read header
	(ver, numHistograms) = struct.unpack("<BI", buf[:5])
	p = 5

	# Start piling histograms
	hc = HistogramCollection()
	for i in range(0,numHistograms):

		# Read histogram and offset position
		(histo, p) = unpackHistogram(buf,p)

		# Append histogram in collection
		hc.append( histo )

	# Return collection
	return hc

