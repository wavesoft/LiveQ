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
import logging
import threading
import time
import pika
import uuid

from liveq.events import GlobalEvents
from liveq.io.bus import Bus, BusChannel, NoBusChannelException, BusChannelException
from liveq.config.classes import BusConfigClass

"""
Configuration endpoint
"""
class Config(BusConfigClass):

	"""
	Populate the ZeroMQ Bus configuration
	"""
	def __init__(self,config):
		self.SERVER = config['server']

		# If we are a server, flip queue directions
		self.FLIP_QUEUES = False
		if 'role' in config:
			if config['role'].lower() = 'server':
				self.FLIP_QUEUES = True

	"""
	Create an ZeroMQ Bus instance
	"""
	def instance(self, runtimeConfig):
		return RabbitMQBus(self)


"""
ZeroMQ Bus channel
"""
class RabbitMQChannel(BusChannel):
	
	"""
	Initialize the ZeroMQ Channel
	"""
	def __init__(self, bus, name):
		BusChannel.__init__(self, name)

		# Prepare variables
		self.bus = bus
		self.name = name
		self.logger = logging.getLogger("rabbitmq-channel")
		self.running = True
		self.queue = Queue.Queue()
		self.waitQueue = { }

		# Prepare the appropriate names for the queues
		self.qname_in = "%s:in"
		self.qname_out = "%s:out"

		# Flip names if we are told to do so by the config
		if self.bus.config.FLIP_QUEUES:
			tmp = self.qname_out
			self.qname_out = qname_in
			self.qname_in = tmp

		# Register shutdown handler
		GlobalEvents.SystemEvents.on('shutdown', self.systemShutdown)

		# Start ingress and egress threads
		self.threadIn = threading.Thread(target=self.ingressThread)
		self.threadOut = threading.Thread(target=self.egressThread)
		self.threadIn.start()
		self.threadOut.start()

	"""
	Incoming messages thread
	"""
	def ingressThread(self):

		# Establish a blocking connection to the RabbitMQ server
		connection = pika.BlockingConnection(pika.ConnectionParameters(
		               self.bus.config.SERVER ))

		# Create and setup channel
		channel = self.connection.channel()		

		# Ensure queue exists
		channel.queue_declare(self.qname_in)

		# Setup callbacks
		channel.basic_consume(self.onMessageArrived,
                      queue=self.qname_in)

		# Start consumer
		self.incoming.start_consuming()


	"""
	Outgoing messages thread
	"""
	def egressThread(self):
		
		# Establish a blocking connection to the RabbitMQ server
		connection = pika.BlockingConnection(pika.ConnectionParameters(
		               self.bus.config.SERVER ))

		# Create and setup channel
		channel = self.connection.channel()		

		# Ensure queue exists
		channel.queue_declare(self.qname_out)

		# Start listening on the outgoing queue
		while self.running:
			
			# If we have data to send, send them now
			if not self.queue.empty():
				data = self.queue


	"""
	Handle shutdown
	"""
	def systemShutdown(self):

		# Kill pika threads
		signal.kill( self.threadIn )
		signal.kill( self.threadOut )

	"""
	Callback function that receives messages from input queue
	"""
	def onMessageArrived(ch, method, properties, body):
	    print " [x] Received %r" % (body,)

	    # Decode data
	    data = None
	    try:
	    	data = json.loads(body)
	    except TypeError as e:
			self.logger.debug("[%s] Invalid message arrived: Not in JSON" % self.name )
			return

		# Dispatch data
		self.trigger(data['name'], data['data'])

	    # Acknowlege delivery
	    ch.basic_ack(delivery_tag = method.delivery_tag)

	"""
	Sends a message to the bus
	"""
	def send(self, name, data, waitReply=False, timeout=30):

		# Prepare data to send
		mid = uuid.uuid4().hex
		data = {
				'data': {
					'name': name,
					'data': data
				},
				'id': mid
			}

		# Queue data to the egress queue
		self.queue.put(data)

		# If we are waiting for response, register this mid on the waiting list
		if waitReply:

			# Prepare data
			event = threading.Event()
			record = {
				'event' : event,
				'data' : None
			}

			# Register on waiting queue
			self.waitQueue[mid] = record

			# Lock on event
			event.wait(timeout)

			# Check if we just timed out
			if not event.is_set():
				self.logger.debug("[%s] Timeout waiting response on #%s" % (self.name, mid) )
				del self.waitQueue[mid]
				return None

			# Otherwise return the data received
			return record['data']


	"""
	Reply to a message on the bus
	"""
	def reply(self, data):
		pass

"""
ZeroMQ Bus instance
"""
class RabbitMQBus(Bus):
	
	"""
	Create an instance of a ZeroMQ Bus
	"""
	def __init__(self, config):
		Bus.__init__(self)

		# Store config
		self.config = config

		# Register shutdown handler
		GlobalEvents.SystemEvents.on('shutdown', self.systemShutdown)

	"""
	System shutdown occured
	"""
	def systemShutdown(self):
		self.connection.close()

	"""
	Open ZeroMQ Channel
	"""
	def openChannel(self, name):
		return RabbitMQChannel(self, name)
