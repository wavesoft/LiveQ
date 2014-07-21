define(

	// Dependencies
	[ "liveq/LabProtocol", "liveq/LiveQ", "liveq/BufferReader" ], 

	/**
	 * This is the default data widget for visualizing a historgram
	 *
 	 * @exports liveq/LabSocket
	 */
	function( LabProtocol, LiveQ, BufferReader ) {

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
			this.url = "ws://" + location.host + "/vas/labsocket/" + id;

			/**
			 * Array of the callback functions to be fired when the socket is connected
			 * @private
			 * @member {array}
			 */
			this._onConnect = [];

			/**
			 * Array of the callback functions to be fired when the socket is disconnected
			 * @private
			 * @member {array}
			 */
			this._onDisconnect = [];

			/**
			 * Array of the callback functions to be fired when a log message is arrived
			 * @private
			 * @member {array}
			 */
			this._onLog = [];

			/**
			 * Array of the callback functions to be fired when an error has occured
			 * @private
			 * @member {array}
			 */
			this._onError = [];

			/**
			 * Array of the callback functions to be fired when the simulation is completed
			 * @private
			 * @member {array}
			 */
			this._onCompleted = [];

			/**
			 * The timer ID used for pinging the server
			 * @private
			 * @member {int}
			 */
			this._pingTimer = null;

			// If we are browsing the website through SSL, use SSL also
			// for the socket.
			if (String(window.location).substr(0,5) == "https")
				this.url = "wss://" + location.host + "/vas/labsocket/" + id;

			// Initialize connection
			this.setupSocket();

		}

		// Subclass from LabProtocol
		LabSocket.prototype = Object.create( LabProtocol.prototype );

		/**
		 * Register a callback to be notified when the socket is connected
		 *
		 * @param {function} cb - The callback function
		 */
		LabSocket.prototype.onConnect = function( cb ) {
			this._onConnect.push(cb);
		}

		/**
		 * Unregister a callback, previously registered with onConnect
		 *
		 * @param {function} cb - The callback function
		 */
		LabSocket.prototype.offConnect = function( cb ) {
			var i = this._onConnect.indexOf(cb);
			this._onConnect.splice(i,1);
		}

		/**
		 * Register a callback to be notified when the socket is disconnected
		 *
		 * @param {function} cb - The callback function
		 */
		LabSocket.prototype.onDisconnect = function( cb ) {
			this._onDisconnect.push(cb);
		}

		/**
		 * Unregister a callback, previously registered with onDisconnect
		 *
		 * @param {function} cb - The callback function
		 */
		LabSocket.prototype.offDisconnect = function( cb ) {
			var i = this._onDisconnect.indexOf(cb);
			this._onDisconnect.splice(i,1);
		}

		/**
		 * Register a callback to be notified when the socket is connected
		 *
		 * @param {function} cb - The callback function
		 */
		LabSocket.prototype.onLog = function( cb ) {
			this._onLog.push(cb);
		}

		/**
		 * Unregister a callback, previously registered with onLog
		 *
		 * @param {function} cb - The callback function
		 */
		LabSocket.prototype.offLog = function( cb ) {
			var i = this._onLog.indexOf(cb);
			this._onLog.splice(i,1);
		}

		/**
		 * Register a callback to be notified when an error occured
		 *
		 * @param {function} cb - The callback function
		 */
		LabSocket.prototype.onError = function( cb ) {
			this._onError.push(cb);
		}

		/**
		 * Unregister a callback, previously registered with onError
		 *
		 * @param {function} cb - The callback function
		 */
		LabSocket.prototype.offError = function( cb ) {
			var i = this._onError.indexOf(cb);
			this._onError.splice(i,1);
		}

		/**
		 * Register a callback to be notified when the simulation is completed
		 *
		 * @param {function} cb - The callback function
		 */
		LabSocket.prototype.onCompleted = function( cb ) {
			this._onCompleted.push(cb);
		}

		/**
		 * Unregister a callback, previously registered with onCompleted
		 *
		 * @param {function} cb - The callback function
		 */
		LabSocket.prototype.offCompleted = function( cb ) {
			var i = this._onCompleted.indexOf(cb);
			this._onCompleted.splice(i,1);
		}
		/**
		 * Setup a new WebSocket on the given URL and bind on it's callbacks
		 * @param {string} url - The Websocket URL to connect to
		 */
		LabSocket.prototype.setupSocket = function( url ) {
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
					for (var i=0; i<self._onConnect.length; i++) {
						self._onConnect[i](self);
					}

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
					for (var i=0; i<self._onDisconnect.length; i++) {
						self._onDisconnect[i](self);
					}

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
						for (var i=0; i<self._onError.length; i++) {
							self._onError[i](self, "Socket Error", true);
						}
						for (var i=0; i<self._onDisconnect.length; i++) {
							self._onDisconnect[i](self);
						}
					}

				}).bind(this);

			} catch (e) {
				console.error("Socket exception", e);

				// Fire callbacks on exception
				for (var i=0; i<self._onError.length; i++) {
					self._onError[i](self, "Socket exception", true);
				}

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
				for (var i=0; i<this._onLog.length; i++) {
					this._onLog[i](data['message'], data['vars']);
				}

			} else if (action == "error") { /* Error message */
				console.error("I/O Error:",data['message']);

				// Fire callbacks
				for (var i=0; i<this._onError.length; i++) {
					this._onError[i](data['message'], false);
				}

			} else if (action == "sim_completed") { /* Job completed */
				console.log("Job completed");

				// Fire callbacks
				for (var i=0; i<this._onLog.length; i++) {
					this._onCompleted[i]();
				}

				// Simulation is completed
				this.running = false;

			} else if (action == "sim_failed") { /* Simulation failed */
				console.error("Simulation error:", data['message']);

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

		// Return LabSocket
		return LabSocket;

	}

);