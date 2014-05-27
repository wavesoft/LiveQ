
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
		 * @param {DOMElement} hostDOM - The DOM element where the component should be hosted in
		 * @see {@link module:core/util/event_base~EventBase|EventBase} (Parent class)
		 */
		var Component = function( hostDOM ) {

			// Initialize superclass
			EventBase.call(this);

			// Keep reference of the host DOM element
			this.hostElement = hostDOM;

		}

		// Subclass from EventBase
		Component.prototype = Object.create( EventBase.prototype );

		/**
		 * This function is called when the component is about to be
		 * hidden. The callback parameter MUST be fired when the component
		 * is ready for hiding.
		 *
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
		 * @param {function} cb_ready - Callback to be fired when the component is ready for display.
		 */
		Component.prototype.onWillShow = function(cb_ready) {
			cb_ready();
		};

		/**
		 * This function is called when the component is hidden
		 */
		Component.prototype.onHidden = function() {
		};

		/**
		 * This function is called when the component is shown
		 */
		Component.prototype.onShown = function() {
		};

		/**
		 * This function is called when the host DOM element is resized
		 *
		 * @param {integer} width - The new width of the component
		 * @param {integer} height - The new height of the component
		 */
		Component.prototype.onResize = function(width, height) {
		};

		/**
		 * This function is used to provide a fixed-size dimentions for the
		 * componenet -if it supports such-.
		 *
		 * This function should return either an array with the dimentions as
		 * a [width, height] pair or **undefined** if it does not have any fixed dimentions.
		 *
		 */
		Component.prototype.getPreferredSize = function() {
			return undefined;
		};


		// Return component
		return Component;

	}

);