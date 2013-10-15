
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
	var MCPlotsLab = function( id ) {

		// Reset local variables
		this.tuning = false;

		// Setup websocket
		var url = "ws://" + location.host + "/labsocket/" + id;
		this.socket = new WebSocket(url);

		// Setup event listener on the socket
		this.socket.onmessage = (function(event) {
			var data = JSON.parse(event.data);

			// Validate input
			if (data.action == undefined) {
				console.error("Invalid response arrived from the lab socket: Missing 'action' parameter");
				return;
			}
			if (data.data == undefined) {
				console.error("Invalid response arrived from the lab socket: Missing 'data' parameter");
				return;
			}

			// Handle actions
			if (data.action == "data") {
				// We have data from a previously initiated tune
				$(this).trigger('updateData', data.data, this.reference, data.info );

			} else if (data.action == "completed") {
				// We have completed a previously initiated tune
				$(this).trigger('updateCompleted', data.result, data.info );

			} else if (data.action = "configuration") {
				// Iterate over histograms and build the reference histogram map
				this.reference = [ ];
				this.histograms = [ ];
				for (var i=0; i<data.data.histograms.length; i++) {
					this.histograms.push( data.data.histograms[i].histogram );
					this.reference.push( data.data.histograms[i].reference );
				}

				// Let the listeners know that we are now ready
				$(this).trigger('ready', this.histograms, this.reference, data.layout);

			} else if (data.action = "error") {
				// We had an error.

				// Forwrard it to our listeners
				$(this).trigger('error', data.error);

			}
		}).bind(this);

		// When the socket is connected, request the lab configuration data.
		// These data include the histogram number, their labels and their reference data.
		// In addition, it contains metainformation about their layout.
		this.socket.open = (function() {
			updater.socket.send(JSON.stringify({
				"action": "configuration"
			}));
		}).bind(this);

		// Start the websocket
		this.socket.start();

	}

	/**
	 * Parameters to send to the remote endpoint
	 */
	MCPlotsLab.prototype.sendTune = function(parameters) {

		// If we are already tuning, let the server know that we changed our mind
		if (this.tuning) {

			// Abort tune on server
			updater.socket.send(JSON.stringify({
				"action": "tune_abort"
			}));

			// Let UI know that we completed the tune
			$(this).trigger('updateCompleted', 0, { "reason": "Tune restarted" });

		}

		// Set our state in tuning
		this.tuning = true;

		// Notify our listeners that we are starting an update
		$(this).trigger('updateBegin');

		// Start tune on the server
		updater.socket.send(JSON.stringify({
			"action": "tune_begin",
			"parameters": parameters
		}));


	}




})();