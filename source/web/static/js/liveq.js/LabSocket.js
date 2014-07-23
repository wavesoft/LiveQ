define(

	// Dependencies
	[ "liveq/LabProtocol", "liveq/LiveQ", "liveq/BufferReader", "core/config" ], 

	/**
	 * This is the default data widget for visualizing a historgram
	 *
 	 * @exports liveq/LabSocket
	 */
	function( LabProtocol, LiveQ, BufferReader, Config ) {

		/**
		 * Connect to a LiveQ Lab socket
		 *
		 * A lab consists of an MCPlots SVN revision, default generator configuration
		 * and the respective parsing configuration.
		 *
		 * In principle, a 'lab' is where the user tunes parameters upon.
		 *
		 * @param {string} id - The ID of the lab to connect to
		 * @class
		 *
		 */
		var LabSocket = function( id ) {

			// Initialize superclass
			LabProtocol.call(this);

			/**
			 * The ID of the lab
			 * @member {string}
			 */
			this.id = id;

			/**
			 * Flag which marks that a simulation is running
			 * @member {boolean}
			 */
			this.running = false;

			/**
			 * Flag which marks if the connection with the websocket is alive
			 * @member {boolean}
			 */
			this.connected = false;

			/**
			 * The URL where the WebSocket is connected
			 * @member {string}
			 */
			this.url = Config['liveq']['socket_url'] + id;

			/**
			 * The timer ID used for pinging the server
			 * @private
			 * @member {int}
			 */
			this._pingTimer = null;

			// If we are browsing the website through SSL, use SSL also for the socket.
			if (String(window.location).substr(0,5) == "https")
				this.url = this.url.replace("ws:", "wss:");

		}

		// Subclass from LabProtocol
		LabSocket.prototype = Object.create( LabProtocol.prototype );

		/**
		 * Setup a new WebSocket on the given URL and bind on it's callbacks
		 * @param {string} url - The Websocket URL to connect to
		 */
		LabSocket.prototype.connect = function( url ) {
			if (url) this.url = url;
			var self = this;
			try {

				// Create new WebSocket to the given url
				this.socket = new WebSocket(this.url);

				// -----------------------------------------------------------
				// Bind a listener to the incoming WebSocket Data
				// This listener supports both binary and text data receiving
				// 
				this.socket.onmessage = function(event) {

					// Check if the incoming data is a binary frame
					if (event.data instanceof Blob) {
						// If we have a binary response, read input

						// Prepare FileReader to read Blob into a ArrayBuffer
						var blobReader = new FileReader();
						blobReader.onload = function() {

							// Encapsuate ArrayBuffer in a BufferReader class
							var reader = new BufferReader(this.result);

							// Read the frame header (64 bit)
							var frameID = reader.getUint32(),
								reserved = reader.getUint32();

							// Handle data frame
							self.handleDataFrame( frameID, reader );

						};

						// Send Blob to the FileReader
						blobReader.readAsArrayBuffer(event.data);

					} else {
						// Parse JSON frame

						// Convert data to JSON
						var data = JSON.parse(event.data);
						// Extract parameters
						var param = data['param'] || { };
						// Handle action
						self.handleActionFrame( data['action'], param );

					}


				};

				// -----------------------------------------------------------
				// Upon connection, we will need to send handshake and request 
				// the initial configuration for the histograms.
				// 
				this.socket.onopen = function() {
					console.log("Connection open")

					// Handshake
					self.send("handshake", { "version": LiveQ.version });

					// We are connected
					self.connected = true;

					// Fire callbacks
					self.trigger('connected', self);

					// Start ping timer
					if (self._pingTimer)
						clearInterval(self._pingTimer);
					self._pingTimer = setInterval(function() {
						// Send PING every 30 seconds
						self.send("ping", {});
					}, 30000);

				};

				// -----------------------------------------------------------
				// If for any reason the socket is closed, retry connection
				//
				this.socket.onclose = (function() {
					console.log("Connection closed");

					// We are disconnected
					self.connected = false;

					// Fire callbacks
					self.trigger('disconnected', self);

					// Clear timer
					if (self._pingTimer)
						clearInterval(self._pingTimer);

				}).bind(this);

				// -----------------------------------------------------------
				// Handle socket errors
				//
				this.socket.onerror = (function(ws, error) {
					console.error(error);

					// If we were connected, that's an I/O error -> We are not connected any more
					if (self.connected) {
						// We are disconnected
						self.connected = false;

						// Fire callbacks
						this.trigger('error', "Socket Error", true);
						this.trigger('disconnected', self);
					}

				}).bind(this);

			} catch (e) {
				console.error("Socket exception", e);

				// Fire callbacks on exception
				this.trigger('error', "Socket exception", true);

			}

		}

		/**
		 * Handle an incoming action frame from the WebSocket
		 *
		 * @param {string} action - The name of the action to handle
		 * @param {object} data   - The data of the action
		 */
		LabSocket.prototype.handleActionFrame = function( action, data ) {

			if (action == "status") {  /* Status message */
				console.log(data['message']);

				// Fire callbacks
				this.trigger('log', data['message'], data['vars']);

			} else if (action == "error") { /* Error message */
				console.error("I/O Error:",data['message']);

				// Fire callbacks
				this.trigger('error', data['message'], false);

			} else if (action == "sim_completed") { /* Job completed */
				console.log("Job completed");

				// Fire callbacks
				this.trigger('runCompleted');

				// Simulation is completed
				this.running = false;

			} else if (action == "sim_failed") { /* Simulation failed */
				console.error("Simulation error:", data['message']);

				// Fire callbacks
				this.trigger('runError', data['message']);

				// Simulation is completed
				this.running = false;

			} else if (action == "pong") { /* Keepalive ping/pong */

				// Do nothing

			}

		};

		/**
		 * Handle an incoming data frame from the WebSocket
		 *
		 * @param {int} action 		    - The type of the data frame
		 * @param {BufferReader} reader - The BufferReader object that will be used for reading the data
		 */
		LabSocket.prototype.handleDataFrame = function( action, reader ) {

			if (action == 0x01) { /* Configuration Frame */

				// Handle configuration frame
				this.handleConfigFrame( reader );

			} else if (action == 0x02) { /* Histogram Data Frame */

				// Handle histogram data frame
				this.handleFrame( reader );

			}

		};

		/**
		 * Disconnect socket
		 */
		LabSocket.prototype.close = function() {
			if (!this.connected) return;
			console.log("Connection closed");

			// Remove handler
			this.socket.onclose = function() { };
			this.socket.close();

			// We are disconnected
			this.connected = false;

			// Fire callbacks
			this.trigger('disconnected', this);

			// Clear timer
			if (this._pingTimer)
				clearInterval(this._pingTimer);
		}

		/**
		 * Send a command to the socket
		 * @param {string} action - The name of the action to invoke on the server
		 * @param {object} parameters - An object with the data to send to the socket
		 */
		LabSocket.prototype.send = function(action, parameters) {

			// Prepare data to send
			var param = parameters || { };

			// Send command
			this.socket.send(JSON.stringify({
				"action": action,
				"param": param
			}));

		}

		/**
		 * Send a tune and begin simulation
		 *
		 * @param {object} parameters - An object with the tunable parameter names and their values
		 *
		 */
		LabSocket.prototype.beginSimulation = function(parameters, onlyInterpolate) {

			// Begin simulation with the given parameters
			if (onlyInterpolate) {
				this.send("sim_estimate", parameters);
			} else {
				this.send("sim_start", parameters);
			}

			// Mark simulation as active
			this.running = true;

		}

		/**
		 * Abort a previously running simulation
		 */
		LabSocket.prototype.abortSimulation = function(action) {

			// Begin simulation with the given parameters
			this.send("sim_abort");

			// Mark simulation as inactive
			this.running = false;

		}

		/**
		 * This event is fired when the socket is connected.
		 *
		 * @event module:liveq/LabSocket~LabSocket#connected		
		 */

		/**
		 * This event is fired when the socket is disconnected.
		 *
		 * @event module:liveq/LabSocket~LabSocket#disconnected		
		 */

		/**
		 * This event is fired when the socket is connected.
		 *
		 * @param {string} errorMessage - The error message
		 * @param {boolean} recoverable - If true the error is recoverable
		 * @event module:liveq/LabSocket~LabSocket#error		
		 */

		/**
		 * This event is fired when there was a simulation error.
		 *
		 * @param {string} errorMessage - The error message
		 * @event module:liveq/LabSocket~LabSocket#runError		
		 */

		/**
		 * This event is fired when the simulation is completed.
		 *
		 * @event module:liveq/LabSocket~LabSocket#runCompleted		
		 */

		/**
		 * A log message arrived from the server.
		 *
		 * @param {string} logMessage - The message to log
		 * @event module:liveq/LabSocket~LabSocket#log		
		 */

		// Return LabSocket
		return LabSocket;

	}

);