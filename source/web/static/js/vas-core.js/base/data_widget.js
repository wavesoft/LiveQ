
define(["core/base/component"], 

	/**
	 * This module provides the DataWidget class which is used for defining
	 * data-driven widgets. 
	 *
	 * @exports core/base/data_widget
	 */
	function (Component) {

		/**
		 * Instantiate a new DataWidget component
		 *
		 * @class
		 * @classdesc The base DataWidget class. All other data-drven Widgets are derrived from this.
		 * @param {DOMElement} hostDOM - The DOM element where the component should be hosted in
		 * @see {@link module:core/base/component~Component|Component} (Parent class)
		 */
		var DataWidget = function( hostDOM ) {

			// Initialize superclass
			Component.call(this, hostDOM);

		}

		// Subclass from Component
		DataWidget.prototype = Object.create( Component.prototype );

		/**
		 * This function is called when the metadata for this widget are
		 * available and can be applied to the configuration.
		 *
		 * Such metadata are usually the min/max value (if numberic), or
		 * the list options (if list) etc.
		 *
		 * @param {object} meta - The new metadata information
		 */
		DataWidget.prototype.onMetaUpdate = function(meta) {
		};

		/**
		 * This function is called when the data view of the widget must be updated.
		 *
		 * This function **MUST** handle cases where data is null or undefined. In such
		 * case, the widget should reset to displaying the default value.
		 * 
		 * @param {object} data - The new width of the component
		 */
		DataWidget.prototype.onUpdate = function(data) {
		};

		////////////////////////////////////////////////////////////
		//             Event definitions for JSDoc                //
		////////////////////////////////////////////////////////////

		/**
		 * This event should be fired when the user has triggered an update
		 * in the widget. The first parameter of this event is the new value
		 * of the widget.
		 *
		 * @param {object} value - The new value
		 * @event module:core/base/data_widget~DataWidget#valueChanged		
		 */

		// Return component
		return DataWidget;

	}

);