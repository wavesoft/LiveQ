import re
from glob import glob

RE_TAGOPEN = re.compile(r'<(\w+)([>/ ])')
RE_TAGNAME = re.compile(r'(\w+)[>/ ]')
RE_CLOSETAG = re.compile(r'<(\w+)[^</>]*/>$')

class IncompleteXMLParser:

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
		Forward index until the tag with the given name is closed
		"""

		# Use lastTag if name is none
		if name is None:
			name = self.lastTag

		# Check if the tag is literaly closed
		if self.buffer[self.index] == ">":
			self.index += 1
			return

		# Check if we are in the end of a tag
		if self.buffer[self.index:self.index+2] == "/>":
			m = RE_CLOSETAG.search(self.buffer[0:self.index+2])
			if m != None:
				if m.gropu(1) == name:
					self.index = m.end()

		# Look for the ending of the given tag
		idx = self.buffer.find("</%s>" % name, self.index)
		if idx < 0:
			self.index = len(self.buffer)
			self.completed = True
			return None

		# Update index
		self.index = idx

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
		self.closeTag(name)
		str_end = self.index

		# Return body
		return self.buffer[str_start:str_end]

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

def parseParameters(filename):
	"""
	"""

	# Reset parameters
	parameters = {}

	# Load filename
	p = IncompleteXMLParser()
	p.loadFile(filename)

	# Current gategory
	category = ""

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
			p2 = IncompleteXMLParser(tbuf)

			# Get location of the first option tag
			while not p2.completed and (p2.getNextTag() != "option"):
				pass

			# Prepare parameter
			parm = { }
			parm['desc'] = tbuf[0:p2.index-8]
			parm['type'] = 'pick'
			parm['category'] = category
			parm['options'] = []

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

			# Start collecting options
			v_min = None
			v_max = None
			while not p2.completed:

				# Get attribute details
				o_attr = p2.getTagAttrib()
				o_body = p2.getTagBody()

				# Pick min/max
				v = float(o_attr['value'])
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
						'desc': o_body
					})

				if p2.getNextTag() != "option":
					break

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
			p2 = IncompleteXMLParser(tbuf)

			# Prepare parameter
			parm = { }
			parm['desc'] = tbuf[0:p2.index-8]
			parm['category'] = category
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

			# Get location of the first option tag
			while not p2.completed and (p2.getNextTag() != "option"):
				pass

			# Prepare parameter
			parm = { }
			parm['desc'] = tbuf[0:p2.index-8]
			parm['type'] = 'bool'
			parm['category'] = category
			parm['options'] = []

			if 'default' in attrib:
				parm['default'] = (attrib['default'].lower() == "on")
			else:
				parm['default'] = False

			# Store decimals
			parm['dec'] = 0

			# Start collecting options
			while not p2.completed:

				# Get attribute details
				o_attr = p2.getTagAttrib()
				o_body = p2.getTagBody()

				# Store option
				parm['options'].append({
						'value': (o_attr['value'].lower() == "on"),
						'desc': o_body
					})

				if p2.getNextTag() != "option":
					break

			# Store on parameters
			parameters[attrib['name']] = parm

		elif tag == "h3":
			# [4] Change category
			p.closeTag()
			category = p.getTagBody()

		tag = p.getNextTag()

	return parameters

def parseXMLDoc(folder):

	params = {}
	for f in glob("%s/*.xml" % folder):
		print "Parsing %s..." % f
		params.update( parseParameters(f) )

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

