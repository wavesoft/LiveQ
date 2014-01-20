
(function() {

	/**
	 * Connect to an MCPlots Lab
	 *
	 * A lab consists of an MCPlots SVN revision, default generator configuration
	 * and the respective parsing configuration.
	 *
	 * In principle, a 'lab' is where the user tunes parameters upon.
	 *
	 */
	var MCPlotsLab = window.MCPlotsLab = function( id ) {

		// Reset local variables
		this.tuning = false;

		// Setup websocket
		var url = "ws://" + location.host + "/vas/labsocket/" + id;
		this.socket = new WebSocket(url);

		// Setup event listener on the socket
		this.socket.onmessage = (function(event) {

			// Check what kind of data we received
			if (event.data instanceof Blob) {
				// We have binary data

				var blobReader = new FileReader();
				blobReader.onload = function() {
				    window.buf = this.result;
				    console.log("Got binary data");

				};
				blobReader.readAsArrayBuffer(event.data);

			} else {
				// We have JSON data

				var data = JSON.parse(event.data);

				// Validate input
				if (data.action == undefined) {
					console.error("Invalid response arrived from the lab socket: Missing 'action' parameter");
					return;
				}

				// Handle actions
				if (data.action == "data") {
					// We have data from a previously initiated tune
					$(this).trigger('updateData', data.data, this.reference, data.info );

				} else if (data.action == "completed") {

					// We are not tuning any more
					this.tuning = false;

					// We have completed a previously initiated tune
					$(this).trigger('updateCompleted', data.result, data.info );

				} else if (data.action == "configuration") {
					
					// Iterate over histograms and build the reference histogram map
					this.reference = [ ];
					this.histograms = [ ];
					for (var i=0; i<data.histograms.length; i++) {
						this.histograms.push( data.histograms[i].histogram );
						this.reference.push( data.histograms[i].reference );
					}

					// Let the listeners know that we are now ready
					$(this).trigger('ready', this.histograms, this.reference, data.layout);

				} else if (data.action == "error") {
					// We had an error.

					// Log error
					console.error("MCPlotsLab Error: ", data.error)

					// Forwrard it to our listeners
					$(this).trigger('error', data.error);

				}

			}

		}).bind(this);

		// When the socket is connected, request the lab configuration data.
		// These data include the histogram number, their labels and their reference data.
		// In addition, it contains metainformation about their layout.
		this.socket.onopen = (function() {
			console.log("Connection open")

			// After we are open, send asynchronously the configuration
			// request
			setTimeout((function() {
				this.socket.send(JSON.stringify({
					"action": "configuration"
				}));
			}).bind(this), 100);
		}).bind(this);

		// If for any reason the socket is closed, retry connection
		this.socket.onclose = (function() {
			console.log("Connection closed")
		}).bind(this);

		// Handle socket errors
		this.socket.onerror = (function(ws, error) {
			console.log("Socket error: ", error)

			// Check for errors
			if (self.tuning) {
				// Let UI know that we completed the tune
				$(this).trigger('updateCompleted', -3, { "reason": "Tune aborted due to error: " + error });
			}

		}).bind(this);

	}

	/**
	 * Parameters to send to the remote endpoint
	 */
	MCPlotsLab.prototype.sendTune = function(parameters) {

		// If we are already tuning, let the server know that we changed our mind
		if (this.tuning) {

			// Cancel tune on server
			this.socket.send(JSON.stringify({
				"action": "tune_cancel"
			}));

			// Let UI know that we completed the tune
			$(this).trigger('updateCompleted', -1, { "reason": "Tune restarted" });

		}

		// Set our state in tuning
		this.tuning = true;

		// Notify our listeners that we are starting an update
		$(this).trigger('updateBegin');

		// Start tune on the server
		this.socket.send(JSON.stringify({
			"action": "tune_begin",
			"parameters": parameters
		}));


	}

	/**
	 * Parameters to send to the remote endpoint
	 */
	MCPlotsLab.prototype.abort = function(parameters) {

		// Abort only if we are tuning
		if (this.tuning) {

			// Cancel tune on server
			this.socket.send(JSON.stringify({
				"action": "tune_cancel"
			}));

			// Let UI know that we completed the tune
			$(this).trigger('updateCompleted', -2, { "reason": "Tune aborted" });

			// Turn off tuning
			this.tuning = false;
		}

	};


})();