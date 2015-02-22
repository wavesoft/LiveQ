import sys
import re
import os
from glob import glob

RE_TAGOPEN = re.compile(r'<(\w+)([>/ ])')
RE_TAGNAME = re.compile(r'(\w+)[>/ ]')
RE_CLOSETAG = re.compile(r'<(\w+)[^</>]*/>$')

class IncompleteXMLParser:
	"""
	An in-house XML parser for the nonstandard and incomplete XML structure found
	in the pythia documentation.

	This is a low-level parser that assumes the bare minimum of the XML syntax and 
	issues no warnings of any sort.
	"""

	def __init__(self, buf=""):
		"""
		Load filename buffer
		"""
		# Reset buffer
		self.buffer = buf
		# Start from 0
		self.index = 0
		# Last tag
		self.lastTag = ""
		# Completed flag
		self.completed = False

	def loadFile(self, filename):
		"""
		Load file to buffer
		"""
		# Open file for reading
		with open(filename, 'r') as f:
			# Read entire buffer
			self.buffer = "".join(f.readlines()).replace("\n", " ")
		# Start from 0
		self.index = 0
		# Last tag
		self.lastTag = ""
		# Completed flag
		self.completed = False


	def getNextTag(self):
		"""
		Return the name of the next open tag
		"""

		# Match tag ending
		m = RE_TAGOPEN.search( self.buffer, self.index )
		if not m:
			self.index = len(self.buffer)
			self.completed = True
			return None

		# Get name
		name = m.group(1)
		self.index = m.end()

		# Go one step before tag closing
		if m.group(2) == ">":
			self.index -= 1

		# Return name
		self.lastTag = name
		return name

	def getTagAttrib(self):
		"""
		Return the attributes of the currently open tag
		"""

		attribs = {}
		inString = ""
		strKey = ""
		strVal = ""

		while self.index < len(self.buffer):

			# Get char
			c = self.buffer[self.index]

			#print "buffer[%i] = '%s'" % (self.index, c)

			if inString:
				# 1) In attribute value

				# Found string ending?
				if c == inString:
					#print " -> attr[%s]=\"%s\"" % (strKey, strVal)
					attribs[strKey] = strVal
					strVal = ""
					strKey = ""
					inString = ""
					self.index += 1
					continue

				# Stack on string body
				strVal += c
				#print " - strVal=%s" % strVal

			elif strKey:
				# 2) Started attribute
				
				if c == "=":
					# 2a) Start collecting value on '=''
					inString = self.buffer[self.index+1]
					if (inString != "'") and (inString != '"'):
						inString = " "
					else:
						self.index += 1
					#print " - strKey TERM (with %s)" % inString
				elif c != " ":
					# 2b) Collect key value
					strKey += c
					#print " - strKey=%s" % strKey

			elif (c == ">"):
				# 3) Ending chars
				#print " - EOF"
				self.index += 1
				break
			elif (c == "/"):
				#print " - EOF"
				self.index += 2
				break

			elif (c != " "):
				# 4) Begin attribute
				#print " - beginKey"
				strKey += c

			self.index += 1

		# Return attributes
		return attribs

	def closeTag(self, name=None):
		"""
		Forward index until the tag with the given name is closed and return
		the length of the closing tag
		"""

		# Use lastTag if name is none
		if name is None:
			name = self.lastTag

		# Check if the tag is literaly closed
		if self.buffer[self.index] == ">":
			self.index += 1
			return 0

		# Check if we are in the end of a tag
		if self.buffer[self.index:self.index+2] == "/>":
			m = RE_CLOSETAG.search(self.buffer[0:self.index+2])
			if m != None:
				if m.gropu(1) == name:
					self.index = m.end()
					return m.end() - m.start()

		# Look for the ending of the given tag
		idx = self.buffer.find("</%s>" % name, self.index)
		if idx < 0:
			self.index = len(self.buffer)
			self.completed = True
			return None

		# Update index
		self.index = idx + len(name) + 3
		return len(name)+3

	def getTagBody(self, name=None):
		"""
		Read tag body. 
		The index if forwared after the tag close
		"""

		# Use lastTag if name is none
		if name is None:
			name = self.lastTag

		# Start by the end of the tag
		str_start = self.index

		# Close tag and get tag end
		end_len = self.closeTag(name)
		str_end = self.index

		# Return body
		return self.buffer[str_start:str_end-end_len].strip()

