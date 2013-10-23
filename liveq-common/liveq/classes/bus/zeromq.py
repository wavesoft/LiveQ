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

import Queue
import signal
import logging
import threading
import zmq
import time

from liveq.events import GlobalEvents
from liveq.io.bus import Bus, BusChannel, NoBusChannelException, BusChannelException
from liveq.config.classes import BusConfigClass

# Idle loop delay
IDLE_LOOP_DELAY = 0.01

# Timeout (in seconds) after sending a REQ message until we get a REP
REQUEST_TIMEOUT = 30

"""
Configuration endpoint
"""
class Config(BusConfigClass):

	"""
	Populate the database configuration
	"""
	def __init__(self,config):
		self.CHANNELS = { }

		# Lookup for channels in the configuration
		for k, v in config.iteritems():
			
			# Skip 'class'
			if (k == "class") or (k == "__name__"):
				continue

			# Parse channel information
			parts = k.split("-")
			if not parts[0] in self.CHANNELS:
				self.CHANNELS[parts[0]] = { 'addr': [], 'mode': '', 'topic': [] }
			if len(parts) < 2:
				raise Exception("Unexpected key '%s'" % k)

			# Store address
			if parts[1] == "addr":
				self.CHANNELS[parts[0]]['addr'] = v.split(',')
			elif parts[1] == "mode":
				self.CHANNELS[parts[0]]['mode'] = v
			elif parts[1] == "topic":
				self.CHANNELS[parts[0]]['topic'] = v.split(',')

	"""
	Create an ZeroMQ Bus instance
	"""
	def instance(self, runtimeConfig):
		return ZeroMQBus(self)


