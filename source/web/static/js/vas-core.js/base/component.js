
define(["core/util/event_base", "core/config"], 

	/**
	 * This module provides the base component class which is used for derriving all of the
	 * user interface widgets and screens.
	 *
	 * @exports core/base/component
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

			// The child components
			this.childComponents = [];

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

		/**
		 * Add a child component wich is going to receive component events
		 * and it's events will be propagated to this component.
		 *
		 * @param {Component} com - The component to handle
		 */
		Component.prototype.addChild = function(com) {
			this.childComponents.push(com);

			// Override all the onXXX functions
			var self = this;
			for (k in this) {
				if ((k.substr(0,2) == "on") && (k.length > 2)) {
					(function(key, comFn, comRef) {
						console.log(key);
						if (!comFn) return;
						var originalFn = self[key];
						self[key] = function() {
							comFn.apply(comRef, arguments);
							originalFn.apply(this, arguments);
						}
					})(k, com[k], com);
				}
			}

		};


		// Return component
		return Component;

	}

);