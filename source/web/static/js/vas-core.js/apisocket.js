
define(["core/util/event_base", "sha1", "core/config", "core/api/chatroom", "core/api/course"  ], 

	function( EventBase, SHA1, Config, APIChatroom, APICourseroom ) {

		/**
		 * Bitmask filter
		 */
		var API_MASK_DOMAIN = 0xffff0000,
			API_MASK_ID     = 0x0000ffff;

		/**
		 * The APISocket class provides all the required functionality to interact in real time
		 * with other APISocket members.
		 *
		 * @class
		 * @classdesc The APISocket class
		 * @see {@link module:core/util/event_base~EventBase|EventBase} (Parent class)
		 * @exports core/apisocket
		 */
		var APISocket = function( hostDOM ) {

			// Initialize superclass
			EventBase.call(this);

			// Initialize properties
			this.connected = false;
			this.loginCallback = null;

			// Dynamic API interfaces
			this.apiInterfaces = {};
			this.apiInstances = [];

			// Register interfaces
			this.registerInterface( "account" 	, 0x00, "core/api/account" );
			this.registerInterface( "chatroom"	, 0x00, "core/api/chatroom" );
			this.registerInterface( "course" 	, 0x00, "core/api/course" );
			this.registerInterface( "labsocket" , 0x01, "core/api/labsocket" );

		}

		// Subclass from EventBase
		APISocket.prototype = Object.create( EventBase.prototype );

		/**
		 * Register a dynamic API interface
		 */
		APISocket.prototype.registerInterface = function( domain, bitDomain, classPath ) {

			// Request an interface through require.js
			require([classPath], (function(Interface) {

				// Store instance under the specified domain
				this.apiInterfaces[domain] = Interface;

				// Register open function
				this['open' + domain[0].toUpperCase() + domain.substr(1) ] = (function() {

					// Close and cleanup previous instance
					if (this.apiInstances[domain] !== undefined ) {
						try {
							this.apiInstances[domain].__handleClose();
						} catch(e) {
							console.error("Error closing interface '",domain,"':",e);
						};
						delete this.apiInstances[domain];
					}

					// Prepare arguments by the ones given to openXXXX function
					var args = [this];
					for (i = 0; i < arguments.length; i++) {
						args.push( arguments[i] );
					}

					// Prepare instance proxy
					function I() {
						Interface.apply(this, args);
					}
					I.prototype = Interface.prototype;

					// Update domain and bitmask
					I.prototype.domain = domain;
					I.prototype.bitmask = bitDomain << 16;

					// Create instance
					var inst = new I();
					this.apiInstances[domain] = inst;

					// Return instance
					return inst;

				}).bind(this);

			}).bind(this));

		}

		/**
		 * Connect to the APISocket server
		 */
		APISocket.prototype.connect = function(url) {
			try {

				// Create new websocket instance
				this.socket = new WebSocket(url);

				// -----------------------------------------------------------
				// Bind a listener to the incoming WebSocket Data
				// This listener supports both binary and text data receiving
				// 
				this.socket.onmessage = (function(event) {

					// Check if the incoming data is a binary frame
					if (event.data instanceof Blob) {
						// If we have a binary response, read input

						// Prepare FileReader to read Blob into a ArrayBuffer
						var blobReader = new FileReader();
						blobReader.onload = (function() {

							// Cast result to UInt32 array in order to extract
							// the frame ID
							var buf = new Uint32Array( this.result, 0, 1 ),
								frameID = buf[0];

							// Handle data frame
							this.handleDataFrame( frameID, this.result );

						}).bind(this);

						// Send Blob to the FileReader
						blobReader.readAsArrayBuffer(event.data);

					} else {

						// Parse JSON frame
						var data = JSON.parse(event.data);
						// Extract parameters
						var param = data['param'] || { };

						// Handle action
						this.handleActionFrame( data['action'], param );

					}

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
					this.trigger('critical', 'Disconnected from the APISocket socket!');
					this.connected = false;

					// Cleanup dynamic API instances
					for (k in this.apiInstances) {
						try {
							this.apiInstances[k].__handleClose();
						} catch(e) {
							console.error("Error closing interface '",k,"':",e);
						};
						this.apiInstances.splice(0);
					}

				}).bind(this);

				// -----------------------------------------------------------
				// Handle socket errors
				//
				this.socket.onerror = (function(ws, error) {
					this.trigger('critical', 'Error while trying to connect to the API socket!');
					this.connected = false;
				}).bind(this);

			}
			catch (e) {
				this.trigger('critical', 'Could not connect to the API socket! ' + String(e));
				this.connected = false;
			}
		}

		/**
		 * Send an action frame
		 */
		APISocket.prototype.sendAction = function( action, parameters ) {

			// Prepare data to send
			var param = parameters || { };

			// Send command
			this.socket.send(JSON.stringify({
				"action": action,
				"param": param
			}));

		}

		/**
		 * Send blob
		 */
		APISocket.prototype.sendBlob = function( frameID, payload ) {

			// Prepare data to send
			var param = parameters || { };

			// Send command
			this.socket.send(JSON.stringify({
				"action": action,
				"param": param
			}));

		}

		/**
		 * Handle data frame
		 */
		APISocket.prototype.handleDataFrame = function( frameID, reader ) {

			// Check which bitmask fits the arrived frame ID
			for (k in this.apiInstances) {

				// Get bitmask
				var mask = this.apiInstances[k].bitmask;
				if (!mask) continue;

				// Check if bitmask matches
				if (frameID & API_MASK_DOMAIN == mask) {
					this.apiInstances[domain].__handleData( action & API_MASK_ID, reader );
				}

			}

		}

		/**
		 * Handle an action frame that arrives from the APISocket channel
		 */
		APISocket.prototype.handleActionFrame = function( action, parameters ) {

			// Lookup the domain on the domain
			var parts = action.split(".", 2),
				domain = parts[0],
				domainAction = action.substr(domain.length+1);

			// Check if we have a domain handler
			if (this.apiInstances[domain]) {
				// Handle action on the given API instance
				this.apiInstances[domain].__handleAction( domainAction, parameters );
			}

			// Handle login events
			else if (action == "user.login.success") {
				if (this.loginCallback)
					this.loginCallback(true, parameters);
			}

			// Handle login events
			else if (action == "user.login.failure") {
				if (this.loginCallback) 
					this.loginCallback(false, parameters);
			}

			// Handle errors
			else if (action == "error") {
				this.trigger('error', parameters['message']);
			}

		}

		///////////////////////////////////////////////////////////////
		//                    PUBLIC API INTERFACE                   //
		///////////////////////////////////////////////////////////////

		/**
		 * Try to log user-in
		 */
		APISocket.prototype.login = function( user, password, callback ) {

			// Try to log user in
			this.sendAction('user.login', {
				'user': user,
				'password': password
			});

			// Register the callback to fire on 'user.login.callback'
			if (callback) {
				this.loginCallback = function(success, parameters) {
					if (success) {
						callback(parameters['profile']);
					} else {
						callback(null, parameters['message']);
					}
				};
			}
			
		}

		/**
		 * Return a APISocket singleton
		 */
		var APISocket = new APISocket();
		return APISocket;

	}
	
);