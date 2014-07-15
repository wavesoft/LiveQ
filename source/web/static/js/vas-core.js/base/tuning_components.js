
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

		/**
		 * Update the display of saved slots
		 */
		TunableWidget.prototype.onMarkersUpdated = function(slots) {
		}

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

		/**
		 * This event is fired when the user requested more information regarding the 
		 * tunable component (typically this appears when the user leaves the mouse for
		 * a couple of milliseconds on the tile)
		 *
		 * @param {object} meta - The metadata of the tunable widget to show more details for
		 * @event module:core/base/tuning_components~TunableWidget#showDetails		
		 */

		/**
		 * This event is fired when the tunable component does not require to 
		 * the additional information displayed.
		 *
		 * @event module:core/base/tuning_components~TunableWidget#hideDetails		
		 */

		/**
		 * This event is fired when the user has clicked on the tunable component.
		 *
		 * @event module:core/base/tuning_components~TunableWidget#click	
		 */

		/**
		 * This event is fired when the user has changed the value of the tunable.
		 *
		 * @event module:core/base/tuning_components~TunableWidget#valueChanged	
		 */

		/**
		 * This event is fired when the user requested more information regarding the 
		 * observable component (typically this appears when the user leaves the mouse for
		 * a couple of milliseconds on the tile)
		 *
		 * @param {object} meta - The metadata of the observable widget to show more details for
		 * @event module:core/base/tuning_components~ObservableWidget#showDetails		
		 */

		/**
		 * This event is fired when the observable component does not require to 
		 * the additional information displayed.
		 *
		 * @event module:core/base/tuning_components~ObservableWidget#hideDetails		
		 */

		/**
		 * This event is fired when the user has clicked on the observable component.
		 *
		 * @event module:core/base/tuning_components~ObservableWidget#click	
		 */

		////////////////////////////////////////////////////////////

		// Expose tuning components
		var tuningComponents = {
			'TunableWidget'		: TunableWidget,
			'ObservableWidget'	: ObservableWidget,
		};

		return tuningComponents;

	}
);
