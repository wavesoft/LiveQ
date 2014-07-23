
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
			'__pendingSim'  : false,

			// Data from last run
			'__lastSimHist'	: [],

			// Socket instance
			'socket'		: null

		};

		/**
		 * Connect, initialize and return a lab socket instance
		 */
		LiveQCore.openSocket = function( labID, cbCompleted, cbError ) {
			if (this.socket) this.socket.close();
			this.socket = LabSocket( labID );

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
				}

			}).bind(this);

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

			}).bind(this));

			//
			// 'runError' is fired when something goes wrong in the simulation run
			//
			this.socket.on('runError', errorHandler);

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
		LiveQCore.requestRun = function( values, cbIntermediate, cbCompleted, cbError ) {
			
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
			this.__cbSimData = cbIntermediate;
			this.__cbSimOk = cbCompleted;
			this.__cbSimError = cbError;
			this.__pendingSim = true;

			// Request real simulation
			this.socket.beginSimulation( values, false );

		};


		// Return LiveQCore class
		return LiveQCore;

	}

);
