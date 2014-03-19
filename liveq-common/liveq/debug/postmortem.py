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

import re
import threading
import time
import traceback
import copy
import inspect
import pprint
import zlib
import base64
import cPickle as pickle
import datetime

import ConfigParser

from threading import Thread

# Compile the new-line regular expression
RX_NEWLINE = re.compile("\r?\n")

def dumpVariable(var):
	"""
	Dump the contents of the given variable
	"""
	return pprint.pformat(var)

def reflectClass(cls):
	"""
	Inspect class and get all the useful information for post-mortem
	"""

	# Reflect static variables
	v_static = {}
	for k,v in cls.__class__.__dict__.iteritems():
		v_static[k] = dumpVariable(v)

	# Reflect instance variables
	v_instance = {}
	for k,v in cls.__class__.__dict__.iteritems():
		v_instance[k] = dumpVariable(v)

	# Return reflection information
	return {
		"class": cls.__class__.__name__,
		"module": cls.__class__.__module__,
		"static": v_static,
		"instance": v_instance
	}

def parseConfig(config, dat, skip=[], prefix=""):
	"""
	Parse a config object and skip the entries specified on skip=[]
	The response is stored to a dictionary given on dat argument
	"""

	# Handle ConfigParser instance
	if isinstance(config, ConfigParser.ConfigParser):
		for s in config.sections():
			for o in config.options(s):
				
				# Calculate key name
				n = "%s%s.%s" % (prefix,s,o)

				# Skip the ones we should skip
				if n in skip:
					continue

				# Store on response
				dat[n] = config.get(s,o)

	# Handle dict instance
	elif isinstance(config, dict):
		for k,v in config.iteritems():

			# Calculate key name
			n = "%s%s" % (prefix,k)

			# Check for nested elements
			if isinstance(config, dict):
				dat[n] = {}
				parseConfig(v, dat[n], skip, prefix=n)
			else:
				dat[n] = v

	# Check if the config is class instance
	elif hasattr(config, '__class__'):

		# Log the static parameters
		for k,v in config.__class__.__dict__.iteritems():

			# Skip hidden entries
			if k[0] == "_":
				continue

			# Calculate key name
			n = "%s%s" % (prefix,k)

			# Store value
			dat[n] = pprint.pformat(v)

	# Check if the config class is a static instance
	elif inspect.isclass(config):

		# Log the static parameters
		for k in dir(config):
			v = getattr(config, k)

			# Skip hidden entries
			if k[0] == "_":
				continue

			# Check for methods
			if inspect.ismethod(v) or inspect.isfunction(v):
				continue

			# Calculate key name
			n = "%s%s" % (prefix,k)

			# Store value
			dat[n] = pprint.pformat(v)

	# Store response
	return dat

def formatTime(time):
	"""
	Format unix time to string
	"""

	dt = datetime.datetime.fromtimestamp(time)
	return "%i/%i/%i %i:%i:%i" % (dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second)

