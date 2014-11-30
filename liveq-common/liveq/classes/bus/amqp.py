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
AMQP Bus implementation

This class provides an efficient AMQP bus implementation. It's designed to be
used with RabbitMQ server, but any server that supports the AMQP protocol
could in principle be supported.

All the channels opened with this mechanism follow the same principle:

- There is an exchange prefix for the LiveQ framework called 'liveq.*'
- The 'liveq.direct' exchange is of type 'direct', meaning that receivers are picked in
  round-robin manner.
- The 'liveq.fanout' exchange is of type 'fanout', maning that it broadcasts the message
  to all receivers.

When a channel opens in serving mode:
- It will post messages with :routing_key equal to the queue name 
- It will create an anonymous queue where responses can be posted

When a channel opens in broadcast mode:
- It will bind an anonymous queue on the 'liveq.direct' exchange with :routing_key
  equal to the name of the channel

"""

import pdb

import Queue
import pika
import logging
import threading
import traceback
import time
import json
import cPickle as pickle
import uuid

from liveq.events import GlobalEvents
from liveq.io.bus import BusChannelException, NoBusChannelException, BusChannel, Bus
from liveq.config.classes import BusConfigClass

SYNC_TIMEOUT = 0.01

from pika.adapters.select_connection import SelectPoller
SelectPoller.TIMEOUT = SYNC_TIMEOUT

class Config(BusConfigClass):
	"""
	Configuration endpoint for the AMQP Bus
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

		# Exchange name to use for this bus
		self.EXCHANGE_NAME = "liveq"

		# Serializer to use
		self.SERIALIZER = "json"


	def instance(self, runtimeConfig):
		"""
		Create an ZeroMQ Bus instance
		"""
		return AMQPBus(self)

