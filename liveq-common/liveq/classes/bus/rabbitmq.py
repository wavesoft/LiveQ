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

		# Register shutdown handler
		GlobalEvents.SystemEvents.on('shutdown', self.systemShutdown)

		# Start main thread
		self.consumerThread = threading.Thread(target=_channelThread)
		self.consumerThread.start()

	"""
	Main thread of the RabbitMQ Pika instance
	(It's not thread-safe)
	"""
	def _channelThread(self):

		# Establish a blocking connection to the RabbitMQ server
		self.connection = pika.BlockingConnection(pika.ConnectionParameters(
		               self.bus.config.SERVER ))

		# Create channels for incoming and outgoing messages
		self.outgoing = self.connection.channel()
		self.incoming = self.connection.channel()		

		# Prepare the appropriate names for the queues
		qname_in = "%s:in"
		qname_out = "%s:out"

		# Flip names if we are told to do so by the config
		if self.bus.config.FLIP_QUEUES:
			tmp = qname_out
			qname_out = qname_in
			qname_in = tmp

		# Ensure queues exist
		self.outgoing.queue_declare(qname_out)
		self.incoming.queue_declare(qname_in)

		# Setup callbacks
		self.incoming.basic_consume(self.onMessageArrived,
                      queue=qname_in)

		# Start consumer
		self.incoming.start_consuming()

	"""
	Handle shutdown
	"""
	def systemShutdown(self):

		# Stop pika consumer
		self.incoming.stop_consuming()

	"""
	Callback function that receives messages from input queue
	"""
	def onMessageArrived(ch, method, properties, body):
	    print " [x] Received %r" % (body,)

	    # Acknowlege delivery
	    ch.basic_ack(delivery_tag = method.delivery_tag)

	"""
	Sends a message to the bus
	"""
	def send(self, name, data, waitReply=False, timeout=30):

		# Pack data to send
		jsonData = json.dumps({
			'name': name,
			'data': data
			})

		# Send data

		pass

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
