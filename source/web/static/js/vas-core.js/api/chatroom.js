/**
 * [core/api/chatroom] - Chatroom API
 */
define(["core/util/event_base", "core/config"], 

	function(EventBase, Config) {

		/**
		 * APISocket Chatroom
		 */
		var APIChatroom = function(apiSocket, chatroom) {

			// Initialize superclass
			EventBase.call(this);

			// Setup properties
			this.apiSocket = apiSocket;
			this.chatroom = chatroom;
			this.active = true;

			// Join chatroom
			this.apiSocket.send('chatroom.select', { 'chatroom': chatroom } );

		}

		// Subclass from EventBase
		APIChatroom.prototype = Object.create( EventBase.prototype );

		/**
		 * Handle chatroom event
		 */
		APIChatroom.prototype.handleAction = function(action, data) {
			if (!this.active) return;
			console.log("Chat action:",action,data);
			if (action == "chatroom.join") {
				this.trigger('join', data);
			} else if (action == "chatroom.leave") {
				this.trigger('leave', data);
			} else if (action == "chatroom.chat") {
				this.trigger('chat', data);
			} else if (action == "chatroom.presence") {
				this.trigger('presence', data);
				for (var i=0; i<data['users'].length; i++) {
					this.trigger('join', { 'user': data['users'][i] });
				}
			}
		}

		/**
		 * Send a chat message to the chatroom
		 */
		APIChatroom.prototype.send = function(chat) {
			if (!this.active) return;
			this.apiSocket.send('chatroom.chat', { 'message': chat });
		}

		/**
		 * Close and lock channel
		 */
		APIChatroom.prototype.close = function() {
			// Prohibit any furher usage
			if (!this.active) return;
			this.active = false;

			// Fire close event
			this.trigger('close');
		}

		// Return the Chatroom class
		return APIChatroom;

	}

);