class AMQPBusChannel(BusChannel):
	"""
	A channel on a bus that the user can send messages or listen for other

	Events dispatched on this class:
	* ``open``	: When the channel is open
	* ``close``	: When the channel is closed
	* <message>	: When a message arrives from the bus. Each message has the name specified while sending it.
	"""

	def __init__(self, name, bus, consumer=False, exchange_type="direct"):
		"""
		Initialize event dispatcher
		"""

		# Setup parent
		BusChannel.__init__(self, name)
		self.consumer = consumer
		self.bus = bus

		# Empty containers
		self.instances = 1
		self.channel = None
		self.channel_ready = False
		self.primary_consumer_tag = None
		self.reply_consumer_tag = None
		self.reply_queue = None
		self.main_queue = None
		self.wait_queue = {}
		self.closing = False

		# Fail counter
		self.failure = False
		self.failCount = 0
		self.firstFailTime = 0

		self.last_reply_queue = None
		self.last_reply_uuid = None

		self.egress = Queue.Queue()

		# Synchronization helpers
		self.egress_lock = threading.Lock()
		self.processing_flag = False

		# Configuration
		self.routing_key = ""
		self.EXCHANGE = {
			'name' 			: "%s.%s" % (bus.config.EXCHANGE_NAME, exchange_type),
			'type' 		 	: exchange_type,
			'auto_delete'	: False,
			'durable' 		: True
		}

		# Queues are by default volatile
		self.QUEUE = {
			'name'			: name,
			'auto_delete' 	: True,
			'durable' 		: True,
			'ttl'			: 10000
		}

		# Create a logger
		self.logger = logging.getLogger("bus.amqp.%s" % name)

	def _channelOpen(self, channel):
		"""
		Callback from the AMQPBus when the channel is avaiable
		or when it has recovered from a connection loss.
		"""

		# Keep references
		self.channel = channel
		self.trigger('open')
		self.logger.info("Channel '%s' open" % self.name)

		# Set QoS
		self.channel.basic_qos(prefetch_count=1)

		# Channel is not ready
		self.channel_ready = False

		# Register a channel close listener for cases
		# where something went really wrong
		self.channel.add_on_close_callback(self._channelClosed)

		# Declare/connect to the core exchange
		self.bus.declare_exchange(
				  channel=self.channel,
				 callback=self._exchange_declared,
				 exchange=self.EXCHANGE['name'],
			exchange_type=self.EXCHANGE['type'],
				  durable=self.EXCHANGE['durable'],
			  auto_delete=self.EXCHANGE['auto_delete']
		)

	def _channelClosed(self, channel, reply_code, reply_text):
		"""
		Callback from the AMQPBus when the channel is lost
		because of a connection failure.
		"""

		# Acquire lock for egress sync
		self.egress_lock.acquire()

		# Clenaup channel
		self.trigger('close')
		self.channel = None

		# Channel is not ready
		self.channel_ready = False

		# Handle cases where this was not caused by the channel
		if (channel != None) and not self.closing:
			self.logger.warning("Channel closed unexpectidly (%s) %s" % (reply_code, reply_text))

			# Check for failures
			if self.failCount == 0:
				self.firstFailTime = time.time()

			# Increment fail counter
			self.failCount += 1
			if self.failCount > 4:
				# More than 4 failures within 10 seconds
				if time.time() - self.firstFailTime < 10:
					self.logger.error("Too many failures, will not re-open channel!")

					# Close channel
					self._close()
					
					# Interrupt any blocking wait operation
					for k,v in self.wait_queue.iteritems():
						v['data'] = None
						v['event'].set()
					self.wait_queue = {}

					# Mark channel as failed
					self.failure = True
					return

			# Try to serve a new channel to ourselves
			self.bus.serve_channel( self )	

		else:
			self.logger.info("Channel '%s' closed" % self.name)

		# Acquire lock for egress sync
		self.egress_lock.release()

	def _channelCleanup(self, fast=False):
		"""
		Callback from the AMQPBus when the channel should be
		gracefully stopped
		"""
		self.logger.debug("Cleaning-up channel")

		# Channel is not ready
		self.channel_ready = False

		# Interrupt any blocking wait operation
		for k,v in self.wait_queue.iteritems():
			v['data'] = None
			v['event'].set()

		# Cancel both consumers upon cleanup request
		if self.channel and not fast:
			self.logger.debug("Cancelling tags")
			if self.primary_consumer_tag:
				self.channel.basic_cancel(consumer_tag=self.primary_consumer_tag)
			if self.reply_consumer_tag:
				self.channel.basic_cancel(consumer_tag=self.reply_consumer_tag)

		self.logger.debug("Clearerd")

	def _exchange_declared(self, frame):
		"""
		This callback is fired when the exchange.declare RPC is completed
		"""
		self.logger.debug("Exchange (%s, type=%s) declared" % (self.EXCHANGE['name'], self.EXCHANGE['type']))

		# On fanout, create an anonymous queue
		queue = self.QUEUE['name']
		if self.EXCHANGE['type'] == "fanout":
			queue = ""

		# Declare main queue
		# (Even if we are consumers we need this in order
		#  to have the queue ready before binding)
		self.bus.declare_queue(
 				channel=self.channel,
			   callback=self._queue_primary_declared,
				  queue=queue,
			auto_delete=self.QUEUE['auto_delete'],
				durable=self.QUEUE['durable'],
			  arguments={
			  		'x-message-ttl': self.QUEUE['ttl']
			  	}
		)

	def _queue_primary_declared(self, queue):
		"""
		Callback when the main queue was declared
		"""
		self.logger.debug("Primary queue (%s) declared" % queue)
		self.main_queue = queue

		# Bind exchange messages targeting this queue on the queue
		self.channel.queue_bind(
				callback=self._queue_primary_bound,
				   queue=self.main_queue,
				exchange=self.EXCHANGE['name'],
			 routing_key=self.QUEUE['name']
			)

	def _queue_primary_bound(self, bind_frame):
		"""
		Callback when the primary queue is bound to the exchange
		"""
		self.logger.debug("Primary queue (%s) bound to exchange (%s)" % (self.main_queue, self.EXCHANGE['name']))

		# Declare an anonymous reply queue
		self.bus.declare_queue(
 				channel=self.channel,
			   callback=self._queue_reply_declared,
			  exclusive=True,
			auto_delete=True,
			  arguments={
			  		'x-message-ttl': self.QUEUE['ttl']
			  	}
		)

	def _queue_reply_declared(self, queue):
		"""
		Callback when the main queue was declared
		"""
		self.logger.debug("Reply queue (%s) declared" % queue)

		# Keep reference of the anonymous reply queue
		self.reply_queue = queue

		# Place a reply consumer on the reply queue
		self.reply_consumer_tag = self.channel.basic_consume(
			consumer_callback=self._on_reply,
				   	    queue=self.reply_queue,
			   	    exclusive=True,
			   	       no_ack=True
			)

		# If we are consumers, place a consumer callback on the queue callback
		if self.consumer:
			# Establish a basic consumer
			self.logger.debug("Starting consumer on primary queue (%s)" % self.main_queue)
			self.primary_consumer_tag = self.channel.basic_consume(
					consumer_callback=self._on_message,
					            queue=self.main_queue,
				)

		# Queues are initialized
		self._queues_initialized()

	def _queues_initialized(self):
		"""
		Callback fired when both queues are declared and initialized
		"""

		# Channel is ready for use
		self.channel_ready = True

		# Drain any pending egress messages & start flush pool
		self.bus.connection.add_timeout(SYNC_TIMEOUT, self._scheduled_flush)

	def _on_message(self, channel, method, properties, body):
		"""
		Callback when a message arrives from primary queue
		"""
		self.logger.debug("Message arrived (type=%s, reply_to=%s, correlation=%s)" % (properties.content_type, properties.reply_to, properties.correlation_id))

		# Don't accept messages when closing
		if self.closing:
			self.logger.warn("Ignoring incoming message because channel is closing")
			return

		# Mark that we are under processing
		self.processing_flag = True

		# Store last reply info
		self.last_reply_queue = properties.reply_to
		self.last_reply_uuid = properties.correlation_id

		# Unserialize body
		bodyData = self._unserialize( body, properties.content_type )
		self.logger.debug("Message arrived (name=%s)" % bodyData['name'])

		# Trigger event
		self.trigger( bodyData['name'], bodyData['data'] )

		# Acknowlege delivery
		self.channel.basic_ack(delivery_tag=method.delivery_tag)

		# Reset reply info
		self.last_reply_queue = None
		self.last_reply_uuid = None

		# Reset processing flag
		self.processing_flag = False

	def _on_reply(self, channel, method, properties, body):
		"""
		Callback when a message arrives from reply queue
		"""		
		reply_uuid = properties.correlation_id
		self.logger.debug("Reply arrived (uuid=%s) (%r)" % (reply_uuid, body))

		# Check if we have somebody in the wait queue under this correlation ID
		if reply_uuid in self.wait_queue:

			# Unserialize body directly on the wait_reply frame
			self.wait_queue[reply_uuid]['data'] = self._unserialize( 
				body, properties.content_type )

			# Trigger event
			self.wait_queue[reply_uuid]['event'].set()


	def _serialize(self, payload):
		"""
		Serialize the given payload and return a (payload, content_type) tuple
		"""
		if self.bus.config.SERIALIZER == "json":
			return (json.dumps(payload, ensure_ascii=False), "application/json")
		elif self.bus.config.SERIALIZER == "pickle":
			return (pickle.dumps(payload), "application/python-pickle")
		else:
			return (str(payload), "text/plain")

	def _unserialize(self, payload, contentType="application/json"):
		"""
		Serialize the given payload and return a content-type/payload tuple
		"""

		if contentType == "application/json":
			return json.loads(payload)
		elif contentType == "application/python-pickle":
			return pickle.loads(payload)
		else:
			return payload

	def _send_frame(self, frame):
		"""
		Send an egress frame

		Each frame follows the following syntax:
		{
			'type'		: '<0:Normal, 1:Waiting Reply, 2:Reply>'
			'uuid'  	: '<correlation id used on types 1 and 2>',
			'queue' 	: '<queue to reply, only for type 2>',
			'body'		: '<the body of the frame>',
			'body_type'	: '<the body content-type>'
		}

		"""

		# Setup parameters
		correlation_id = None
		reply_to = None
		exchange = ""
		routing_key = self.QUEUE['name']

		# Check frame type
		if frame['type'] == 0:
			# Normal message, no response
			exchange = self.EXCHANGE['name']
		elif frame['type'] == 1:
			# Message with response
			exchange = self.EXCHANGE['name']
			correlation_id = frame['uuid']
			reply_to = self.reply_queue
		elif frame['type'] == 2:
			# Reply message
			exchange = ""
			correlation_id = frame['uuid']
			routing_key = frame['queue']

		# Prepare properties for the outgoing frame
		properties = pika.BasicProperties(
				  content_type=frame['body_type'],
					  reply_to=reply_to,
				correlation_id=correlation_id
			)

		# Send a frame
		self.logger.debug("Sending frame (routing_key=%s, exchange=%s, correlation=%s, reply_to=%s)" % (routing_key, exchange, correlation_id, reply_to))
		self.channel.basic_publish(
				   body=frame['body'],
			   exchange=exchange,
			routing_key=routing_key,
			 properties=properties
			)

	def _flush_egress(self):
		"""
		Flush the egress queue
		"""

		# Acquire lock for egress sync
		self.egress_lock.acquire()

		# Flush the egress queue
		while not self.egress.empty():
			self._send_frame( self.egress.get() )

		# Release lock
		self.egress_lock.release()

	def _scheduled_flush(self):
		"""
		Flush and schedule next flush (should always be executed
		in the main AMQPBus thread)
		"""

		# Flush egress queue
		self._flush_egress()

		# If a close is pending, do it now
		if self.closing:
			# Run _close from the main thread
			self.bus.connection.add_timeout(SYNC_TIMEOUT, self._close)
			return

		# Only if we have a valid channel, fire next ioloop tick
		if self.channel and self.channel.is_open and self.bus.connection:
			self.bus.connection.add_timeout(SYNC_TIMEOUT, self._scheduled_flush)

	def _close(self):
		"""
		Fired by the close() functino when the channel is safe to be closed
		"""
		self.logger.debug("Closing channel '%s' NOW" % self.name)

		# Remove from cache
		if self.name in self.bus.channels:
			del self.bus.channels[self.name]

		# Close channel
		if self.channel:
			# Clenaup channel
			self._channelCleanup()
			# Close channel
			self.channel.close()

	#####################################
	# Bus Channel Interface
	#####################################

	def send(self, name, data, waitReply=False, timeout=30):
		"""
		Sends a message to the bus
		"""
		# If channel is in failure mode, accept no requests
		if self.failure:
			return None

		# Format message object according to specs
		frame_body = {
			'name': name,
			'data': data
		}

		# Serialize message frame
		(message_body, message_type) = self._serialize( frame_body )

		# Prepare transmission frame
		frame = {
			'type'		: 0,
			'body' 		: message_body,
			'body_type'	: message_type
		}

		# Check if we are waiting for reply
		reply_record = None
		if waitReply:

			# Create a uuid for this event
			reply_uuid = uuid.uuid4().hex
			frame['uuid'] = reply_uuid
			frame['type'] = 1

			# Create a reply record and place it on the wait queue
			reply_record = {
				'event': threading.Event(),
				'data' : None
			}
			self.wait_queue[reply_uuid] = reply_record

		# Place packet on egress queue
		self.egress_lock.acquire()
		self.egress.put(frame)
		self.egress_lock.release()

		# If we are waiting for reply, wait for the event to arrive
		if waitReply:

			# Wait for thee event
			reply_record['event'].wait(timeout)

			# Check if we just timed out
			if not reply_record['event'].is_set():
				self.logger.warning("Timeout waiting for reply on message %s" % frame['uuid'])
				del self.wait_queue[frame['uuid']]
				return None

			# Otherwise return the data received
			del self.wait_queue[frame['uuid']]
			if not ('data' in reply_record) or not reply_record['data']:
				return None
			return reply_record['data']['data']


	def reply(self, data):
		"""
		Reply to the last message received
		"""
		# If channel is in failure mode, accept no requests
		if self.failure:
			return None

		# Check if we actually have a reply data
		if not self.last_reply_uuid or not self.last_reply_queue:
			self.logger.warning("Trying to reply() on a message without reply support")
			return

		# Format message object according to specs
		frame_body = {
			'name': "_reply_",
			'data': data
		}

		# Serialize message frame
		(message_body, message_type) = self._serialize( frame_body )

		# Prepare transmission frame
		frame = {
			'type'		: 2,
			'body' 		: message_body,
			'body_type'	: message_type,
			'queue' 	: self.last_reply_queue,
			'uuid'		: self.last_reply_uuid,
		}

		# Stack frame on egress queue
		self.egress_lock.acquire()
		self.egress.put(frame)
		self.egress_lock.release()
	
	def close(self):
		"""
		Close the specified channel
		"""
		self.logger.debug("Will close channel")

		# Decrement instances
		self.instances -= 1
		if self.instances > 0:
			return

		# Mark as closing (will be closed by _scheduled_flush)
		self.closing = True