"""
ZeroMQ Bus channel
"""
class ZeroMQChannel(BusChannel):
	
	"""
	Initialize the ZeroMQ Channel
	"""
	def __init__(self, context, name, params):
		BusChannel.__init__(self, name)

		# Local variables
		self.name = name
		self.context = context
		self.params = params
		self.blocking = False
		self.logger = logging.getLogger("zmq-channel")
		self.mode = self.params['mode']

		# I/O Queues
		self.egress = Queue.Queue()
		self._lastData = None
		self._sentReply = False
		self._lastMessage = None

		# Start a event polling thread
		self.running = True
		self.monitorThread = threading.Thread(target=self.mainThread)
		self.monitorThread.start()

		# Register on system event queue in order to receive
		# shutdown event
		GlobalEvents.System.on('shutdown', self._shutdown)

	"""
	Shutdown handler
	"""
	def _shutdown(self, msg):

		# Disable and disconnect
		self.running = False

	"""
	Helper function to handle and dispatch the event for 
	the incoming message specified.

	This function also returns the parsed data if successful.
	"""
	def _handleMessage(self, msg):
		self.logger.debug("[%s] Received: %s" % (self.name, str(msg)))

		# Validate frame
		if not 'name' in msg:
			self.logger.warn("[%s] Invalid data arrived in socket" % self.name)
			return None

		# Dispatch event
		self._lastMessage = msg
		self.trigger( msg['name'], msg['data'] )

		# Return frame
		return msg['data']

	"""
	Main thread that receives messages from the channel

	TODO: Create different threads for PUB, SUB, REQ, and REP
	"""
	def mainThread(self):

		# Local flags
		skiprecv = False
		forcereply = False

		# Local variables
		socket = None
		pendingrecv = None

		# Depending on the channel type, create the
		# appropriate socket type.
		#
		# NOTE: Sockets must be created in the thread that
		#       is doing the actual I/O
		#
		if self.mode == 'pub':
			self.logger.debug("Creating a PUBLISH ZeroMQ Socket: %s" % self.name)
			socket = self.context.socket(zmq.PUB)	# Publisher
			socket.setsockopt(zmq.SUBSCRIBE, self.name)
			self.blocking = False

			# Receiving is not working on publishers
			skiprecv = True

			# Bind to the listing addresses
			for addr in self.params['addr']:
				self.logger.debug("Binding on %s" % addr)
				socket.bind( addr )

		elif self.mode == 'sub':
			self.logger.debug("Creating a SUBSCRIBE ZeroMQ Socket: %s" % self.name)
			socket = self.context.socket(zmq.SUB)	# Subscriber
			socket.setsockopt(zmq.SUBSCRIBE, self.name)
			self.blocking = False

			# Connect to the listing addresses
			for addr in self.params['addr']:
				self.logger.debug("Connecting to %s" % addr)
				socket.connect( addr )

		elif self.mode == 'req':
			self.logger.debug("Creating a REQUEST ZeroMQ Socket: %s" % self.name)
			socket = self.context.socket(zmq.REQ)	# Request
			self.blocking = True

			# Connect to the listing addresses
			for addr in self.params['addr']:
				self.logger.debug("Connecting to %s" % addr)
				socket.connect( addr )

		elif self.mode == 'rep':
			self.logger.debug("Creating a REPLY ZeroMQ Socket: %s" % self.name)
			socket = self.context.socket(zmq.REP)	# Reply
			self.blocking = True

			# Force a reply when we get a request
			forcereply = True

			# Bind to the listing addresses
			for addr in self.params['addr']:
				self.logger.debug("Binding on %s" % addr)
				socket.bind( addr )

		# Start main event loop
		while self.running and not socket.closed:

			# Check for timed out 'pending response' messages
			if pendingrecv != None:

				# Check for request timeout
				if (time.time() - pendingrecv['_timestamp']) > REQUEST_TIMEOUT:

					# Store None response and notify thread
					pendingrecv['response'] = None
					pendingrecv['event'].set()

					# Reset pending egress message
					pendingrecv = None

			# Process incoming messages only if we
			# are allowed to do so.
			if not skiprecv:

				# Non-blocking receiving of a message
				try:

					# Receive frame
					frame = socket.recv_json(zmq.NOBLOCK)

					# Check if this was a response to a blocked
					# message
					if pendingrecv != None:

						# Handle and store response
						pendingrecv['response'] = self._handleMessage( frame )

						# Notify thread
						pendingrecv['event'].set()

						# Reset pending egress message
						pendingrecv = None

					# Nope, this was a regilar incoming message
					else:

						# Handle reply and reset _sentReply flag
						# if nobody replies to the bus, we might have to
						# respond with a default "Unhandled" message
						self._sentReply = False
						self._handleMessage( frame )

						# Check if we should enforce reply and if nobody
						# responded just respond with an empty hash
						if forcereply and not self._sentReply:
							self.logger.warn("[%s] Adding void reply because no send() occured" % self.name)
							socket.send_json({})

				except zmq.ZMQError as e:

					# If anything else besides EAGAIN arrives, it means
					# that the socket encountered an error or it's closed
					if e.errno != zmq.EAGAIN:
						self.logger.error("[%s] ZeroMQ Error: %s" % (self.name, str(e)))


			# Process the egress queue since we can use socket
			# *ONLY* from this thread
			while not self.egress.empty() and (pendingrecv == None):

				# Pop and send message
				msg = self.egress.get()
				socket.send( msg['message'] )

				# If we are blocking, wait for response
				if self.blocking:

					# Mark the time it was sent in order to calculate timeouts
					msg['_timestamp'] = time.time()

					# This will also disable the egress processing
					# until a message is arrived
					pendingrecv = msg
					break


			# Sleep some time
			time.sleep(IDLE_LOOP_DELAY)


		# Let log receivers that we are through
		self.logger.debug("[%s] ZeroMQ thread exiting" % self.name)

	"""
	Sends a message to the bus
	"""
	def send(self, name, data):
		self.logger.debug("[%s] Sending: %s" % (self.name, str(data)))
		
		# Flag that we have responded (if required)
		self._sentReply = True

		# We cannot send data directly (ZeroMQ sockets
		# are not thread-safe). Therefore we are pushing
		# the message we want to send on the egress queue
		message = {
				'message': {
					'name': name,
					'data': data
				}
			}


		if not self.blocking:

			# In non-blocking mode we just schedule the message
			# and return nothing
			egress.put(message)
			return None

		else:
			# In blocking mode we are going to use a thread event to 
			# wait upon until a response is arrived.
			event = threading.Event()
			message['event'] = event
			message['response'] = { }

			# Queue message
			egress.put(message)

			# Lock thread, waiting for the event
			event.wait()

			# Return response
			return message['response']

	"""
	Reply to a message on the bus
	"""
	def reply(self, data):
		
		# In our case that's the same with reply
		return self.send(_lastMessage['name'], data)


"""
ZeroMQ Bus instance
"""
class ZeroMQBus(Bus):
	
	"""
	Create an instance of a ZeroMQ Bus
	"""
	def __init__(self, config):
		Bus.__init__(self)

		self.config = config
		self.context = zmq.Context()
		self.logger = logging.getLogger("zmq-bus")

	"""
	Open ZeroMQ Channel
	"""
	def openChannel(self, name):
		
		# Make sure we have the channel configured
		if not name in self.config.CHANNELS:
			raise NoBusChannelException(name)

		# Fetch parameters and sanitize input
		params = self.config.CHANNELS[name]
		if not params['mode'] in ( 'pub','sub','req','rep' ):
			raise BusChannelException("Unknown channel mode '%s'" % params['mode'])

		# Return a ZeroMQ Channel instance
		self.logger.debug("Oppening channel %s" % name)
		return ZeroMQChannel(self.context, name, params)
