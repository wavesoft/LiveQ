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

# This is a sendmail dummy script that just logs
# the standard input to a new file at a time
# (This is helpful for debugging mail mechanism)

import sys
import os
import datetime

# Default directory where to dump the e-mails
DUMP_DIR = "%s/sendmail.dump.local" % os.path.dirname(os.path.realpath(__file__))

# Make sure directory exists
if not os.path.exists(DUMP_DIR):
	os.mkdir(DUMP_DIR)

# Make sure the directory is a directory indeed
if not os.path.isdir(DUMP_DIR):
	os.path.stderr.write("ERROR: The specified dump directory is not a directory!\n")
	sys.exit(1)

# Pick a filename for dumping
with open("%s/dump-%s.eml" % (DUMP_DIR, str(datetime.datetime.now()).replace(":","_").replace(" ","_")), "w") as f:
	f.write(sys.stdin.read())
