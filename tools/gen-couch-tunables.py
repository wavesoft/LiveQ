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

#
# TODO: Rerwite this in order to use the yoda/AIDA files that come with rivet, instead of the /dat folder
#       of MCPlots
#

# ----------
import sys
sys.path.append("../liveq-common")
# ----------

import shutil
import os
import ConfigParser
import json
import re
import glob
import htmlentitydefs

import HTMLParser
import xml.etree.cElementTree as ElementTree
import codecs

RE_STRIPTAG = re.compile( r"^<[^>]+>|<[^>]+>$" )
RE_EXPANDTAG = re.compile( r"<((\w+)\s*[^>]*)/>" )
RE_EXPAND_AMP = re.compile( r"test" )

htmlParser = HTMLParser.HTMLParser()
xmlParser = ElementTree.XMLParser(encoding="UTF-8")

def escape(text):
	for k,v in htmlentitydefs.codepoint2name.iteritems():
		text = text.replace(unicode(k), u"&%s;" % v)
	return text

def unescape(text, keepEntities=[]):
	def fixup(m):
		text = m.group(0)
		if text[:2] == "&#":
			# character reference
			try:
				if text[:3] == "&#x":
					return unichr(int(text[3:-1], 16))
				else:
					return unichr(int(text[2:-1]))
			except ValueError:
				pass
		else:
			# named entity
			try:
				entityName = text[1:-1]
				if entityName in keepEntities:
					return text
				text = unichr(htmlentitydefs.name2codepoint[entityName])
			except KeyError:
				pass
		return text # leave as is
	return re.sub("&#?\w+;", fixup, text)

def parseXML(file, encoding="utf-8"):
	p = ElementTree.XMLParser(encoding="utf-8")
	s = ""
	try:
		with codecs.open(file, "r", encoding) as f:
			l = f.readlines()
			s = unescape(''.join(l), ['lt','gt','amp', 'quot']).encode("utf-8")
			s = RE_EXPANDTAG.sub("<\\1></\\2>", s)

			# lines = s.split("\n")
			# i = 1
			# for l in lines:
			# 	print "%4i: %s" % (i, l)
			# 	i += 1

			p.feed(s)
		return ElementTree.ElementTree(p.close())
	except ElementTree.ParseError as e:
		print "error"

		# Helper for the snippet dump
		def dump_line(l,i,c="  "):
			if (i < 0) or (i >= len(l)):
				return False
			print "%s%04i%s: %s" % (c[0], i, c[1], l[i-1])
			return True
		def dump(l, i, col, span=2):
			if (i-span>0):
				print " ...."
			for j in range(i-span,i):
				dump_line(l,j)
			dump_line(l,i,"{}")
			print "       %s^" % (" "*col)
			for j in range(i+1,i+span+1):
				dump_line(l,j)
			if (i+span<len(l)-1):
				print " ...."

		# Print the source snippet
		lines = s.split("\n")

		(line, col) = e.position
		print "=" * 50
		print str(e)
		print "-" * 50
		dump(lines,line,col)
		print "=" * 50

		# Check fir critical documents
		if ((s.find("parm") > -1) or (s.find("flag") > -1)):
			print "UNRECOVERABLE: Unparsable document with parameters"
			sys.exit(1)

		return None		

def genShort(text):
	capitals = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
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

def getOpen(xml, fileName):
	parms = xml.findall("./modeopen")
	headers = xml.findall("./h2")

	# Get group name
	groupName = ""
	if len(headers) > 0:
		header = headers[0]
		groupName = header.text

	parmDict = {}
	for p in parms:
		vName = ""
		vMin = None
		vMax = None
		vDefault = None
		decMin = 0
		decMax = 0
		decDefault = 0

		if 'name' in p.attrib:
			vName = p.attrib['name']
		if 'min' in p.attrib:
			vMin = float(p.attrib['min'])
			decMin = len((p.attrib['min']+".").split(".")[1])
		if 'max' in p.attrib:
			vMax = float(p.attrib['max'])
			decMax = len((p.attrib['max']+".").split(".")[1])
		if 'default' in p.attrib:
			vDefault = float(p.attrib['default'])
			decDefault = len((p.attrib['default']+".").split(".")[1])

		# Build body
		vBody = ElementTree.tostring(p, method="html", encoding="utf-8").decode("utf-8").strip()
		vBody = RE_STRIPTAG.sub(u"", vBody).strip()
		vBody = escape(vBody)

		parmDict[vName] = {
			'_id'		: vName,
			'type' 	 	: 'num',
			'def'	 	: vDefault,
			'value': {
				'min' 	: vMin,
				'max' 	: vMax,
				'dec'	: max(decMin, decMax, decDefault, 2)
			},
			'info': {
				'name'	: vName,
				'desc'	: vBody,
				'short'	: genShort(vName),
				'book'	: "",
				'group' : groupName
			},
			'corr': {
				'obs' : [],
				'tun' : []
			},
			'_meta': {
				'file': fileName
			}
		}

	return parmDict

