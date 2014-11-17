
define(["core/util/event_base", "core/config"], 

	function( EventBase, Config ) {

		/**
		 * The community class provides all the required functionality to interact in real time
		 * with other community members.
		 *
		 * @class
		 * @classdesc The Community class
		 * @see {@link module:core/util/event_base~EventBase|EventBase} (Parent class)
		 */
		var Community = function( hostDOM ) {

			// Initialize superclass
			EventBase.call(this);

			// Initialize properties
			this.connected = false;

			// Start keepalive timer
			setInterval(this.__keepalivePoller.bind(this), 10000);

		}

		// Subclass from EventBase
		Community.prototype = Object.create( EventBase.prototype );

		/**
		 * Start the socket keepalive poller
		 */
		Community.prototype.__keepalivePoller = function() {
			if (this.connected) {
				this.send("io.keepalive");
			}
		}

		/**
		 * Connect to the community server
		 */
		Community.prototype.connect = function(url) {
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
					this.trigger('error', 'Disconnected from the community socket!');
					this.connected = false;
				}).bind(this);

				// -----------------------------------------------------------
				// Handle socket errors
				//
				this.socket.onerror = (function(ws, error) {
					this.trigger('error', 'Error while trying to connect to the community socket!');
					this.connected = false;
				}).bind(this);

			}
			catch (e) {
				this.trigger('error', 'Could not connect to the community socket! ' + String(e));
				this.connected = false;
			}
		}

		/**
		 * Send an action frame
		 */
		Community.prototype.send = function( action, parameters ) {

			// Prepare data to send
			var param = parameters || { };

			// Send command
			this.socket.send(JSON.stringify({
				"action": action,
				"param": param
			}));

		}

		/**
		 * Handle an action frame that arrives from the community channel
		 */
		Community.prototype.handleActionFrame = function( action, parameters ) {

		}

		/**
		 * Return a community singleton
		 */
		var community = new Community();
		return community;

	}
	
);