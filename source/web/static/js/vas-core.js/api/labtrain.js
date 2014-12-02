/**
 * [core/api/labtrain] - LabTrain API
 */
define(["core/api/interface", "liveq/LiveQ", "liveq/LabProtocol", "liveq/BufferReader", "core/config"], 

	function(APIInterface, LiveQ, LabProtocol, BufferReader, Config) {

		/**
		 * APISocket LabTrain
		 *
		 * @see {@link module:core/api/interface~APIInterface|APIInterface} (Parent class)
		 * @exports core/api/labtrain
		 */
		var APILabTrain = function(apiSocket, sequenceID, observables) {

			// Initialize superclass
			APIInterface.call(this, apiSocket);

			// Create an instance to LabProtocol and fetch all events
			this.labProtocol = new LabProtocol();
			this.labProtocol.forwardAllEventsTo(this);

			// Setup properties
			this.running = false;

			// Keep the sequence ID
			this.sequenceID = sequenceID;

			// Prepare handshake frame
			var handshakeFrame = {
				"version": LiveQ.version,
				"sequence": sequenceID,
				"observables": observables
			};

			// Do handshake
			this.sendAction("open", handshakeFrame);

			// We are connected
			this.connected = true;

			// Fire callbacks
			this.trigger('connected', this);

		}

		// Subclass from APIInterface
		APILabTrain.prototype = Object.create( APIInterface.prototype );

		/**
		 * Handle labSocket event
		 *
		 * @param {string} action - The action name
		 * @param {object} data - The action parameters
		 */
		APILabTrain.prototype.handleAction = function(action, data) {

			if (action == "status") {  /* Status message */
				console.log(data['message']);

				// Fire callbacks
				this.trigger('log', data['message'], data['vars']);

			} else if (action == "error") { /* Error message */
				console.error("I/O Error:",data['message']);

				// Fire callbacks
				this.trigger('error', data['message'], false);

			} else if (action == "completed") { /* Job completed */
				console.log("Job completed");

				// Fire callbacks
				this.trigger('completed');

				// Simulation is completed
				this.running = false;

			}
		}

		/**
		 * Handle labSocket binary frame
		 *
		 * @param {int} action - The action frame ID (16-bit integer)
		 * @param {ArrayBuffer} data - The action payload as a javascript ArrayBuffer
		 */
		APILabTrain.prototype.handleData = function(action, data) {

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
		 * Request training sequence to begin
		 */
		APILabTrain.prototype.beginTrain = function() {
			// Begin simulation with the given parameters
			this.sendAction("start");
			this.running = true;
		}

		/**
		 * Abort training sequence
		 */
		APILabTrain.prototype.stopTrain = function() {
			// Abort simulation
			this.sendAction("stop");
			this.running = false;
		}

		/**
		 * This event is fired when the socket is connected.
		 *
		 * @event module:core/api/labsocket~APILabTrain#connected		
		 */

		/**
		 * This event is fired when the socket is disconnected.
		 *
		 * @event module:core/api/labsocket~APILabTrain#disconnected		
		 */

		/**
		 * This event is fired when the socket is connected.
		 *
		 * @param {string} errorMessage - The error message
		 * @param {boolean} recoverable - If true the error is recoverable
		 * @event module:core/api/labsocket~APILabTrain#error		
		 */

		/**
		 * This event is fired when there was a simulation error.
		 *
		 * @param {string} errorMessage - The error message
		 * @event module:core/api/labsocket~APILabTrain#runError		
		 */

		/**
		 * This event is fired when the simulation is completed.
		 *
		 * @event module:core/api/labsocket~APILabTrain#completed		
		 */

		/**
		 * A log message arrived from the server.
		 *
		 * @param {string} logMessage - The message to log
		 * @event module:core/api/labsocket~APILabTrain#log		
		 */

		// Return the APILabTrain class
		return APILabTrain;

	}

);