def genShort(text):
	capitals = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	sName = ""
	parts = text.split(":")
	for p in parts:
		first = True
		for c in p:
			if first:
				first = False
				sName += c.upper()
			else:
				if c in capitals:
					sName += c.lower()

	return sName

def parmDec(vdec, defDec=3):
	"""
	Count decimals
	"""
	i = vdec.find(".")
	if i < 0:
		return 0
	else:
		ndec = len(vdec)-i-1
		if ndec == 0:
			return defDec
		else:
			return ndec

def ucfirst(string):
	"""
	Capitalize first letter
	"""

	# Strip and make sure it's not blank
	string = string.strip()
	if not string:
		return ""

	# Capitalize
	return string[0].upper() + string[1:]

def parmSplitOptions(payload, debug=False):
	"""
	Get all the <option> tags from the payload and return
	a tuple like (leftover_payload, [options_array])
	"""

	# Initialize leftover buffer
	options = []
	lo_buf = ""
	lo_idx = 0

	# Create a parser
	p = IncompleteXMLParser(payload)

	if debug:
		print "INIT: '%s' [%i:%i]" % (lo_buf, lo_idx, p.index)

	# Scan all the <option> tags
	while not p.completed:

		# Process option tags
		if p.getNextTag() == "option":
			if debug:
				print "O_IN: '%s' [%i:%i]" % (lo_buf, lo_idx, p.index)

			# Keep leftover
			lo_buf += payload[lo_idx:p.index-8]

			# Get tag attributes
			o_attr = p.getTagAttrib()
			o_body = p.getTagBody()

			# Store
			o_attr['body'] = o_body
			options.append(o_attr)

			# Update lo_idx
			lo_idx = p.index
			if debug:
				print "O_OU: '%s' [%i:%i]" % (lo_buf, lo_idx, p.index)

	# Collect final leftover
	lo_buf += payload[lo_idx:]
	if debug:
		print "OEND: '%s' [%i:%i]" % (lo_buf, lo_idx, p.index)

	# Return tuple
	if debug:
		print (lo_buf.strip(), options)
		sys.exit(0)

	return (lo_buf.strip(), options)


