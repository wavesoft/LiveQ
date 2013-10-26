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

"""
RabbitMQ Bus implementation

This class provides an RabbitMQ bus implementation.
"""

import Queue
import logging
import threading
import time
import pika
import uuid
import signal
import json
import random
import string
import socket

from liveq.events import GlobalEvents
from liveq.io.bus import Bus, BusChannel, NoBusChannelException, BusChannelException
from liveq.config.classes import BusConfigClass

class Config(BusConfigClass):
	"""
	Configuration endpoint for the RabbitMQ Bus
	"""

	def __init__(self,config):
		"""
		Populate the ZeroMQ Bus configuration
		"""
		self.SERVER = config['server']

		# If we are a server, flip queue directions
		self.FLIP_QUEUES = False
		if 'role' in config:
			if config['role'].lower() == 'server':
				self.FLIP_QUEUES = True

	def instance(self, runtimeConfig):
		"""
		Create an ZeroMQ Bus instance
		"""
		return RabbitMQBus(self)


class RabbitMQChannel(BusChannel):
	"""
	RabbitMQ Bus channel

	Upon initialization, this channel will start two threads
	with two individual connections to the RabbitMQ server.
	The first will be used for sending data to the input queue
	and the other one will be used for receiving from the output queue.

	This limitation is introduced because of the lack of thread safety
	in the pika implementation.
	"""
	
	def __init__(self, bus, name):
		"""
		Initialize the ZeroMQ Channel
		"""
		BusChannel.__init__(self, name)

		# Prepare variables
		self.bus = bus
		self.name = name
		self.logger = logging.getLogger("rabbitmq-channel")
		self.running = True
		self.queue = Queue.Queue()
		self.waitQueue = { }

		# Prepare the appropriate names for the queues
		self.qname_in = "%s:in" % name
		self.qname_out = "%s:out" % name

		# Flip names if we are told to do so by the config
		if self.bus.config.FLIP_QUEUES:
			tmp = self.qname_out
			self.qname_out = self.qname_in
			self.qname_in = tmp

		# Register shutdown handler
		GlobalEvents.System.on('shutdown', self.systemShutdown)

		# Prepare base prefix and counter for tagging messages
		self.id_counter = 0
		self.id_base = ''.join(random.choice(string.ascii_uppercase + string.digits) for x in range(20))

		# Start ingress and egress threads
		self.threadIn = threading.Thread(target=self.ingressThread)
		self.threadOut = threading.Thread(target=self.egressThread)
		self.threadIn.start()
		self.threadOut.start()

	def ingressThread(self):
		"""
		Incoming messages thread
		"""

		# Auto-resume on errors
		while self.running:
			try:

				# Establish a blocking connection to the RabbitMQ server
				connection = pika.BlockingConnection(pika.ConnectionParameters(
							   self.bus.config.SERVER ))

				# Create and setup channel
				channel = connection.channel()		

				# Ensure queue exists
				channel.queue_declare(self.qname_in)

				# Setup callbacks
				channel.basic_consume(self.onMessageArrived,
							  queue=self.qname_in)

				# Start consumer
				self.logger.info("RabbitMQ Input channel %s is live" % self.qname_in)
				channel.start_consuming()

			except pika.exceptions.AMQPConnectionError as e:

				# We got a connection error. Retry in a while
				self.logger.error("Connection error to RabbitMQ server %s (%s)" % (self.bus.config.SERVER, str(e)))
				time.sleep(5)

			except Exception as e:

				# Check for bad file description (means we disconnected)
				if 'Bad file descriptor' in str(e):
					self.logger.error("Disconnected from RabbitMQ server %s (%s)" % (self.bus.config.SERVER, str(e)))
					time.sleep(5)

				# Otherwise a more critical error occured
				else:
					self.logger.error("RabbitMQ Error: %s" % str(e))
					time.sleep(5)



	def egressThread(self):
		"""
		Outgoing messages thread
		"""
		
		# Auto-resume on errors
		while self.running:
			try:
				# Establish a blocking connection to the RabbitMQ server
				connection = pika.BlockingConnection(pika.ConnectionParameters(
							   self.bus.config.SERVER ))

				# Create and setup channel
				channel = connection.channel()		

				# Ensure queue exists
				channel.queue_declare(self.qname_out)

				# Start listening on the outgoing queue
				self.logger.info("RabbitMQ Output channel %s is live" % self.qname_out)
				while self.running:
					
					# If we have data to send, send them now
					if not self.queue.empty():

						# Fetch data
						data = self.queue.get()

						# Send data
						print " [%s] Sending %r" % (self.qname_out, data['data'])

						# Send
						channel.basic_publish(exchange='',
		                      routing_key=self.qname_out,
		                      properties=pika.BasicProperties(
		                            correlation_id  = data['id']
		                            ),
		                      body=data['data'])

					# A small idle loop
					time.sleep(0.05)

			except pika.exceptions.AMQPConnectionError as e:

				# We got a connection error. Retry in a while
				self.logger.error("Connection error to RabbitMQ server %s (%s)" % (self.bus.config.SERVER, str(e)))
				time.sleep(5)

			except Exception as e:

				# Check for bad file description (means we disconnected)
				if 'Bad file descriptor' in str(e):
					self.logger.error("Disconnected from RabbitMQ server %s (%s)" % (self.bus.config.SERVER, str(e)))
					time.sleep(5)

				# Otherwise a more critical error occured
				else:
					self.logger.error("RabbitMQ Error: %s" % str(e))
					time.sleep(5)

	def systemShutdown(self):
		"""
		Handle shutdown
		"""
		
		# Mark as not running
		self.running = False


	def onMessageArrived(self, ch, method, properties, body):
		"""
		Callback function that receives messages from input queue
		"""
		print " [%s] Received %r" % (self.qname_in, body)

		# Decode data
		data = None
		try:
			data = json.loads(body)
		except TypeError as e:
			self.logger.debug("[%s] Invalid message arrived: Not in JSON" % self.name )
			return

		# Check if somebody waits for a response on this mid
		if properties.correlation_id  in self.waitQueue:

			# Fetch record
			record = self.waitQueue[properties.correlation_id ]

			# Update data and notify
			record['data'] = data
			record['event'].set()

			# Acknowlege delivery
			ch.basic_ack(delivery_tag = method.delivery_tag)

			# And do nothing more
			return

		# Store the message ID for replying
		self.replyID = properties.correlation_id

		# Dispatch data
		self.trigger(data['name'], data['data'])

		# Disable reply()
		self.replyID = None

		# Acknowlege delivery
		ch.basic_ack(delivery_tag = method.delivery_tag)

	def _nextID(self):
		"""
		Calculate the next ID
		"""
		self.id_counter += 1
		return "%s:%i" % (self.id_base, self.id_counter)

	def send(self, name, data, waitReply=False, timeout=30, mid=None):
		"""
		Sends a message to the bus
		"""

		# Calculate message id if it's not specified
		if not mid:
			mid = self._nextID()

		# Prepare data to send
		data = {
				'data': json.dumps({
					'name': name,
					'data': data
				}),
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


	def reply(self, data):
		"""
		Reply to a message on the bus
		"""

		# Send as a message on the reply bus with the associated replyID
		self.send("", data, mid=self.replyID)

class RabbitMQBus(Bus):
	"""
	RabbitMQ Bus instance
	"""
	
	def __init__(self, config):
		"""
		Create an instance of a ZeroMQ Bus
		"""
		Bus.__init__(self)

		# Store config
		self.config = config

	def openChannel(self, name):
		"""
		Open ZeroMQ Channel
		"""
		return RabbitMQChannel(self, name)
