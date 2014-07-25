define(

	// Dependencies
	["jquery", "d3", "core/registry","core/base/data_widget" ], 

	/**
	 * This is the default data widget for visualizing a historgram
	 *
 	 * @exports vas-basic/dataviz/histogram
	 */
	function(config, d3, R, DataWidget) {

		/**
		 * The default observable body class
		 */
		var DataVizHistogram = function(hostDOM) {

			// Initialize widget
			DataWidget.call(this, hostDOM);

			// Prepare margin info
			this.margin = {
				'left': 40,
				'top': 10,
				'bottom': 10,
				'right': 10
			};

			// Prepare histogram SVG host
			this.svg = d3.select( this.hostDOM[0] )
						     .append("svg")
						     .attr("class", "dv-plot dv-invert");
			this.svgPlot = this.svg.append("g")
							 .attr("transform", "translate("+this.margin.left+","+this.margin.top+")");

		};

		// Subclass from ObservableWidget
		DataVizHistogram.prototype = Object.create( DataWidget.prototype );

		///////////////////////////////////////////////////////////////////////////////
		////                         UTILITY FUNCTIONS                             ////
		///////////////////////////////////////////////////////////////////////////////

		/**
		 * A Y-scale that protects against zero values
		 */
		DataVizHistogram.prototype.yScaleNonZero = function(y) { 
			if (y == 0) {
				return this.height - this.margin.top - this.margin.bottom;
			} else {
				return this.yScale(y);
			}
		}

		/**
		 * Regenerate histogram data
		 */
		DataVizHistogram.prototype.regen = function() {

			// If we have no data, plot no data points
			if (this.data != null) {

				// ------------------------------------------
				//  Data Definition
				// ------------------------------------------

				// Calculate bounds
				var bounds = this.data.getBounds(),
					refBounds = this.ref.data.getBounds(),
					xMin  = Math.min( bounds[0], refBounds[0] ),
					xMax  = Math.max( bounds[1], refBounds[1] ),
					yMin  = Math.min( bounds[2], refBounds[2] ),
					yMax  = Math.max( bounds[3], refBounds[3] ),
					yZero = Math.min( bounds[4], refBounds[4] ),
					width = this.width - this.margin.left - this.margin.right,
					height = this.height - this.margin.top - this.margin.bottom;

				// Check what kind of scale do we use
				var xScaleClass = d3.scale.linear,
					yScaleClass = d3.scale.log;

				// Prepare X Axis
				this.xScale = xScaleClass()
					.range([0, width])
					.domain([xMin, xMax])
					.clamp(true);
				this.xAxis = d3.svg.axis()
					.scale(this.xScale)
					.orient("bottom");

				// Prepare Y Axis
				this.yScale = yScaleClass()
					.range([height, 0])
					.domain([yMin, yMax])
					.clamp(true);
				this.yAxis = d3.svg.axis()
					.scale(this.yScale)
					.orient("left");

				// Prepare plot configuration
				var plots = [
					{
						'id'	 : 'plot-ref',
						'legend' : 'Reference Data',
						'color'  : '#00ffff',
						'data'   : this.ref.data.values
					},
					{
						'id'	 : 'plot-sim',
						'legend' : 'Simulation Data',
						'color'  : '#ff0000',
						'data'   : this.data.values
					}
				];

				// ------------------------------------------
				//  Graphic Definitions
				// ------------------------------------------

				var self = this;
				var pathLine = d3.svg.line()
					.x(function(d,i) { return self.xScale(d[3]); })
					.y(function(d,i) { return self.yScaleNonZero(d[0]); });

				// ------------------------------------------
				//  Graphic Design - Plots
				// ------------------------------------------

				// Loop over plots
				for (var j=0; j<plots.length; j++) {
					var plot = plots[j];

					// Access plot's group
					var group = this.svgPlot.select("g.plot#"+plot.id);
					if (group.empty()) {
						group = this.svgPlot.append("g")
							.attr("class", "plot")
							.attr("id", plot.id);
					}

					// Access D3 record for this element
					var record = group.selectAll("path.plot-line")
									.data([plot.data]);

					// Enter
					record.enter()
						.append("svg:path")
							.attr("class", "plot-line")
							.attr("stroke", plot.color);

					// Update
					record.attr("d", pathLine)
							.attr("stroke", plot.color);

					// Delete
					record.exit()
						.remove();

				}

				// ------------------------------------------
				//  Graphic Design - Axes
				// ------------------------------------------

				// Create the X and Y axis
				this.xAxisGraphic = this.svgPlot.append("g")
				    .attr("class", "x axis")
				    .attr("transform", "translate(0,"+height+")")
				    .call(this.xAxis);
				this.yAxisGraphic = this.svgPlot.append("g")
				    .attr("class", "y axis")
				    .call(this.yAxis);

				// Render them
				this.xAxisGraphic.call(this.xAxis);
				this.yAxisGraphic.call(this.yAxis);

			}

		}

		///////////////////////////////////////////////////////////////////////////////
		////                          EVENT HANDLERS                               ////
		///////////////////////////////////////////////////////////////////////////////

		/**
		 * Update the histogram with the data given
		 * @param {object} data - The new data to render on the histogram
		 */
		DataVizHistogram.prototype.onUpdate = function( data ) {

			// Prepare data variables
			if (!data) {
				this.data = null;
				this.ref = null;
			} else {
				this.data = data['data'];
				this.ref = data['ref'];
			}

			// Regen plot
			this.regen();
			
		}

		/**
		 * Hide histogram when to be hidden
		 * @param {function} cb - Callback to fire when hiding process completed
		 */
		 /*
		DataVizHistogram.prototype.onWillHide = function( cb ) {
			$(this.svg).hide();
			cb();
		}
		*/

		/**
		 * Hide histogram when to be shown
		 * @param {function} cb - Callback to fire when showing process completed
		 */
		 /*
		DataVizHistogram.prototype.onWillShow = function( cb ) {
			$(this.svg).show();
			cb();
		}
		*/

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
			this.width = width;
			this.height = height;

			// Resize SVG
			this.svg
				.attr("width", width)
				.attr("height", height);

			// Regen plot
			this.regen();

		}

		// Store histogram data visualization on registry
		R.registerComponent( 'dataviz.histogram', DataVizHistogram, 1 );

	}

);