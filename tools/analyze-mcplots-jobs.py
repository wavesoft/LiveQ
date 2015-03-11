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

from multiprocessing import Pool
from threading import Thread, Lock

# Global progress variables
numTotal = 0
numCompleted = 0

# Create a mutex access to the file
csvLock = Lock()
csvFile = None

def init_vars(numToComplete):
	"""
	Initialize variables
	"""
	global numCompleted
	global numTotal

	numCompleted = 0
	numTotal = numToComplete

def handleResult(result):
	"""
	Handle result
	"""
	global numCompleted

	# Prin status
	sys.stdout.write(result)
	sys.stdout.flush()

	# Display progress every once in a while
	numCompleted += 1
	if (numCompleted % 500) == 0:
		print "\n%d/%d jobs imported (%.1f%%)" % (numCompleted, numTotal, 100*numCompleted/numTotal)

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

def importFile(tarFile):
	"""
	Open tarfile
	"""
	global csvFile
	global csvLock

	try:

		# Open tar file
		f = None
		try:
			# Try to open the tarfile
			f = tarfile.open(tarFile)
		except Exception as e:
			handleResult("!")
			return

		# Get jobdata record from tar archive
		jobDataInfo = f.getmember("./jobdata")
		if not jobDataInfo:
			handleResult("?")
			return

		# Load jobdata
		jobData = None
		try:
			# Open tune config
			jobDataFile = f.extractfile(jobDataInfo)
			jobData = readConfig(jobDataFile)
			jobDataFile.close()
		except Exception as e:
			handleResult("-")
			return

		# Close tarfile
		f.close()

		# Check for required parameters
		if not 'USER_ID' in jobData:
			handleResult("X")
			return

		# Prepare CSV Record
		csvLock.acquire()
		try:
			csvFile.write(
					"%s,%s,%d,%s,%s,%s\n" % (
						jobData['USER_ID'], 
						jobData['exitcode'],
						jobDataInfo.mtime, 
						datetime.datetime.fromtimestamp(jobDataInfo.mtime).strftime('%Y-%m-%d %H:%M:%S'),
						jobData['cpuusage'],
						jobData['diskusage']
					)
				)
			csvFile.flush()
		finally:
			csvLock.release()

		# File is imported
		handleResult(".")
		return

	except Exception as e:
		traceback.print_exc()
		print e
		return

# Run threaded
if __name__ == '__main__':

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
	init_vars( len(histogramQueue) )

	# Create a pool of 8 workers
	pool = Pool(8)

	# Run pool
	r = pool.map_async( 
		importFile, 
		histogramQueue
	)

	# Wait all workers to complete
	r.wait()

	# We are completed
	csvFile.close()
	print "\nCompleted!"
