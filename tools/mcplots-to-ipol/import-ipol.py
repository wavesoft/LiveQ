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

from config import Config

from liveq import handleSIGINT, exit
from liveq.events import GlobalEvents
from liveq.exceptions import ConfigException
from liveq.component import Component

from liveq.data.histo import Histogram
from liveq.data.histo.intermediate import IntermediateHistogramCollection
from liveq.data.histo.interpolate import InterpolatableCollection

from liveq.models import Agent, Lab
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

# Read parameters from command line
if len(sys.argv) < 2:
	print("ERROR   Please specify a directory!")
	exit(1)

# Definition of the TarImport Component
class TarImport(Component):

	def __init__(self, suffix=".tgz"):
		"""
		Initialize TarImport
		"""
		Component.__init__(self)
		self.baseDir = sys.argv[1]

		# Open lab 
		try:
			self.lab = Lab.get( Lab.uuid == Config.labID)
		except Lab.DoesNotExist:
			self.lab = None

		# Prepare the list of histograms to process
		self.histogramQueue = glob.glob("%s/*%s" % (Config.baseDir, suffix))

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
		except:
			logging.error("Could not open %s" % tarFile)
			return

		# Load tune from tar file
		tuneParam = None
		try:
			# Open tune config
			genFile = f.extractfile("./generator.tune")
			tuneParam = self.readTune(genFile)
			genFile.close()
		except:
			logging.error("Could not load tune %s" % tarFile)
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
		hipol = self.lab.getHistograms()
		for h in histos:
			if (not h) or (not h.name in hipol):
				continue
			res.append(h)
			
		# Generate fits for interpolation
		ans.regenFits()

		# Send the resulting data to the interpolation database
		self.ipolChannel.send("results", {
				'data': hipol.pack()
			}, waitReply=True)

	def run(self):
		"""
		Bind setup
		"""

		# Open the interpolator channel were we are dumping the final results
		self.ipolChannel = Config.IBUS.openChannel("interpolate")

		# Run component
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
