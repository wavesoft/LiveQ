
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
LiveQ.LabSocket = function( id ) {

	// Initialize superclass
	LiveQ.HistogramReader.call(this);

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
	this.setupSocket();

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
	 * The timer ID used for pinging the server
	 * @private
	 * @member {int}
	 */
	this._pingTimer = null;


}

// Subclass from HistogramReader
LiveQ.LabSocket.prototype = Object.create( LiveQ.HistogramReader.prototype );

/**
 * Register a callback to be notified when the socket is connected
 *
 * @param {function} cb - The callback function
 */
LiveQ.LabSocket.prototype.onConnect = function( cb ) {
	this._onConnect.push(cb);
}

/**
 * Unregister a callback, previously registered with onConnect
 *
 * @param {function} cb - The callback function
 */
LiveQ.LabSocket.prototype.offDisconnect = function( cb ) {
	var i = this._onConnect.indexOf(cb);
	this._onConnect.splice(i,1);
}

/**
 * Register a callback to be notified when the socket is disconnected
 *
 * @param {function} cb - The callback function
 */
LiveQ.LabSocket.prototype.onDisconnect = function( cb ) {
	this._onDisconnect.push(cb);
}

/**
 * Unregister a callback, previously registered with onDisconnect
 *
 * @param {function} cb - The callback function
 */
LiveQ.LabSocket.prototype.offDisconnect = function( cb ) {
	var i = this._onDisconnect.indexOf(cb);
	this._onDisconnect.splice(i,1);
}

/**
 * Setup a new WebSocket on the given URL and bind on it's callbacks
 * @param {string} url - The Websocket URL to connect to
 */
LiveQ.LabSocket.prototype.setupSocket = function( url ) {
	var self = this;

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
				var reader = new LiveQ.BufferReader(this.result);

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
			for (var i=0; i<self._onDisconnect.length; i++) {
				self._onDisconnect[i](self);
			}
		}

	}).bind(this);
}

/**
 * Handle an incoming action frame from the WebSocket
 *
 * @param {string} action - The name of the action to handle
 * @param {object} data   - The data of the action
 */
LiveQ.LabSocket.prototype.handleActionFrame = function( action, data ) {

	if (action == "status") {  /* Status message */
		console.log(data['message']);

	} else if (action == "error") { /* Error message */
		console.error("I/O Error:",data['message']);

	} else if (action == "sim_completed") { /* Job completed */
		console.log("Job completed");

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
LiveQ.LabSocket.prototype.handleDataFrame = function( action, reader ) {

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
LiveQ.LabSocket.prototype.send = function(action, parameters) {

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
LiveQ.LabSocket.prototype.beginSimulation = function(parameters) {

	// Begin simulation with the given parameters
	this.send("sim_start", parameters);

	// Mark simulation as active
	this.running = true;

}

/**
 * Abort a previously running simulation
 */
LiveQ.LabSocket.prototype.abortSimulation = function(action) {

	// Begin simulation with the given parameters
	this.send("sim_abort");

	// Mark simulation as inactive
	this.running = false;

}
