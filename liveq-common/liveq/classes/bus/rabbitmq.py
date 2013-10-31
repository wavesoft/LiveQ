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
		#: The server to connect to
		self.SERVER = config['server']

		#: Enable acknowledgement if asked to by the user
		self.ACK = False
		if 'ack' in config:
			self.ACK = config['ack'].lower() in ('yes', 'on', 'true')

		# Check the names of the queues we want to serve
		self.SERVE_QUEUES = [ ]
		if 'serve' in config:

			# Store in array
			self.SERVE_QUEUES = str(config['serve'].split(","))


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
	
	def __init__(self, bus, name, serve=None):
		"""
		Initialize the ZeroMQ Channel
		"""
		BusChannel.__init__(self, name)

		# Prepare variables
		self.bus = bus
		self.name = name
		self.logger = logging.getLogger("rabbitmq-channel")
		self.running = False
		self.queue = Queue.Queue()
		self.waitQueue = { }
		self.qname = name

		# Reply variables
		self.replyQueue = None
		self.replyID = None

		# Check if we should serve this channel
		if serve == None:
			serve = name in bus.config.SERVE_QUEUES
		self.serve = serve

		# Register shutdown handler
		GlobalEvents.System.on('shutdown', self.systemShutdown)

		# Prepare base prefix and counter for tagging messages
		self.id_counter = 0
		self.id_base = ''.join(random.choice(string.ascii_uppercase + string.digits) for x in range(20))

		# Start the I/O thread
		self.thread = threading.Thread(target=self.ioThread)
		self.thread.start()

	def ioThread(self):
		"""
		Incoming messages thread
		"""

		# Set us as running
		self.running = True

		# Auto-resume on errors
		while self.running:
			try:

				# Establish a blocking connection to the RabbitMQ server
				connection = pika.BlockingConnection(pika.ConnectionParameters(
							   self.bus.config.SERVER ))

				# Create and setup output channel
				channel = connection.channel()

				# Ensure i/o queue exists
				channel.queue_declare(queue=self.qname)

				# Create anonymous response queue
				result = channel.queue_declare(exclusive=True)
				callbackQueue = result.method.queue

				# Setup callback queue for RPC responses
				channel.basic_consume(self.onResponseArrived,
							  queue=callbackQueue,
							  no_ack=True)

				# If we are serving the specified queue, make us
				# a consumer on it.
				if self.serve:
					self.logger.info("Serving requests on rabbitMQ channel %s" % self.qname)

					# Listen for events
					channel.basic_consume(self.onMessageArrived,
								  queue=self.qname,
								  no_ack=not self.bus.config.ACK)

				# Start consumer
				self.logger.info("RabbitMQ channel %s [>%s] is live" % (self.qname, callbackQueue))
				while self.running:

					# Process events
					connection.process_data_events()

					# If we have data to send, send them now
					while not self.queue.empty():

						# Fetch message
						msg = self.queue.get()

						# If that's a reply, use the callbackQueue
						self.logger.debug("[%s] Sending %r" % (self.qname, msg['data']))
						channel.basic_publish(exchange='',
							  routing_key=msg['queue'],
							  properties=pika.BasicProperties(
									correlation_id  = msg['id'],
									reply_to = callbackQueue
									),
							  body=msg['data'])


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
					self.logger.error("RabbitMQ Error: %s:%s" %  (e.__class__.__name__, str(e)))
					time.sleep(5)

	def systemShutdown(self):
		"""
		Handle shutdown
		"""
		
		# Close the channel
		self.close()

	def close(self):
		"""
		Close the RabbitMQ channel
		"""

		# Mark as not running
		self.running = False

	def onResponseArrived(self, ch, method, properties, body):
		"""
		Callback function that receives responses from the callback queue
		"""
		self.logger.debug("[%s] Response Received %r" % (self.qname, body))

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
			record['data'] = data['data']
			record['event'].set()

	def onMessageArrived(self, ch, method, properties, body):
		"""
		Callback function that receives messages from input queue
		"""
		self.logger.debug("[%s] Received %r" % (self.qname, body))

		# Decode data
		data = None
		try:
			data = json.loads(body)
		except TypeError as e:
			self.logger.debug("[%s] Invalid message arrived: Not in JSON" % self.name )
			return

		# Store the message ID for replying
		self.replyID = properties.correlation_id
		self.replyQueue = properties.reply_to

		# Dispatch data
		self.trigger(data['name'], data['data'])

		# Disable reply()
		self.replyID = None
		self.replyQueue = None

		# Acknowlege delivery
		if self.bus.config.ACK:
			ch.basic_ack(delivery_tag = method.delivery_tag)

	def _nextID(self):
		"""
		Calculate the next ID
		"""
		self.id_counter += 1
		return "%s:%i" % (self.id_base, self.id_counter)

	def send(self, name, data, waitReply=False, timeout=30):
		"""
		Sends a message to the bus
		"""

		# Calculate mid and get queue name
		mid = self._nextID()

		# Prepare data to send
		data = {
				'data': json.dumps({
					'name': name,
					'data': data
				}),
				'id': mid,
				'queue': self.qname
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
			del self.waitQueue[mid]
			return record['data']


	def reply(self, data):
		"""
		Reply to a message on the bus
		"""

		# Check if we cannot reply
		if not self.replyQueue:
			return

		# Prepare data to send
		data = {
				'data': json.dumps({
					'data': data
				}),
				'id': self.replyID,
				'queue': self.replyQueue
			}

		# Queue data to the egress queue
		self.queue.put(data)

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

	def openChannel(self, name, serve=None):
		"""
		Open ZeroMQ Channel
		"""
		return RabbitMQChannel(self, name, serve=serve)
