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

		/**
		 * Close channel
		 */
		APIInterface.prototype.close = function() {
			// Handle interruption
			this.handleClose();
			// Unregister all event listeners
			this.offAll();
			// Remove from instances on the courseroom
			delete this.apiSocket.apiInstances[this.domain];
		}

		/**
		 * Handle channel interruption
		 */
		APIInterface.prototype.handleClose = function() {

		}

		/**
		 * Handle an incoming action message
		 */
		APIInterface.prototype.handleAction = function( action, parameters ) {
		}

		/**
		 * Handle an incoming binary message
		 */
		APIInterface.prototype.handleBinary = function( action, payload ) {
		}

		/**
		 * Send an action frame
		 */
		APIInterface.prototype.sendAction = function( action, parameters ) {
			
			// Prepend domain name on the action
			var a = action;
			if (this.domain) a = this.domain+"."+a;

			// Forward action
			this.apiSocket.sendAction(a, parameters);

		}

		/**
		 * Send a binary payload frame
		 */
		APIInterface.prototype.sendBinary = function( action, payload ) {
		}

		/**
		 * Return the API base class
		 */
		return APIInterface;

	}
);