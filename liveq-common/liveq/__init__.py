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

#: Globally available current exit code
exitCode = 0

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

def handleSIGUSR1():
	"""
	Register a (SIGUSR1) handler and raise a system-wide ``signal.usr1`` signal
	that is used for alerting an imminent shutdown.
	"""

	# Register CTRL+C Handler
	def signal_handler(signum, frame):
		logging.info("** Caught USR1 signal. Alerting users for an imminent reboot **")
		GlobalEvents.System.trigger('signal.usr1')

	# Register sigint handler
	signal.signal(signal.SIGUSR1, signal_handler)

def exit(code):
	"""
	Internal function to gracefully exit.

	This function signals the system-wide shutdown event before attempting to exit.
	"""

	# Send shutdown event
	GlobalEvents.System.trigger('shutdown')
	exitCode = code

	# Exit (Warning if called within thread, this will exit the thread)
	sys.exit(code)
