#!/usr/bin/python
# ----------
import sys
sys.path.append("../../liveq-common")
# ----------

import tarfile
import logging
import time
import signal
import sys
import hashlib
import uuid
import glob

from util.config import Config

from liveq import handleSIGINT, exit
from liveq.events import GlobalEvents
from liveq.exceptions import ConfigException
from liveq.component import Component

from liveq.data.histo import Histogram
from liveq.data.histo.intermediate import IntermediateHistogramCollection
from liveq.data.histo.interpolate import InterpolatableCollection

from liveq.models import Lab, Observable
from liveq.data.tune import Tune

# Prepare runtime configuration
runtimeConfig = { }

# Load configuration
try:
	Config.fromFile( "config.local", runtimeConfig )
except ConfigException as e:
	print("ERROR   Configuration exception: %s" % e)
	exit(1)

# Hook sigint -> Shutdown
handleSIGINT()

# Ensure we have at least one parameter
if (len(sys.argv) < 3) or (not sys.argv[1]) or (not sys.argv[2]):
	print "Interpolation Importing Tool - Import MCPots runs to interpolator"
	print "Usage:"
	print ""
	print " import-mcplots-interpolation.py <lab ID> <path to mcplots jobs dir>"
	print ""
	sys.exit(1)

# Check if the specified lab exists
if not Lab.select().where(Lab.uuid == k).exists():
	print "ERROR: Could not find lab %s!" % sys.argv[1]
	sys.exit(1)

# Check if we have directory
if not os.path.isdir(sys.argv[2]):
	print "ERROR: Could not find %s!" % sys.argv[2]
	sys.exit(1)

# Import LabID
labID = sys.argv[1]
baseDir = sys.argv[2]

# Definition of the TarImport Component
class TarImport(Component):

	def __init__(self, suffix=".tgz"):
		"""
		Initialize TarImport
		"""
		Component.__init__(self)
		self.baseDir = baseDir

		# Open lab 
		try:
			self.lab = Lab.get( Lab.uuid == labID )
		except Lab.DoesNotExist:
			self.lab = None

		# Prepare the list of histograms to process
		self.histogramQueue = glob.glob("%s/*%s" % (baseDir, suffix))

	def readHistograms(self, tarObject):
		"""
		"""

		# Prepare collection
		ans = []

		# Read relevant entries
		for fn in tarObject.getnames():

			# Get only generator data objects (contain the name 'pythia' in path)
			if (not 'pythia' in fn) or (not fn.endswith(".dat")):
				continue

			# Try to load histogram by the file object
			fInst = tarObject.extractfile(fn)
			try:
				histo = Histogram.fromFLAT( fInst )
				fInst.close()
			except Exception as e:
				fInst.close()
				logging.error("Exception while loading file %s (%s)" % (tarObject.name, str(e)))
				continue

			# Report errors
			if histo == None:
				logging.error("Unable to load intermediate histogram from %s:%s" % (tarObject.name, fn))
			else:
				ans.append(histo)

		# Return collection
		return ans

	def readTune(self, fileObject):
		"""
		Read tune configuration from file object
		"""

		# Read all lines
		ans = {}
		for l in fileObject.readlines():
			# Trim newline
			l = l[0:-1]
			# Skip blank lines
			if not l:
				continue
			# Split on ' = '
			kv = l.split(" = ")
			# Put on response
			ans[kv[0]] = float(kv[1])

		# Return dictionary
		return ans

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

		logging.info("Importing %s" % tarFile)

		# Open tar file
		f = None
		try:
			# Try to open the tarfile
			f = tarfile.open(tarFile)
		except Exception as e:
			logging.error("Could not open archive (%s)" % str(e))
			return

		# Load tune from tar file
		tuneParam = None
		try:
			# Open tune config
			genFile = f.extractfile("./generator.tune")
			tuneParam = self.readTune(genFile)
			genFile.close()
		except Exception as e:
			logging.error("Could not load tune (%s)" % str(e))
			return

		# Load jobdata from tar archive
		jobData = None
		try:
			# Open tune config
			jobDataFile = f.extractfile("./jobdata")
			jobData = self.readConfig(jobDataFile)
			jobDataFile.close()
		except Exception as e:
			logging.error("Could not load job data (%s)" % str(e))
			return

		# Check for erroreus jobs
		if int(jobData['exitcode']) != 0:
			logging.error("Skipping due to exitcode=%s" % jobData['exitcode'])
			return

		# Load histograms from tarfile
		histos = None
		try:
			histos = self.readHistograms(f)
		except Exception as ex:
			logging.error("Could not load histograms from %s (%s)" % (tarFile, str(ex)))
			return

		# Close tarfile
		f.close()

		# Prepare the interpolatable collection that will
		# collect the data to send to the interpolator
		res = InterpolatableCollection(tune=Tune( tuneParam, labid=self.lab.uuid ))

		# Select only the histograms used in this tune
		degrees = {}
		hipol = self.lab.getHistograms()
		for h in histos:

			# Store histogram
			res.append(h)

			# Get observable custom polyFit degree
			try:
				obs = Observable.get( Observable.name == h.name )
				degrees[h.name] = obs.fitDegree
			except Lab.DoesNotExist:
				pass

		# Generate fits for interpolation
		res.regenFits( degrees )

		# Send the resulting data to the interpolation database
		self.ipolChannel.send("results", {
				'data': res.pack()
			}, waitReply=True)

	def run(self):
		"""
		Bind setup
		"""

		# Open the interpolator channel were we are dumping the final results
		self.ipolChannel = Config.IBUS.openChannel("interpolate")

		# Run component
		time.sleep(1)
		Component.run(self)

	def step(self):
		"""
		Process next action in the component
		"""

		# Check if we are done
		if not self.histogramQueue:
			logging.info("Completed!")
			exit(0)

		# Get next file
		self.importFile( self.histogramQueue.pop() )

# Run threaded
TarImport.runThreaded()