def parseParameters(filename, additional={}):
	"""
	"""

	# Reset parameters
	parameters = {}

	# Load filename
	p = IncompleteXMLParser()
	p.loadFile(filename)

	# Current gategory and group
	category = ""
	group = ""

	# Start scanning for parameters
	tag = p.getNextTag()
	while tag != None:

		# Handle parameter tags
		if tag == "modepick":
			# [1] Set of options
			
			# Get attributes
			attrib = p.getTagAttrib()

			# Get parser for the body
			tbuf = p.getTagBody()

			# Get options and body
			(desc, options_list) = parmSplitOptions(tbuf)

			# Prepare parameter
			parm = { }
			parm.update(additional)
			parm['short'] = genShort(attrib['name'])
			parm['desc'] = ucfirst(desc)
			parm['type'] = 'pick'
			parm['subgroup'] = category
			parm['group'] = group

			# Pick min/max/default
			pDec = 0
			if 'min' in attrib:
				parm['min'] = float(attrib['min'])
				d = parmDec(attrib['min'])
				if d > pDec:
					pDec = d
			elif 'max' in attrib:
				parm['max'] = float(attrib['max'])
				d = parmDec(attrib['max'])
				if d > pDec:
					pDec = d
			elif 'default' in attrib:
				parm['default'] = float(attrib['default'])
				d = parmDec(attrib['default'])
				if d > pDec:
					pDec = d

			# Store decimals
			parm['dec'] = pDec

			# Process options
			v_min = None
			v_max = None
			parm['options'] = []
			for o in options_list:

				# Pick min/max
				v = float(o['value'])
				if v_max is None:
					v_min = v
					v_max = v
				else:
					if v < v_min:
						v_min = v
					if v > v_max:
						v_max = v

				# Store option
				parm['options'].append({
						'value': v,
						'desc': ucfirst(o['body'])
					})

			# Store missing min/max default
			if not 'min' in parm:
				parm['min'] = v_min
			if not 'max' in parm:
				parm['max'] = v_max
			if not 'default' in parm:
				parm['default'] = v_min

			# Store on parameters
			parameters[attrib['name']] = parm

		elif tag == "parm":
			# [2] Parameter in range

			# Get attributes
			attrib = p.getTagAttrib()

			# Get parser for the body
			tbuf = p.getTagBody()

			# Prepare parameter
			parm = { }
			parm.update(additional)
			parm['short'] = genShort(attrib['name'])
			parm['desc'] = ucfirst(tbuf)
			parm['subgroup'] = category
			parm['group'] = group
			parm['type'] = 'parm'

			# Pick min/max/default
			pDec = 0
			if 'min' in attrib:
				parm['min'] = float(attrib['min'])
				d = parmDec(attrib['min'])
				if d > pDec:
					pDec = d
			elif 'max' in attrib:
				parm['max'] = float(attrib['max'])
				d = parmDec(attrib['max'])
				if d > pDec:
					pDec = d
			elif 'default' in attrib:
				parm['default'] = float(attrib['default'])
				d = parmDec(attrib['default'])
				if d > pDec:
					pDec = d

			# Store decimals
			parm['dec'] = pDec

			# Store on parameters
			parameters[attrib['name']] = parm

		elif tag == "flag":
			# [3] A boolean flag (on/off)

			# Get attributes
			attrib = p.getTagAttrib()

			# Get parser for the body
			tbuf = p.getTagBody()
			p2 = IncompleteXMLParser(tbuf)

			# Get options and body
			(desc, options_list) = parmSplitOptions(tbuf)

			# Prepare parameter
			parm = { }
			parm.update(additional)
			parm['short'] = genShort(attrib['name'])
			parm['desc'] = ucfirst(desc)
			parm['type'] = 'bool'
			parm['subgroup'] = category
			parm['group'] = group
			parm['options'] = []

			if 'default' in attrib:
				parm['default'] = (attrib['default'].lower() == "on")
			else:
				parm['default'] = False

			# Store decimals
			parm['dec'] = 0

			# Start collecting options
			for o in options_list:

				# Store option
				parm['options'].append({
						'value': (o['value'].lower() == "on"),
						'desc': ucfirst(o['body'])
					})

			# Store on parameters
			parameters[attrib['name']] = parm

		elif (tag == "h3") or (tag == "h2"):

			# [4] Change category
			p.closeTag()
			category = p.getTagBody()

			# Update default category
			if not group:
				group = category

		tag = p.getNextTag()

	return parameters

def parseXMLDoc(folder):

	params = {}
	for f in glob("%s/*.xml" % folder):
		print "Parsing %s..." % f
		params.update( parseParameters(f, { 'file': os.path.basename(f) }) )

	return params


"""
import pythiaTunables
p = pythiaTunables.IncompleteXMLParser("/Users/icharala/Downloads/pythia8186/xmldoc/TimelikeShowers.xml")
while p.getNextTag() != "modepick":
	pass

p.getTagAttrib()
p.getTagBody()

import pythiaTunables
import json
print(json.dumps(pythiaTunables.parseParameters("/Users/icharala/Downloads/pythia8186/xmldoc/TimelikeShowers.xml"),sort_keys=True,indent=4, separators=(',', ': ')))

import pythiaTunables
import json
print(json.dumps(pythiaTunables.parseXMLDoc("/Users/icharala/Downloads/pythia8186/xmldoc"),sort_keys=True,indent=4, separators=(',', ': ')))

pythiaTunables.parseParameters("/Users/icharala/Downloads/pythia8186/xmldoc/TimelikeShowers.xml")

"""

