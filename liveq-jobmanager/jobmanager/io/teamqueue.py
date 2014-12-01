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

import sys
import time

import logging
import jobmanager.io.agents as agents
import jobmanager.io.jobs as jobs

from jobmanager.config import Config
from peewee import fn

from liveq.models import Agent, AgentGroup, Jobs

# Setup logger
logger = logging.getLogger("teamqueue")

def processTeamQueue():
	"""
	This should be called periodically to check and schedule jobs pending for the
	particular team
	"""
	pass

