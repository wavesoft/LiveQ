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

# This script parses the description.json file which contains 

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

specific = "-"
out_dir = "ref.local"
generator = "pythia8"
version = "170"

# Load descriptions json
data = {}
with open("%s/description.json" % out_dir, "r") as f:
	data = json.loads( "".join(f.readlines()) )

# Iterate over the description cache
checked = {}
for k,v in data.iteritems():
	(observable, beam, process, energy, params, cuts, group, name, analysis) = v[0]

	# Index to make sure we trim-out the fat
	index = "%s:%s:%s:%s:%s" % (beam, process, energy, params, cuts)
	if index in checked:
		continue
	checked[index] = True

	# Build up the run cards that we need for pythia
	print "%s %s %s %s %s %s %s" % (beam, process, energy, params, cuts, generator, version)

