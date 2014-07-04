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

			// Prepare dummy histogram
			this.dummyHisto = $('<div style="background: url(static/img/demo/histo-2.png) no-repeat center center; background-size: contain;"></div>');
			hostDOM.append( this.dummyHisto );

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

		/**
		 * Resize histogram to fit container
		 * @param {int} width - The width of the container
		 * @param {int} height - The height of the container
		 */
		DataVizHistogram.prototype.onResize = function( width, height ) {
			this.dummyHisto.css({
				'width': width,
				'height': height
			})
		}

		// Store histogram data visualization on registry
		R.registerComponent( 'dataviz.histogram', DataVizHistogram, 1 );

	}

);