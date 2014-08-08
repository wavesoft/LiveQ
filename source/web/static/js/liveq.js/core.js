
define(

	[ "liveq/LiveQ", "liveq/LabSocket" ],

	/**
	 * Initialize LiveQ subsystem
	 *
	 * @exports liveq/main
	 */
	function( LiveQ, LabSocket ) {

		/**
		 * LiveQ Core namespace
		 */
		var LiveQCore = {

			// Prepare the callbacks used for receiving
			// the histogram data.
			'__cbIpolOk' 	: null,
			'__cbIpolError' : null,
			'__pendingIpol' : false,
			'__cbSimOk' 	: null,
			'__cbSimData'	: null,
			'__cbSimError' 	: null,
			'__cbSimLog'	: null,
			'__pendingSim'  : false,
			'__lastLabID'	: null,

			// Data from last run
			'__lastSimHist'	: [],

			// Data for secondary run socket
			'__simSocket'	: null,
			'__simSocketDel': false,

			// Socket instance
			'socket'		: null,

		};

		/**
		 * Connect, initialize and return a lab socket instance
		 */
		LiveQCore.openSocket = function( labID, cbCompleted, cbError ) {

			// If trying to open the same socket, fire completed
			if (this.__lastLabID == labID) {
				if (cbCompleted) cbCompleted();
				return;
			} else {
				this.__lastLabID = labID;
			}

			// Close previous sicket
			if (this.socket) {
				if (this.__pendingSim) {
					// Mark sim socket to be released when done with it
					this.__simSocketDel = true;
				} else {
					// Release socket immediately
					this.socket.close();
				}
			}

			// Create new lab socket instance
			this.socket = new LabSocket( labID );

			// Error handler
			var errorHandler = (function(message) {

				// Check if we have an active interpolation
				if (this.__pendingIpol) {
					// Fire interpolation error
					if (this.__cbIpolError)
						this.__cbIpolError(message)
					// Reset interpolation
					this.__pendingIpol = false;
					this.__cbIpolError = null;
					this.__cbIpolOk = null;
				}

				// Check if we have an active simulation
				if (this.__pendingSim) {
					// Fire simulation error
					if (this.__cbIpolError)
						this.__cbIpolError(message)
					// Reset simulation
					this.__pendingSim = false;
					this.__cbSimError = null;
					this.__cbSimData = null;
					this.__cbSimOk = null;
					this.__cbSimLog = null;
					// Check if we should delete the sim socket
					if (this.__simSocketDel) {
						this.__simSocketDel = false;
						this.__simSocket.close();
						this.__simSocket = null;
					}
				}

			}).bind(this);

			//
			// 'connected' is fired when the socket is connected
			//
			this.socket.on('connected', (function() {
			}).bind(this));

			//
			// 'ready' is fired when the negotiation is completed
			//
			this.socket.on('ready', (function(config) {
				if (cbCompleted) cbCompleted();
			}).bind(this));
			
			//
			// 'log' is fired when a server log or telemetry data arrives
			//
			this.socket.on('log', (function(text, telemetry) {
				if (this.__cbSimLog) this.__cbSimLog(text, telemetry);
			}).bind(this));

			//
			// 'error' is fired when something goes wrong in the socket
			//
			this.socket.on('error', (function(message) {

				// Fire error callback
				if (cbError) cbError(message);

				// Fail running jobs
				errorHandler("Socket error: " + message);

			}).bind(this));

			//
			// When histograms are updated this callback is fired. This function is called
			// both for simulation and interpolation histograms.
			//
			this.socket.on('histogramsUpdated', (function(histos, fromInterpolation) {
				if (fromInterpolation) {

					// Fire interpolation callbacks
					if (this.__cbIpolOk)
						this.__cbIpolOk(histos);

					// Interpolation is single brust
					// Reset interpolation
					this.__pendingIpol = false;
					this.__cbIpolOk = null;
					this.__cbIpolError = null;

				} else {

					// Preserve the last simulation histogram (for completed event)
					this.__lastSimHist = histos;
					// Fire intermediate simulation data
					if (this.__cbSimData)
						this.__cbSimData(histos);

				}
			}).bind(this));

			//
			// 'runCompleted' is fired *only* when a real simulation is completed
			//
			this.socket.on('runCompleted', (function() {

				// Fire simulation completion with
				// the last saved simulation histograms
				this.__cbSimOk( this.__lastSimHist );

				// Reset simulation
				this.__pendingSim = false;
				this.__cbSimError = null;
				this.__cbSimData = null;
				this.__cbSimOk = null;
				this.__cbSimLog = null;

				// Check if we should delete the sim socket
				if (this.__simSocketDel) {
					this.__simSocketDel = false;
					this.__simSocket.close();
					this.__simSocket = null;
				}

			}).bind(this));

			//
			// 'runError' is fired when something goes wrong in the simulation run
			//
			this.socket.on('runError', errorHandler);

			// We have all the listeners bound. Try to connect
			this.socket.connect();

		}

		/**
		 * Request an interpolation simulation
		 */
		LiveQCore.requestInterpolation = function( values, cbCompleted, cbError ) {

			// Abort previous run
			if (this.__pendingIpol) {
				if (this.__cbIpolError) this.__cbIpolError("Aborted");
			}

			// Validate socket state
			if (!this.socket || !this.socket.connected) {
				if (cbError) cbError("Lab socket not initialized!");
				return;
			}

			// Update local variables
			this.__cbIpolOk = cbCompleted;
			this.__cbIpolError = cbError;
			this.__pendingIpol = true;
			
			// Request simulation only through interpolation
			this.socket.beginSimulation( values, true );

		};

		/**
		 * Request an interpolation simulation
		 */
		LiveQCore.requestRun = function( values, cbIntermediate, cbCompleted, cbError, cbLog ) {
			
			// Abort previous run
			if (this.__pendingSim) {
				if (this.__cbSimError) this.__cbSimError("Aborted");
			}

			// Validate socket state
			if (!this.socket || !this.socket.connected) {
				if (cbError) cbError("Lab socket not initialized!");
				return;
			}

			// Update local variables
			this.__cbSimData = cbIntermediate;
			this.__cbSimOk = cbCompleted;
			this.__cbSimError = cbError;
			this.__cbSimLog = cbLog;
			this.__pendingSim = true;

			// Keep a reference of the simulation socket
			this.__simSocket = this.socket;

			// Request real simulation
			this.socket.beginSimulation( values, false );

		};

		/**
		 * Abort a currently running simulation
		 */
		LiveQCore.abortRun = function() {

			// Abort previous run
			if (!this.__pendingSim) return;

			// Fire abort callback
			if (this.__cbSimError) this.__cbSimError("Aborted");

			// Stop simulation
			this.socket.abortSimulation();

			// Reset simulation
			this.__pendingSim = false;
			this.__cbSimError = null;
			this.__cbSimData = null;
			this.__cbSimOk = null;
			this.__cbSimLog = null;

			// Check if we should delete the sim socket
			if (this.__simSocketDel) {
				this.__simSocketDel = false;
				this.__simSocket.close();
				this.__simSocket = null;
			}
		}

		// Return LiveQCore class
		return LiveQCore;

	}

);