class PostMortem:
	"""
	This class provides simple, post-mortem data collection information.
	Such post-mortem can be submitted for discovering bugs in the application.
	"""

	GLOBAL_INFO = {}
	GLOBAL_CONFIG = {}

	def __init__(self):
		"""
		Initialize the post-mortem logging class
		"""

		# Flag to mark if the post-mortem is active
		self.active = True

		# Monitoring variables
		self.activeProcesses = [ ]

		# Post-Mortem sections
		self.sections = {
			"general": {
				"time": time.time(),
				"ver": 1
			},
			"info": 	copy.deepcopy(PostMortem.GLOBAL_INFO),
			"config":	copy.deepcopy(PostMortem.GLOBAL_CONFIG),
			"proc": 	{},
			"trace": 	[],
			"logs":		[]
		}
		
		# Start the post-mortem thread
		self.thread = Thread(target=self.thread_main)
		self.thread.start()

	def __del__(self):
		"""
		We were forced to exit
		"""
		pass

	@staticmethod
	def addGlobalInfo(key, value, group="General"):
		"""
		Store global post-mortem information
		"""

		# Check if group is missing
		if not group in PostMortem.GLOBAL_INFO:
			PostMortem.GLOBAL_INFO[group] = {}

		# Store value
		PostMortem.GLOBAL_INFO[group][key] = value

	@staticmethod
	def addGlobalConfig(name, config, skip=[]):
		"""
		Store global post-mortem information
		"""

		# Store value
		PostMortem.GLOBAL_CONFIG[name] = {}
		parseConfig(config, PostMortem.GLOBAL_CONFIG[name], skip)

	def addConfig(self, name, config, skip=[]):
		"""
		Store configuration information from the given config object
		"""

		# Store value
		self.sections['config'][name] = {}
		parseConfig(config, self.sections['config'][name], skip)


	def addInfo(self, key, value, group="General"):
		"""
		Store additional information, useful to identify bugs
		"""

		# Ensure we have info group
		if not group in self.sections["info"]:
			self.sections["info"][group] = {}

		# Store value
		self.sections["info"][group][key] = value

	def addTrace(self):
		"""
		Snapsot the current backtrace
		"""
		
		# Generate backtrace
		stackLines = traceback.format_stack()

		# Skip the current function
		stackLines.pop()

		# Store backtrace
		self.sections["trace"].append([ time.time(), stackLines ])

	def log(self, log, level="info"):
		"""
		Add a log line
		"""

		# Store backtrace
		self.sections["logs"].append([ time.time(), level, log ])

	def addProcess(self, path, pp, stderr=False, stdout=False):
		"""
		Monitor the execution of the given process
		"""

		# Populate process entry
		entry = {
			'pid': pp.pid,
			'path': path,
			'exit': None,
			't_at': time.time(),
			't_exit': None
		}

		# Create stderr if needed
		if stderr:
			entry['stderr'] = []
		if stdout:
			entry['stdout'] = []

		# Prepare the log entry of the process
		self.sections["proc"][pp.pid] = entry

		# Start I/O Thread
		if stderr or stdout:
			t = threading.Thread(target=self.thread_log_io, kwargs={'entry': entry, 'pp': pp})
			t.start()

		# Create a process monitoring entry
		self.activeProcesses.append({
				'pp': pp,
				'e': entry
			})

	def complete(self):
		"""
		Mark the post-mortem as completed successfully
		"""

		# Mark as inactive
		self.active = False

	###########################################################
	## Visulize functions
	###########################################################

	def __str__(self):
		"""
		Render to string
		"""
		pass

	def __unicode__(self):
		"""
		Unicode render to string
		"""
		pass

	def toBuffer(self, size=10240, asBase64=True):
		"""
		Translate to a buffer that can be transmitted over the network
		"""

		# Pickle the sections
		sections = pickle.dumps(self.sections)

		# Compress
		sections = zlib.compress(sections)

		# Base-64 encoded if requested
		if asBase64:
			sections = base64.b64encode(sections)

		# Return
		return sections

	@staticmethod
	def fromBuffer(buf, fromBase64=True):
		"""
		Decode a buffer previously encoded with asBuffer
		"""

		# Decode buffer
		if fromBase64:
			buf = base64.b64decode(buf)

		# Decompress buffer
		buf = zlib.decompress(buf)

		# Unpickle into sections
		return pickle.loads(buf)

	@staticmethod
	def render(sections):
		"""
		Visualize the post-mortem
		"""

		print "================================================="
		print "           * * POST MORTEM REPORT * *"
		print "================================================="
		print ""
		print " GENERAL "
		print "----------"
		print ""
		print "Post-Mortem generated at: [%s]" % formatTime(sections['general']['time'])
		print "Revision: %i" % sections['general']['ver']
		print ""

		# Dump configuration
		if "config" in sections:
			print " CONFIG"
			print "--------"
			print ""
			for k,v in sections['config'].iteritems():
				print "%s: %s" % (k,v)
			print ""

		# Dump information
		if "info" in sections:
			print " INFORMATION"
			print "-------------"
			print ""
			for group, values in sections['info'].iteritems():
				print "[%s]" % group
				for k,v in values.iteritems():
					print "%s: %s" % (k,v)
				print ""

		# Dump process information
		if "proc" in sections:
			print " PROCESSES"
			print "-----------"
			print ""
			for pid, proc in sections['proc'].iteritems():
				print "[%i]" % pid
				print "path: %s" % proc['path']
				print "result: %s" % proc['exit']
				print "started: %s" % formatTime(proc['t_at'])
				print "completed: %s" % formatTime(proc['t_exit'])
				print ""
				if 'stdout' in proc:
					print " -STDOUT-"
					for l in proc['stdout']:
						print "<%s> %s" % (formatTime(l[0]), l[1])
					print ""
				if 'stderr' in proc:
					print " -STDERR-"
					for l in proc['stderr']:
						print "<%s> %s" % (formatTime(l[0]), l[1])
					print ""

		# Dump logs
		if "logs" in sections:
			print " LOG FILE"
			print "----------"
			print ""
			for l in sections['logs']:
				print "<%s> %s" % (formatTime(l[0]), l[1])
			print ""

		# Stack traces
		if "trace" in sections:
			print " STACK TRACE"
			print "-------------"
			print ""
			for st in sections['trace']:
				print "Trace at %s" % formatTime(st[0])
				for l in st[1]:
					print l
			print ""


		print "================================================="


	###########################################################
	## Thread functions
	###########################################################

	def thread_main(self):
		"""
		The post-mortem thread that will keep running until it's requested to complete
		"""
		while self.active:

			# Check for dead processes
			i = 0
			for proc in self.activeProcesses:
				res = proc['pp'].poll()
				if res != None:

					# Update exit code and exit time
					proc['e']['exit'] = res
					proc['e']['t_exit'] = time.time()

					# Remove from monitoring
					del self.activeProcesses[i]
					i -= 1

				# Update index
				i += 1

			time.sleep(0.25)

	def thread_log_io(self, entry=None, pp=None):
		"""
		Thread function to read the standard error from the given process
		"""

		# Loop while the process is running
		while pp.poll() == None:
			try:

				# Communicate with the process
				(sout, serr) = pp.communicate()

				# Check if we had something
				if sout and ('stdout' in entry):
					lines = filter(None, RX_NEWLINE.split(sout))
					for l in lines:
						entry['stdout'].append([time.time(), l])

				# Check if we had something
				if serr and ('stderr' in entry):
					lines = filter(None, RX_NEWLINE.split(sout))
					for l in lines:
						entry['stderr'].append([time.time(), l])

			except ValueError:
				break

		# When we get an exception (Broken Pipe), the
		# thread will exit
