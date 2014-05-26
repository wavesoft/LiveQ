
define(["core/util/event_base", "core/config"], 

	/**
	 * This module provides the {@link EventBase} class which
	 * is used in other places in this project for forwarding events
	 * to interested parties.
	 *
	 * @exports core/util/component
	 */
	function (EventBase, config) {

		/**
		 * Instantiate a new componet
		 *
		 * @class
		 * @classdesc The base Component class. All other components are derrived from this.
		 * @see {@link module:core/util/event_base~EventBase|EventBase} (Parent class)
		 */
		var Component = function() {

			// Initialize superclass
			EventBase.call(this);

		}

		// Subclass from EventBase
		Component.prototype = Object.create( EventBase.prototype );

		/**
		 * This function is called when the component is about to be
		 * hidden. The callback parameter MUST be fired when the component
		 * is ready for hiding.
		 *
		 * @abstract
		 * @param {function} cb_ready - Callback to be fired when the component is ready for hiding.
		 */
		Component.prototype.onWillHide = function(cb_ready) {
			cb_ready();
		};

		/**
		 * This function is called when the component is about to be
		 * shown. The callback parameter MUST be fired when the component
		 * is ready for hiding.
		 *
		 * @abstract
		 * @param {function} cb_ready - Callback to be fired when the component is ready for display.
		 */
		Component.prototype.onWillShow = function(cb_ready) {
			cb_ready();
		};

		/**
		 * This function is called when the component is hidden
		 *
		 * @abstract
		 */
		Component.prototype.onHidden = function() {
		};

		/**
		 * This function is called when the component is shown
		 *
		 * @abstract
		 */
		Component.prototype.onShown = function() {
		};

		/**
		 * This function is called when the component is resized
		 *
		 * @param {integer} width - The new width of the component
		 * @param {integer} height - The new height of the component
		 * @abstract
		 */
		Component.prototype.onResize = function(width, height) {
		};

		/**
		 * This function is called after the component is intialized
		 * and should return the DOM object to place on the document.
		 *
		 * @abstract
		 * @returns {DOMElement}
		 */
		Component.prototype.getDOMElement = function() {
			if (this['__errorElement'] == undefined)
				this.__errorElement = $('<div class="'+config.css['error-screen']+'"></div>');
			return this.__errorElement;
		};

		// Return component
		return Component;

	}

);