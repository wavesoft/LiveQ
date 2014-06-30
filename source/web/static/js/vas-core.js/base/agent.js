
define(["core/base/component"], 

	/**
	 * This module provides the Agent base class which is responsible for presenting
	 * various information to the user in a nice way.
	 *
	 * The name 'Agent' is borrowed by microsoft's agents, who kept us company througout
	 * the older office suites.
	 *
	 * @exports core/base/agent
	 */
	function (Component) {

		/**
		 * Instantiate a new VisualAgent component
		 *
		 * @class
		 * @classdesc The base VisualAgent class. All other presentation agents are derrived from this.
		 * @param {DOMElement} hostDOM - The DOM element where the component should be hosted in
		 * @see {@link module:core/base/component~Component|Component} (Parent class)
		 */
		var VisualAgent = function( hostDOM ) {

			// Initialize superclass
			Component.call(this, hostDOM);

		}

		// Subclass from Component
		VisualAgent.prototype = Object.create( Component.prototype );

		/**
		 * This function is called the tutorial sequence is available.
		 *
		 * The visual agent should now load the requested video source, initialize
		 * it's sub-systems and when ready fire the cb callback.
		 *
		 * @param {object} sequence - The tutorial sequence
		 * @param {function} cb - The callback function to call when the system is initialized
		 */
		VisualAgent.prototype.onSequenceDefined = function(sequence, cb) {
			if (cb) cb();
		};

		/**
		 * This function is called by the system when the tutorial should start.
		 */
		VisualAgent.prototype.onStart = function() {
		};

		/**
		 * This function is called by the system when the tutorial should be
		 * interrupted.
		 */
		VisualAgent.prototype.onStop = function() {
		};


		////////////////////////////////////////////////////////////
		//             Event definitions for JSDoc                //
		////////////////////////////////////////////////////////////

		/**
		 * This event is fired by the visual agent when a component of the user
		 * interface must be focused.
		 *
		 * @param {string} key - The key of the visual element to focus
		 * @event module:core/base/data_widget~VisualAgent#focusTarget		
		 */

		/**
		 * This event is fired by the visual agent when a component of the user
		 * interface must be focused.
		 *
		 * @param {object} value - The new value
		 * @event module:core/base/data_widget~VisualAgent#blurTarget		
		 */

		// Return component
		return VisualAgent;

	}

);