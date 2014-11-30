/**
 * [core/api/labsocket] - LabSocket API
 */
define(["core/api/interface", "liveq/LabProtocol", "liveq/BufferReader", "core/config"], 

	function(APIInterface, LabProtocol, BufferReader, Config) {

		/**
		 * APISocket LabSocket
		 *
		 * @see {@link module:core/api/interface~APIInterface|APIInterface} (Parent class)
		 * @exports core/api/labsocket
		 */
		var APILabSocket = function(apiSocket, labID) {

			// Initialize superclass
			APIInterface.call(this, apiSocket);

			// Create an instance to LabProtocol and fetch all events
			this.labProtocol = new LabProtocol();
			this.labProtocol.forwardAllEventsTo(this);

			// Setup properties
			this.running = false;

			// Keep the LabID
			this.labID = labID;

		}

		// Subclass from APIInterface
		APILabSocket.prototype = Object.create( APIInterface.prototype );

		/**
		 * Handle labSocket event
		 */
		APILabSocket.prototype.handleAction = function(action, data) {
			if (!this.active) return;

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

			}

		}

		/**
		 * Handle labSocket event
		 */
		APILabSocket.prototype.handleDataFrame = function(action, data) {

			// Encapsuate ArrayBuffer in a BufferReader class
			var reader = new BufferReader(data);

			// Skip the first 64-bit (frame header)
			reader.getUint32(); reader.getUint32();

			// Handle frame action
			if (action == 0x01) { /* Configuration Frame */

				// Handle configuration frame
				this.labProtocol.handleConfigFrame( reader );

			} else if (action == 0x02) { /* Histogram Data Frame */

				// Handle histogram data frame
				this.labProtocol.handleFrame( reader );

			}

		}

		/**
		 * Send a tune and begin simulation
		 *
		 * @param {object} parameters - An object with the tunable parameter names and their values
		 *
		 */
		APILabSocket.prototype.beginSimulation = function(parameters, onlyInterpolate) {

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
		APILabSocket.prototype.abortSimulation = function(action) {

			// Begin simulation with the given parameters
			this.send("sim_abort");

			// Mark simulation as inactive
			this.running = false;

		}

		/**
		 * This event is fired when the socket is connected.
		 *
		 * @event module:core/api/labsocket/LabSocket~LabSocket#connected		
		 */

		/**
		 * This event is fired when the socket is disconnected.
		 *
		 * @event module:core/api/labsocket/LabSocket~LabSocket#disconnected		
		 */

		/**
		 * This event is fired when the socket is connected.
		 *
		 * @param {string} errorMessage - The error message
		 * @param {boolean} recoverable - If true the error is recoverable
		 * @event module:core/api/labsocket/LabSocket~LabSocket#error		
		 */

		/**
		 * This event is fired when there was a simulation error.
		 *
		 * @param {string} errorMessage - The error message
		 * @event module:core/api/labsocket/LabSocket~LabSocket#runError		
		 */

		/**
		 * This event is fired when the simulation is completed.
		 *
		 * @event module:core/api/labsocket/LabSocket~LabSocket#runCompleted		
		 */

		/**
		 * A log message arrived from the server.
		 *
		 * @param {string} logMessage - The message to log
		 * @event module:core/api/labsocket/LabSocket~LabSocket#log		
		 */

		// Return the APILabSocket class
		return APILabSocket;

	}

);