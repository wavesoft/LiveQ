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
import logging
import time
import datetime
import glob

# Ensure we have at least one parameter
if (len(sys.argv) < 3) or (not sys.argv[1]) or (not sys.argv[2]):
	print "Analyze MCPlot job completion statistics"
	print "Usage:"
	print ""
	print " import-mcplots-interpolation.py <path to mcplots jobs dir> <csv file>"
	print ""
	sys.exit(1)

# Check if we have directory
if not os.path.isdir(sys.argv[1]):
	print "ERROR: Could not find %s!" % sys.argv[2]
	sys.exit(1)

# Get base dir and csv file
baseDir = sys.argv[1]
csvFile = sys.argv[2]

# Definition of the TarAnalyze Class
class TarAnalyze:

	def __init__(self, suffix=".tgz"):
		"""
		Initialize TarAnalyze
		"""
		self.baseDir = baseDir

		# Open csv file
		if csvFile[0] == "+":
			# Append
			self.csvFile = open(csvFile[1:], 'a')
		else:
			# Open for writing
			self.csvFile = open(csvFile, 'w')
			self.csvFile.write("User ID,Exit Code (0=Success),Completed at (UNIX Timestamp),Completed at (Readable Date),CPU Usage,Disk Usage\n")

		# Prepare the list of histograms to process
		self.histogramQueue = glob.glob("%s/*%s" % (baseDir, suffix))
		self.queueLength = len(self.histogramQueue)

	def readConfig(self, fileObject):
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

	def importFile(self, tarFile):
		"""
		Open tarfile
		"""

		# Log
		logging.info("Importing %s" % tarFile)

		# Open tar file
		f = None
		try:
			# Try to open the tarfile
			f = tarfile.open(tarFile)
		except Exception as e:
			traceback.print_exc()
			logging.error("Could not open archive (%s)" % str(e))
			return

		# Get jobdata record from tar archive
		jobDataInfo = f.getmember("./jobdata")
		if not jobDataInfo:
			logging.error("Could not find ./jobdata file in archive")
			return

		# Load jobdata
		jobData = None
		try:
			# Open tune config
			jobDataFile = f.extractfile(jobDataInfo)
			jobData = self.readConfig(jobDataFile)
			jobDataFile.close()
		except Exception as e:
			traceback.print_exc()
			logging.error("Could not load job data (%s)" % str(e))
			return

		# Close tarfile
		f.close()

		# Check for required parameters
		if not 'USER_ID' in jobData:
			logging.warn("Skipping due to missing 'USER_ID'")
			return

		# Prepare CSV Record
		self.csvFile.write(
				"%s,%s,%d,%s,%s,%s\n" % (
					jobData['USER_ID'], 
					jobData['exitcode'],
					jobDataInfo.mtime, 
					datetime.datetime.fromtimestamp(jobDataInfo.mtime).strftime('%Y-%m-%d %H:%M:%S'),
					jobData['cpuusage'],
					jobData['diskusage']
				)
			)
		self.csvFile.flush()

	def run(self):
		"""
		Bind setup
		"""

		# Run component
		while True:
			self.step()

	def step(self):
		"""
		Process next action in the component
		"""

		# Check if we are done
		if not self.histogramQueue:
			logging.info("Completed!")
			self.csvFile.close()
			exit(0)
		else:
			# Every 50 imports, dump progress
			currLength = len(self.histogramQueue)
			if (currLength % 50) == 0:
				itemsCompleted = self.queueLength - currLength
				logging.info("%d/%d jobs imported (%.1f%%)" % (itemsCompleted, self.queueLength, 100*itemsCompleted/self.queueLength))

		# Get next file
		self.importFile( self.histogramQueue.pop() )


# Run threaded
TarAnalyze().run()
