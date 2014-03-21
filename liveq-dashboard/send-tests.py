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

# ----------
import sys
sys.path.append("../liveq-common")
# ----------

from liveq import handleSIGINT
from liveq.reporting.lars import LARS

# Initialize LARS with defaults
LARS.initialize(name="developer")

# Open a job manager
LARS.openEntity("components/job-manager", "jmliveq-master@t4t-xmpp.cern.ch/mobile-node-2", alias="jm")

LARS.get("jm").set("name", 4).add("surname", 51)

LARS.get("jm").keepalive()

handleSIGINT()