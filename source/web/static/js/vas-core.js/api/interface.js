/**
 * [core/api/interface] - The abstract I/O API Interface
 */
define(["core/util/event_base"], 
	function(EventBase) {

		/**
		 * The APISocket class provides all the required functionality to interact in real time
		 * with other APISocket members.
		 *
		 * @class
		 * @classdesc The APISocket class
		 * @see {@link module:core/util/event_base~EventBase|EventBase} (Parent class)
		 * @exports core/api/interface
		 */
		var APIInterface = function(apiSocket) {

			// Initialize superclass
			EventBase.call(this);

			// Store apiSocket
			this.apiSocket = apiSocket;

			// Setup local properties
			this.callbacks = {};
			this.active = true;

		};

		// Subclass from EventBase
		APIInterface.prototype = Object.create( EventBase.prototype );

		/**
		 * The domain for which messages are sent/received
		 */
		APIInterface.prototype.domain = null;

		/**
		 * The bitmask for which binary messages are sent/received
		 */
		APIInterface.prototype.bitmask = null;

		/////////////////////////////////////////////////////////
		// Abstract function
		/////////////////////////////////////////////////////////

		/**
		 * Handle channel interruption
		 *
		 * @abstract
		 */
		APIInterface.prototype.handleClose = function() { }

		/**
		 * Handle an incoming action message
		 *
		 * @abstract
		 * @param {string} action - The action name
		 * @param {object} parameters - The action parameters
		 */
		APIInterface.prototype.handleAction = function( action, parameters ) {
		}

		/**
		 * Handle an incoming binary message
		 *
		 * @abstract
		 * @param {int} frameID - The action frame ID (16-bit integer)
		 * @param {ArrayBuffer} payload - The action payload as a javascript ArrayBuffer
		 */
		APIInterface.prototype.handleBinary = function( frameID, payload ) {
		}

		/////////////////////////////////////////////////////////
		// API Socket callbacks
		/////////////////////////////////////////////////////////

		/**
		 * Handle enforced close event
		 */
		APIInterface.prototype.__handleClose = function() {
			if (!this.active) return;
			// Handle close by the implementation
			this.handleClose();
			// Forget all action callbacks
			this.callbacks = {};
			// Mark as inactive
			this.active = false;
			// Fire close and discard listeners
			this.trigger("close");
			this.offAll();
		}

		/**
		 * Handle incoming action message
		 */
		APIInterface.prototype.__handleAction = function(action, parameters) {
			if (!this.active) return;

			// Check if this is a callback to an action
			if (this.callbacks[action] !== undefined) {
				
				// Pop callback
				var cb = this.callbacks[action];
				delete this.callbacks[action];

				// Handle only if still valid
				for (var i=0; i<cb.length; i++) {
					if (Date.now() <= cb[i].timeout) {
						try {
							cb[i].callback(parameters);
						} catch(e) {
							console.error("Error handing callback action '",action,"':",e);
						}
					}
				}
			}

			// Handle action by the implementation
			this.handleAction(action, parameters);
		}

		/**
		 * Handle incoming binary message
		 */
		APIInterface.prototype.__handleBinary = function(action, payload) {
			if (!this.active) return;

			// Handle action by the implementation
			this.handleBinary(action, payload);
		}

		/////////////////////////////////////////////////////////
		// Helper classes
		/////////////////////////////////////////////////////////

		/**
		 * Close channel
		 */
		APIInterface.prototype.close = function() {
			if (!this.active) return;
			// Handle interruption
			this.__handleClose();
			// Remove from instances on the courseroom
			delete this.apiSocket.apiInstances[this.domain];
		}

		/**
		 * Register a callback when the given action arrives
		 *
		 * @param {string} action - The action name
		 * @param {function} callback - The callback to fire when a particular action arrives
		 * @param {int} timeout - The time to wait (in ms) before discarding the action arrival (Defaults to 30 seconds)
		 */
		APIInterface.prototype.callbackOnAction = function( action, callback, timeout ) {

			// Prepare callback array
			if (!this.callbacks[action])
				this.callbacks[action] = [];

			// Register callback
			this.callbacks[action].push({
				'timeout': Date.now() + (timeout == undefined ? 30000 : timeout),
				'callback': callback
			});

		}

		/**
		 * Send an action frame
		 *
		 * @param {string} action - The action name
		 * @param {object} parameters - The action parameters
		 * @param {function} callback - The callback to fire when a response arrives (optional)
		 */
		APIInterface.prototype.sendAction = function( action, parameters, callback ) {
			if (!this.active) return;
			
			// If we have a callback, wait for a '.response' action
			if (callback)
				this.callbackOnAction(action+'.response', callback);

			// Prepend domain name on the action
			var a = action;
			if (this.domain) a = this.domain+"."+a;

			// Forward action to the socket
			this.apiSocket.sendAction(a, parameters);

		}

		/**
		 * Send a binary payload frame
		 *
		 * @param {int} frameID - The frame ID
		 * @param {ArrayBuffer} payload - The binary payload to send
		 */
		APIInterface.prototype.sendBinary = function( frameID, payload ) {
			if (!this.active) return;

		}

		/**
		 * Return the API base class
		 */
		return APIInterface;

	}
);