def getParms(xml, fileName):
	parms = xml.findall("./parm")
	headers = xml.findall("./h2")

	# Get group name
	groupName = ""
	if len(headers) > 0:
		header = headers[0]
		groupName = header.text

	parmDict = {}
	for p in parms:
		vName = ""
		vMin = None
		vMax = None
		vDefault = None
		decMin = 0
		decMax = 0
		decDefault = 0

		if 'name' in p.attrib:
			vName = p.attrib['name']
		if 'min' in p.attrib:
			vMin = float(p.attrib['min'])
			decMin = len((p.attrib['min']+".").split(".")[1])
		if 'max' in p.attrib:
			vMax = float(p.attrib['max'])
			decMax = len((p.attrib['max']+".").split(".")[1])
		if 'default' in p.attrib:
			vDefault = float(p.attrib['default'])
			decDefault = len((p.attrib['default']+".").split(".")[1])

		# Build body
		vBody = ElementTree.tostring(p, method="html", encoding="utf-8").decode("utf-8").strip()
		vBody = RE_STRIPTAG.sub(u"", vBody).strip()
		vBody = escape(vBody)

		parmDict[vName] = {
			'_id'		: vName,
			'type' 	 	: 'num',
			'def'	 	: vDefault,
			'value': {
				'min' 	: vMin,
				'max' 	: vMax,
				'dec'	: max(decMin, decMax, decDefault, 2)
			},
			'info': {
				'name'	: vName,
				'desc'	: vBody,
				'short'	: genShort(vName),
				'book'	: "",
				'group' : groupName
			},
			'corr': {
				'obs' : [],
				'tun' : []
			},
			'_meta': {
				'file': fileName
			}
		}

	return parmDict

def getFlags(xml):
	flags = xml.findall("./flag")
	flagDict = {}
	for f in flags:
		vName = ""
		vDefault = "on"

		if 'name' in p.attrib:
			vName = p.attrib['name']
		if 'default' in p.attrib:
			vDefault = p.attrib['default']

		# Build body
		vBody = ElementTree.tostring(p, method="html", encoding="utf-8").decode("utf-8").strip()
		vBody = RE_STRIPTAG.sub(u"", vBody).strip()
		vBody = escape(vBody)

		flagDict[vName] = {
			'_id'		: vName,
			'type' 	 	: 'bool',
			'def'	 	: vDefault,
			'value': {
			},
			'info': {
				'name'	: vName,
				'desc' 	: vBody,
				'short'	: genShort(vName),
				'book'	: ""
			},
			'corr': {
				'obs' : [],
				'tun' : []
			}
		}

	return flagDict

def collectParams(baseDir):

	# List all xml files in the directory
	refFiles = glob.glob("%s/*.xml" % baseDir)

	# Parse xml files
	parms = {}
	for rf in refFiles:

		# Parse XML
		print "Parsing %s..." % rf,
		try:
			xml = parseXML(rf)
			if not xml:
				continue
		except ElementTree.ParseError as e:
			print "error"
			print "  %s" % str(e)
			continue

		# Get properties
		parm = getParms( xml, rf )

		# Unify
		parms = dict(parms.items() + parm.items())
		print "ok"

	# Return
	return parms


tunables = collectParams("/Users/icharala/Downloads/pythia8186/xmldoc")
print "%i parameters" % len(tunables)

keys = tunables.keys()
for k in sorted(keys):
	v = tunables[k]
	print " %40s %10s %10s %10s" % (k.ljust(40), v['value']['min'], v['value']['max'], v['def'])


# print json.dumps(tunables, sort_keys=True, indent=2, separators=(',', ': '))
# print json.dumps(tunables, sort_keys=True, indent=2, separators=(',', ': '))

# # Submit tunables CouchDB
# if True:
# 	import couchdb
# 	couch = couchdb.Server('http://test4theory.cern.ch/vas/db/')
# 	db_obs = couch['tunables']

# 	for k,tun in tunables.iteritems():
# 		print "Commiting %s..." % k
# 		db_obs.save(tun)

