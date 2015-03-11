#!/usr/bin/python
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

# This script imports completed mcplots jobs to interpolation hypercube

import os
import sys
import traceback
import tarfile
import time
import datetime
import glob

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

	try:

		# Open tar file
		f = None
		try:
			# Try to open the tarfile
			f = tarfile.open(tarFile)
		except Exception as e:
			outputQueue.put("!")
			return

		# Get jobdata record from tar archive
		jobDataInfo = None
		try:
			jobDataInfo = f.getmember("./jobdata")
		except Exception as e:
			outputQueue.put("?")
			return

		# Load jobdata
		jobData = None
		try:
			# Open tune config
			jobDataFile = f.extractfile(jobDataInfo)
			jobData = readConfig(jobDataFile)
			jobDataFile.close()
		except Exception as e:
			outputQueue.put("-")
			return

		# Close tarfile
		f.close()

		# Check for required parameters
		if not 'USER_ID' in jobData:
			outputQueue.put("X")
			return

		# Prepare CSV Record
		outputQueue.put(
				".%s,%s,%d,%s,%s,%s" % (
					jobData['USER_ID'], 
					jobData['exitcode'],
					jobDataInfo.mtime, 
					datetime.datetime.fromtimestamp(jobDataInfo.mtime).strftime('%Y-%m-%d %H:%M:%S'),
					jobData['cpuusage'],
					jobData['diskusage']
				)
			)

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
		while not r.ready() or not outputQueue.empty():

			# Get element
			if r.ready():
				# Drain when completed
				q = outputQueue.get(False)
			else:
				# Blocking when running
				q = outputQueue.get(True)

			# Get and log result
			result = q[0]
			sys.stdout.write(result)
			sys.stdout.flush()

			# In case of successful processing, log line
			if result == ".":
				csvFile.write("%s\n" % q[1:])

			# Display progress every once in a while
			numCompleted += 1
			if (numCompleted % 500) == 0:
				sys.stdout.write("[%i%%]" % (int(100*numCompleted/numTotal)))
				sys.stdout.flush()

		# We are completed
		csvFile.close()
		print "\nCompleted!"

	except Exception as e:
		traceback.print_exc()
		print e
