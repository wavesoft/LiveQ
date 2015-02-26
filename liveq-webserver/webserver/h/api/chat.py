
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

from liveq.io.bus import Bus

from webserver.h.api import APIInterface
from webserver.config import Config

class ChatInterface(APIInterface):

	def __init__(self, socket):
		"""
		Initialize the CHAT API interface
		"""
		APIInterface.__init__(self, socket, "chatroom")

		# Reset local variables
		self.chatroom = None

	def close(self):
		"""
		Cleanup logic when the channel is closed
		"""

		# Leave chatroom upon close
		self.leaveChatroom()

	def ready(self):
		"""
		When socket is ready, get the user reference
		"""

		# Keep a local reference of the user
		self.user = self.socket.user

	def handleAction(self, action, param):
		"""
		Handle chat actions
		"""

		# Select the chatroom to join
		if action == "select":
			# Join the specified chatroom
			self.selectChatroom( param['chatroom'] )

		# Exit current chatroom
		if action == "leave":
			# Leave chatroom
			self.leaveChatroom()

		elif action == "chat":
			# Send message to active chatroom
			if self.chatroom != None:
				self.chatroom.send("chat.chat", { 'user': self.user.displayName, 'message': param['message'] })

	####################################################################################
	# --------------------------------------------------------------------------------
	#                                 CHATROOM CALLBACKS
	# --------------------------------------------------------------------------------
	####################################################################################

	def onChatroomEnter(self, data):
		"""
		User joined the chartroom
		"""

		# Validate data
		if not 'user' in data:
			return

		# Send notification for user joining the chatroom
		self.sendAction("join", { "user": data['user'] })

	def onChatroomLeave(self, data):
		"""
		User left the chartroom
		"""
		
		# Validate data
		if not 'user' in data:
			return

		# Send notification for user joining the chatroom
		self.sendAction("leave", { "user": data['user'] })

	def onChatroomChat(self, data):
		"""
		User said something on the chatroom
		"""

		# Validate data
		if not 'user' in data:
			return

		# Send notification for user joining the chatroom
		self.sendAction("chat", { "user": data['user'], "message": data['message'] })

	####################################################################################
	# --------------------------------------------------------------------------------
	#                                 HELPER FUNCTIONS
	# --------------------------------------------------------------------------------
	####################################################################################

	def leaveChatroom(self):
		"""
		Leave previous chatroom
		"""

		# Leave previous chatroom
		if self.chatroom != None:

			# Remove me from chatroom
			key = "chat.%s" % self.chatroom.name
			Config.STORE.srem(key, self.user.displayName)

			# Leave channel
			self.chatroom.send('chat.leave', {'user':self.user.displayName})

			# Unbind functions
			self.chatroom.off('chat.enter', self.onChatroomEnter)
			self.chatroom.off('chat.leave', self.onChatroomLeave)
			self.chatroom.off('chat.chat', self.onChatroomChat)

			# Close channel
			self.chatroom.close()
			# Reset variable
			self.chatroom = None

	def selectChatroom(self, name):
		"""
		Join a particular chatroom
		"""

		# Leave previous chatroom
		self.leaveChatroom()

		# Join chatroom
		self.chatroom = Config.IBUS.openChannel("chat.%s" % name, flags=Bus.OPEN_BROADCAST | Bus.OPEN_BIND)

		# Add user in chatroom
		key = "chat.%s" % self.chatroom.name
		Config.STORE.sadd(key, self.user.displayName)

		# Get users in the channel
		roomUsers = list(Config.STORE.smembers(key))

		# Bind events
		self.chatroom.on('chat.enter', self.onChatroomEnter)
		self.chatroom.on('chat.leave', self.onChatroomLeave)
		self.chatroom.on('chat.chat', self.onChatroomChat)

		# Send presence
		self.sendAction("presence", { 'users': roomUsers })
		self.chatroom.send('chat.enter', {'user':self.user.displayName})
