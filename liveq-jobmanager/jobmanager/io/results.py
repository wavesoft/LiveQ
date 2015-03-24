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

import os
import cPickle as pickle
import logging

from liveq.data.histo.intermediate import IntermediateHistogramCollection
from jobmanager.config import Config

logger = logging.getLogger("results")

def dump(job, histograms):
	"""
	Dump the given histograms relevalt to the specified job
	to the storage directory.
	"""

	# Normalize job ID
	jobID = "job-%s" % str(job.id)

	# Base directory where we are going to dump the data
	dumpPath = "%s/%s.bin" % (Config.RESULTS_PATH, jobID)

	# Dump packed data
	with open(dumpPath, "wb") as f:
		f.write( histograms.pack(encode=False, compress=False) )

def load(job_id):
	"""
	Load results
	"""

	# Normalize job ID
	jobID = "job-%s" % str(job.id)

	# Base directory where we are going to read the data
	dumpPath = "%s/%s.bin" % (Config.RESULTS_PATH, jobID)

	# If we don't have such file, return None
	if not os.path.exists(dumpPath):
		return None

	# Load histograms from file
	with open(dumpPath, "rb") as f:

		# Read payload
		payload = f.read()
		if not payload:
			return None

		# Return collection from pack
		return IntermediateHistogramCollection.fromPack(payload, decode=False, decompress=False)
