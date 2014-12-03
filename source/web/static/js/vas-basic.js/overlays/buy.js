define(

	// Dependencies

	["jquery", "core/registry","core/base/data_widget", "core/db" ], 

	/**
	 * This is the default component for displaying Overlay information when buying something
	 *
 	 * @exports vas-basic/overlay/buy
	 */
	function(config, R, DataWidget, DB) {

		/**
		 * The default tunable body class
		 */
		var OverlayBuy = function(hostDOM) {

			// Initialize widget
			DataWidget.call(this, hostDOM);

			// Prepare data
			

		};

		// Subclass from ObservableWidget
		OverlayBuy.prototype = Object.create( DataWidget.prototype );

		// Store overlay component on registry
		R.registerComponent( 'overlay.buy', OverlayBuy, 1 );

	}

);