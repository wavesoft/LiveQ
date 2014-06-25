
define(["core/config", "core/base/data_widget", "core/base/component" ], 

	/**
	 * This module provides the base classes for all the tuning-related operations
	 * such as editing a tunable parameters and visualizing observable results.
	 *
 	 * @exports core/base/tuning_components
	 */
	function(config, DataWidget, Component) {

		////////////////////////////////////////////////////////////
		/**
		 * Initializes a new Tuning Widget Component.
		 *
		 * This component is used for allowing the user to visually edit the value of
		 * a tunable component.
		 *
		 * @class
		 * @classdesc Base class for providing a tunable parameter editing interface.
		 * @param {DOMElement} hostDOM - The DOM element where the component should be hosted in
		 * @see {@link module:core/base/data_widget~DataWidget|DataWidget} (Parent class)
		 *
		 */
		var TunableWidget = function( hostDOM ) {

			// Initialize base class
			DataWidget.call(this, hostDOM);

		}

		// Subclass from DataWidget
		TunableWidget.prototype = Object.create( DataWidget.prototype );

		////////////////////////////////////////////////////////////
		/**
		 * Initializes a new Observable Widget Component.
		 *
		 * This component is used to render the value of an observable
		 *
		 * @class
		 * @classdesc Base class for providing a tunable visualization.
		 * @param {DOMElement} hostDOM - The DOM element where the component should be hosted in
		 * @see {@link module:core/base/data_widget~DataWidget|DataWidget} (Parent class)
		 *
		 */
		var ObservableWidget = function( hostDOM ) {

			// Initialize base class
			DataWidget.call(this, hostDOM);

		}

		// Subclass from DataWidget
		ObservableWidget.prototype = Object.create( DataWidget.prototype );

		////////////////////////////////////////////////////////////
		//             Event definitions for JSDoc                //
		////////////////////////////////////////////////////////////

		////////////////////////////////////////////////////////////

		// Expose tuning components
		var tuningComponents = {
			'TunableWidget'		: TunableWidget,
			'ObservableWidget'	: ObservableWidget,
		};

		return tuningComponents;

	}
);
