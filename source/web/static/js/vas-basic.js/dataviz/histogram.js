define(

	// Dependencies
	["jquery", "core/registry","core/base/data_widget" ], 

	/**
	 * This is the default data widget for visualizing a historgram
	 *
 	 * @exports vas-basic/dataviz/histogram
	 */
	function(config, R, DataWidget) {

		/**
		 * The default observable body class
		 */
		var DataVizHistogram = function(hostDOM) {

			// Initialize widget
			DataWidget.call(this, hostDOM);

			// Prepare infoblock

		};

		// Subclass from ObservableWidget
		DataVizHistogram.prototype = Object.create( DataWidget.prototype );

		/**
		 * Update the histogram with the data given
		 * @param {object} data - The new data to render on the histogram
		 */
		DataVizHistogram.prototype.onUpdate = function( widget ) {

		}

		/**
		 * Update the histogram with the data given
		 * @param {object} data - The new data to render on the histogram
		 */
		DataVizHistogram.prototype.onMetaUpdate = function( widget ) {

		}

		// Store histogram data visualization on registry
		O.registerComponent( 'dataviz.histogram', DataVizHistogram, 1 );

	}

);