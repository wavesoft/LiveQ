
define(["core/util/event_base", "sha1", "core/config", "core/ui", "core/api/chatroom" ], 

	function( EventBase, SHA1, Config, UI, APIChatroom ) {

		/**
		 * The APISocket class provides all the required functionality to interact in real time
		 * with other APISocket members.
		 *
		 * @class
		 * @classdesc The APISocket class
		 * @see {@link module:core/util/event_base~EventBase|EventBase} (Parent class)
		 */
		var APISocket = function( hostDOM ) {

			// Initialize superclass
			EventBase.call(this);

			// Initialize properties
			this.connected = false;
			this.chatroom = null;
			this.loginCallback = null;

		}

		// Subclass from EventBase
		APISocket.prototype = Object.create( EventBase.prototype );

		/**
		 * Connect to the APISocket server
		 */
		APISocket.prototype.connect = function(url) {
			try {

				// Create new websocket instance
				this.socket = new WebSocket(url);

				// -----------------------------------------------------------
				// Bind a listener to the incoming WebSocket Data
				// This listener supports both binary and text data receiving
				// 
				this.socket.onmessage = (function(event) {
					// Convert data to JSON
					var data = JSON.parse(event.data);
					// Extract parameters
					var param = data['param'] || { };
					// Handle action
					this.handleActionFrame( data['action'], param );
				}).bind(this);

				// -----------------------------------------------------------
				// Upon connection, we will need to send handshake and request 
				// the initial configuration for the histograms.
				// 
				this.socket.onopen = (function() {
					this.trigger('ready');
					this.connected = true;
				}).bind(this);

				// -----------------------------------------------------------
				// If for any reason the socket is closed, retry connection
				//
				this.socket.onclose = (function() {
					this.trigger('error', 'Disconnected from the APISocket socket!');
					this.connected = false;
				}).bind(this);

				// -----------------------------------------------------------
				// Handle socket errors
				//
				this.socket.onerror = (function(ws, error) {
					this.trigger('error', 'Error while trying to connect to the API socket!');
					this.connected = false;
				}).bind(this);

			}
			catch (e) {
				this.trigger('error', 'Could not connect to the API socket! ' + String(e));
				this.connected = false;
			}
		}

		/**
		 * Send an action frame
		 */
		APISocket.prototype.send = function( action, parameters ) {

			// Prepare data to send
			var param = parameters || { };

			// Send command
			this.socket.send(JSON.stringify({
				"action": action,
				"param": param
			}));

		}

		/**
		 * Handle an action frame that arrives from the APISocket channel
		 */
		APISocket.prototype.handleActionFrame = function( action, parameters ) {

			// Handle chatroom events
			if ((action.substr(0,9) == "chatroom.") && this.chatroom) {
				this.chatroom.handleAction(action, parameters);
			}

			// Handle login events
			else if (action == "user.login.success") {
				this.loginCallback(parameters);
			}

			// Handle errors
			else if (action == "error") {
				UI.logError(parameters['message']);
			}

		}

		///////////////////////////////////////////////////////////////
		//                    PUBLIC API INTERFACE                   //
		///////////////////////////////////////////////////////////////

		/**
		 * Join the given chatroom
		 */
		APISocket.prototype.openChatroom = function( chatroom ) {

			// Abort any previous chatroom instance
			if (this.chatroom)
				this.chatroom.close();

			// Return new chatroom API interface
			return this.chatroom = new APIChatroom(this, chatroom);

		}

		/**
		 * Try to log user-in
		 */
		APISocket.prototype.login = function( user, password, callback ) {

			// Try to log user in
			this.send('user.login', {
				'user': user,
				'password': password
			});

			// Register the callback to fire on 'user.login.callback'
			this.loginCallback = function(parameters) {
				callback(parameters['user_profile']);
			};
		}

		/**
		 * Return a APISocket singleton
		 */
		var APISocket = new APISocket();
		return APISocket;

	}
	
);