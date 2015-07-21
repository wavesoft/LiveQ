#!/usr/bin/env python
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

# This script analyses the responses of the histograms to
# the tunable parameters

# ----------
import os
import sys
sys.path.append("%s/liveq-common" % os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
# ----------

import json
import time
import glob
import tarfile
import datetime
import traceback

from liveq.data.histo import Histogram

from multiprocessing import Pool, Manager
from threading import Thread, Lock

def readConfig(fileObject):
	"""
	Read key/value configuration from fileObject
	"""

	# Read all lines
	ans = {}
	for l in fileObject.readlines():
		# Trim newline
		l = l[0:-1]
		# Skip blank lines
		if not l:
			continue
		# Skip invalid lines
		if not '=' in l:
			continue
		# Split on '='
		kv = l.split("=")
		ans[kv[0]] = kv[1]

	# Return 
	return ans

def importFile(args):
	"""
	Open tarfile
	"""

	tarFile = args[0]
	outputQueue = args[1]
	flags = { "valid": False, "jobdata": False, "tunedata": False, "histo": False }

	try:

		# Open tar file
		f = None
		try:
			# Try to open the tarfile
			f = tarfile.open(tarFile)
			flags["valid"] = True
		except Exception as e:
			outputQueue.put({ "flags": flags })
			return

		# Get jobdata record from tar archive
		jobData = None
		try:

			# Open jobdata file
			jobDataInfo = f.getmember("./jobdata")

			# Read file contents
			jobDataFile = f.extractfile(jobDataInfo)
			jobData = readConfig(jobDataFile)
			jobDataFile.close()
			flags["jobdata"] = True

		except Exception as e:
			outputQueue.put({ "flags": flags })
			pass

		# Get generator tune record from tar archive
		tuneData = {}
		try:

			# Load generator tune
			tuneDataInfo = f.getmember("./generator.tune")

			# Open tune config
			tuneDataFile = f.extractfile(tuneDataInfo)
			tuneData = readConfig(tuneDataFile)
			tuneDataFile.close()
			flags["tunedata"] = True

		except Exception as e:
			# Continue even if we didn't find a generator.tune
			sys.stderr.write("Unparsable generator.tune\n")
			sys.stderr.flush()
			pass

		# Load histograms
		histograms = { }
		try:

			# Enumerate all files
			members = f.getmembers()

			# Collect histogram details
			histo_candidate = { }
			histo = [ ]

			# Look for .dat files that are accompanied with the 
			# respective .params file
			for m in members:

				# Wait for matching .dat AND .params file
				if m.name.endswith(".dat") or m.name.endswith(".params"):

					# Strip extension from name
					parts = m.name.split(".")
					baseName = ".".join(parts[0:len(parts)-1])

					# If not candidate, place it
					if not m.name in histo_candidate:
						histo_candidate[baseName] = m

					# If already candidate, we found a histo
					else:

						# If that's the '.dat' file, use this
						# as the histogram. Otherwise get the candidate
						if m.name.endswith(".dat"):
							histo.append( m )
						else:
							histo.append( histo_candidate[baseName] )

						# Delete candidate record
						del histo_candidate[baseName]

			# Load all histograms
			for h in histo:

				# Guard against errors
				try:

					# Load
					histoFile = f.extractfile(h)
					hinst = Histogram.fromFLAT( histoFile )
					histoFile.close()

					# Keep histogram reference
					histograms[hinst.name] = hinst

				except Exception as e:
					sys.stderr.write("Exception loading histogram %s\n" % h.name)
					sys.stderr.flush()
					pass

			# We now have histograms
			flags['histo'] = True

		except Exception as e:
			outputQueue.put({ "flags": flags })
			return


		# Close tarfile
		f.close()

		# Prepare CSV Record
		outputQueue.put({
				'exitcode': jobData['exitcode'],
				'tune': tuneData,
				'histo': histograms,
				'flags': flags
			})

	except Exception as e:
		traceback.print_exc()
		print e
		return

# Run threaded
if __name__ == '__main__':
	try:

		# Ensure we have at least one parameter
		if (len(sys.argv) < 3) or (not sys.argv[1]) or (not sys.argv[2]):
			print "Analyze MCPlot job completion statistics"
			print "Usage:"
			print ""
			print " import-mcplots-interpolation.py <path to mcplots jobs dir> [+]<csv file>"
			print ""
			sys.exit(1)

		# Check if we have directory
		if not os.path.isdir(sys.argv[1]):
			print "ERROR: Could not find %s!" % sys.argv[2]
			sys.exit(1)

		# Get base dir and csv file
		baseDir = sys.argv[1]
		csvFilename = sys.argv[2]

		# Open csv file
		if csvFilename[0] == "+":
			# Append
			csvFile = open(csvFilename[1:], 'a')
		else:
			# Open for writing
			csvFile = open(csvFilename, 'w')
			csvFile.write("User ID,Exit Code (0=Success),Completed at (UNIX Timestamp),Completed at (Readable Date),CPU Usage,Disk Usage\n")

		# Prepare the list of histograms to process
		histogramQueue = glob.glob("%s/*%s" % (baseDir, ".tgz"))
		numCompleted = 0
		numTotal = len(histogramQueue)

		# Create a process manager to serve the output queue
		manager = Manager()
		outputQueue = manager.Queue()

		# Run a pool of 4 workers
		pool = Pool(4)
		r = pool.map_async( 
			importFile, 
			[(x, outputQueue) for x in histogramQueue]
		)

		# Wait all workers to complete and print queue output
		while (not r.ready()) or (not outputQueue.empty()):

			# Get element
			try:
				# Drain when completed
				q = outputQueue.get(False)

			except Exception:
				# Queue is empty, retry in a while
				time.sleep(0.1)
				continue

			# Debug
			numCompleted += 1
			sys.stdout.write("Job %04i/%04i: " % (numCompleted, numTotal))

			# Validate job
			if not q['flags']['valid']:
				sys.stdout.write("invalid\n")
				sys.stdout.flush()
				continue
			if not q['flags']['jobdata']:
				sys.stdout.write("missing jobdata\n")
				sys.stdout.flush()
				continue
			if not q['flags']['tunedata']:
				sys.stdout.write("missing tune data\n")
				sys.stdout.flush()
				continue
			if not q['flags']['histo']:
				sys.stdout.write("missing historams\n")
				sys.stdout.flush()
				continue

			# Process
			sys.stdout.write("ok (%i histos)\n" % len(q['histo']))
			sys.stdout.flush()

		# We are completed
		csvFile.close()
		print "\nCompleted!"

	except Exception as e:
		traceback.print_exc()
		print e
