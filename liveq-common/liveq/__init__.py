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

import os
import sys
import signal
import logging

from liveq.events import GlobalEvents

def handleSIGINT():
	"""
	Register a CTRL+C (SIGINT) handler and raise a system-wide ``shutdown`` signal
	that will gracefully shutdown all the components.
	"""

	# Register CTRL+C Handler
	def signal_handler(signum, frame):
		logging.info("** Caught signal. Shutting down **")
		GlobalEvents.System.trigger('shutdown')

		signal.signal(signum, signal.SIG_DFL)
		os.kill(os.getpid(), signum) # Rethrow signal, this time without catching it

	# Register sigint handler
	signal.signal(signal.SIGINT, signal_handler)