class AMQPBus(Bus, threading.Thread):
	"""
	A template class that should be inherited by the Bus driver

	Events dispatched on this class:
	* ``channel``	: When a channel is created by a remote request

	"""

	def __init__(self, config):
		"""
		Initialize bus
		"""
		Bus.__init__(self)
		threading.Thread.__init__(self)
		self.config = config

		# Initialize properties
		self.channels = {}
		self.connection = None
		self.shutdownFlag = False

		# Name of exchanges 
		self.cacheFlags = {
			'exchange' 	: {},
			'queue' 	: {}
		}

		# Create logger
		self.logger = logging.getLogger("bus.amqp")

		# Register on system shutdown
		GlobalEvents.System.on('shutdown', self.shutdown)

	def shutdown(self):
		"""
		Set shutdown flag on system shutdown
		"""
		self.logger.debug("Disconnecting from AMQP server")

		# Set shutdown flag
		self.shutdownFlag = True

		# Gracefully disconnect all channels
		for c in self.channels.values():
			# Asynchronously open a channel for the given bus channel
			c._channelCleanup(True)

		# Start connection ioloop in this thread until it exists
		if self.connection:
			self.connection.ioloop.stop()

		self.logger.warn("Disconnected from AMQP server")

	def on_server_connected(self, connection):
		"""
		[AMQP Callback] Connection established
		"""
		self.logger.info("Connection established")

		# Register disconnect callback
		self.connection.add_on_close_callback(self.on_server_disconnected)

		# Open AMQP channels for each one of the Bus channels
		for c in self.channels.values():
			# Asynchronously open a channel for the given bus channel
			self.connection.channel(on_open_callback=c._channelOpen)

	def on_server_disconnected(self, connection, reply_code, reply_text):
		"""
		[AMQP Callback] Connection lost
		"""

		# Deset cache 
		self.cacheFlags = {
			'exchange' 	: {},
			'queue' 	: {}
		}

		# Let all channels know that we are down
		for c in self.channels.values():
			c._channelClosed(None, reply_code, reply_text)

		# Check if this was induced
		if self.shutdownFlag:
			# Stop the core I/O loop
			self.connection.ioloop.stop()
		else:
			# Try to reconnect
			self.logger.debug("Connection interrupted (%s) %s. Reopening in 5 seconds" % (reply_code, reply_text))
			self.connection.add_timeout(5, self.reconnect)

	def serve_channel(self, busChannel):
		"""
		[AMQP] Try to serve a AMQP channel to the given bus channel
		"""

		# If we have a connection, which is valid, place a connection request
		if (self.connection != None) and (self.connection.is_open):
			self.logger.info("Openning channel '%s'" % busChannel)
			# Asynchronously open a channel for the given bus channel
			def asyncOpen():
				self.connection.channel(on_open_callback=busChannel._channelOpen)
			self.connection.add_timeout(SYNC_TIMEOUT, asyncOpen)
		else:
			self.logger.warn("Connection is not open in order to open channel. Will do when connected")


	def reconnect(self):
		"""
		[AMQP] Try to reconnect to the server
		"""

		# Stop old ioloop
		self.connection.ioloop.stop()

		# If we are not really closing, continue
		if not self.shutdownFlag:
			# Open a new connection
			self.connection = self.connect()
			# Start the new IO loop
			self.connection.ioloop.start()

	def connect(self):
		"""
		[AMQP] Connect to the server
		"""

		# Open an asynchronous pika connection to the AMQP server
		self.logger.info("Connecting to AMQP server %s" % self.config.SERVER)
		conn_parm = pika.ConnectionParameters(host=self.config.SERVER)
		return pika.SelectConnection(
				conn_parm,
				self.on_server_connected,
				stop_ioloop_on_close=False
			)

	def run(self):
		"""
		Main I/O thread where connection and channel processing is managed
		"""
		while not self.shutdownFlag:
			try:
				# Connect to the AMQP server
				self.connection = self.connect()
				# Start main loop
				self.connection.ioloop.start()

			except pika.exceptions.AMQPConnectionError as e:
				self.logger.error("AMQP Server went away. Will retry in 5 sec")
				time.sleep(5)

			except Exception as e:
				traceback.print_exc()
				self.logger.error("AMQP Error: %s (%s)" % (str(e), e.__class__.__name__))
				time.sleep(5)

	def declare_exchange(self, channel=None, callback=None, exchange=None, exchange_type=None, durable=None, auto_delete=False):
		"""
		Cache function to declare exchange only once and just resume any
		simmilar requests from cache
		"""

		# Check if this entry is cached
		if exchange in self.cacheFlags['exchange']:
			callback(None)
			return

		# Don't call this again
		self.cacheFlags['exchange'][exchange] = True

		# Declare/connect to the core exchange
		channel.exchange_declare(
				 callback=callback,
				 exchange=exchange,
			exchange_type=exchange_type,
				  durable=durable,
			  auto_delete=auto_delete
		)

	def declare_queue(self, channel=None, callback=None, exclusive=False, queue="", auto_delete=False, durable=False, arguments={}):
		"""
		Cache function to declare exchange only once and just resume any
		simmilar requests from cache
		"""

		self.logger.debug("-- declaring queue %s --" % queue)
		gotResponse = False

		# Check if this entry is cached
		if queue and queue in self.cacheFlags['queue']:
			callback(self.cacheFlags['queue'][queue])
			return

		#timeoutHandle = self.connection.add_timeout(0.5, pdb.set_trace)

		# Helper callback
		def queue_callback(method_frame):
			self.logger.debug("-- queue %s declared --" % queue)
			#self.connection.remove_timeout(timeoutHandle)

			# Get declared queue name
			queue_ref = method_frame.method.queue
			# Store on cache if not anonymous
			if queue:
				self.cacheFlags['queue'][queue] = queue_ref
			# Callback
			callback(queue_ref)

		# Declare/connect to the queue
		channel.queue_declare(
			   callback=queue_callback,
				  queue=queue,
		      exclusive=exclusive,
			auto_delete=auto_delete,
				durable=durable,
			  arguments=arguments
		)

	#####################################
	# Bus Interface
	#####################################

	def openChannel(self, name, flags=Bus.OPEN_DEFAULT, serve=None):
		"""
		Open a named channel on the bus.
		This function should return a BusChannel instance
		"""

		# Reuse channel
		if name in self.channels:
			# Increment instances
			self.channels[name].instances += 1
			# Return instance
			return self.channels[name]

		# Setup flags
		is_consumer = False
		exchange_type = "direct"
		if (flags & Bus.OPEN_BIND) != 0:
			is_consumer = True
		if (flags & Bus.OPEN_BROADCAST) != 0:
			exchange_type = "fanout"

		# Backwards compatibility
		if serve != None:
			if serve:
				flags |= Bus.OPEN_BIND
				is_consumer = True

		# Default fallback to configuration
		if flags == Bus.OPEN_DEFAULT and serve == None:
			if name in self.config.SERVE_QUEUES:
				flags |= Bus.OPEN_BIND
				is_consumer = True

		# Create a bus channel instance
		channel = AMQPBusChannel(name, self, is_consumer, exchange_type)
		self.channels[name] = channel

		# Start main thread if it's not already started
		if not self.isAlive():
			self.start()
		else:
			# Otherwise serve a AMQP channel to the given bus channel
			self.serve_channel( channel )

		# Return channel instance
		return channel
