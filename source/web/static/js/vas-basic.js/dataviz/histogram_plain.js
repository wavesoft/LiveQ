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
		var PlainHistogram = function(hostDOM) {

			// Initialize widget
			DataWidget.call(this, hostDOM);

			// Prepare margin info
			this.margin = {
				'left': 40,
				'top': 10,
				'bottom': 20,
				'right': 10,
				'title': 5,
			};
			this.legend = {
				'bullet': 5,
				'height': 16,
				'titleMargin': 5,
			};
			this.errorBars = {
				'bulletSize' : 2
			}

			// Prepare histogram SVG host
			this.svg = d3.select( this.hostDOM[0] )
						.append("svg")
						.attr("class", "dv-plot");
			this.svgPlot = this.svg.append("g")
						.attr("transform", "translate("+this.margin.left+","+this.margin.top+")");
			this.svgLegend = this.svgPlot.append("g")
						.attr("class", "legend");

			// Reset datasets
			this.datasets = [];

			// Define scales to default values
			this.x = d3.scale.linear()
				.domain([0, 1])
				.range([0, 1]);
			this.y = d3.scale.linear()
				.domain([0, 1])
				.range([0, 1]);

			// Bounds
			this.ydomain = null;

			// Prepare axes
			this.xAxis = d3.svg.axis()
			    .scale(this.x)
			    .orient("bottom");
			this.yAxis = d3.svg.axis()
			    .scale(this.y)
			    .orient("left");

			// Create the X and Y axis
			/*
			this.xAxisGraphic = this.svgPlot.append("g")
			    .attr("class", "x axis")
			    .attr("transform", "translate(0,"+this.plotHeight+")")
			    .call(this.xAxis);
			this.yAxisGraphic = this.svgPlot.append("g")
			    .attr("class", "y axis")
			    .call(this.yAxis);
			*/

			// Create x-axis line
			this.xAxisGraphic = this.svgPlot.append("line")
				.attr("stroke", "#000000");

			// Create the x-lavels
			this.xLabelMin = this.svg.append("text")
				.text("From:")
				.attr("class", "x-label")
				.attr("text-anchor", "end")
				.attr("x", this.margin.left - 4)
				.attr("y", this.plotHeight + 12 + this.margin.top);

			this.xLabelMax = this.svg.append("text")
				.text("To:")
				.attr("text-anchor", "end")
				.attr("x", this.margin.left - 4)
				.attr("y", this.plotHeight + 24 + this.margin.top);


		};

		// Subclass from ObservableWidget
		PlainHistogram.prototype = Object.create( DataWidget.prototype );

		///////////////////////////////////////////////////////////////////////////////
		////                         HELPER FUNCTIONS                              ////
		///////////////////////////////////////////////////////////////////////////////

		/**
		 * Create the bins for this histogram, using the given information.
		 * The bins variable is an array of arrays, each one expected to be in form
		 * of [ ?,?,?, x, xErrPlus, xErrMinus ]
		 *
		 * @param {array} bins - An array with the bin boundary values
		 * @param {array} sets - An array of objects regarding the information 
		 *
		 */
		PlainHistogram.prototype.defineSets = function( bins, sets ) {

			// Reset datasets
			this.datasets = [];

			// Colors for the sets
			var set_colors = [
				'#000000', '#FF9900', '#3399FF',
				'#009900', '#FF0066', '#9900FF'
			];

			// Prepare sets
			for (var i=0; i<sets.length; i++) {
				var set = sets[i];
				if (set.name == undefined) set.name = "Set #"+i;
				if (set.color == undefined) set.color = set_colors[i % 6];
				if (set.opacity == undefined) set.opacity = 1;
				if (set.id == undefined) set.id = "set-"+i;

				if (set.valueBar == undefined) set.valueBar = true;
				if (set.valueColor == undefined) set.valueColor = set_colors[i % 6];

				// Prepare bins to this set
				set.data = [];
				for (var j=0; j<bins.length; j++) {
					// Create a bin record
					set.data.push({
						'y': 0,
						'yerrplus': 0,
						'yerrminus': 0,
						'xmin': bins[j][3] - bins[j][4],
						'xmax': bins[j][3] + bins[j][5]
					});
				}

				// Append to dataset
				this.datasets.push(set);

			}

			// Update stuff
			this.updateScales();
			this.updateBars();

		}

		/**
		 * Update scales to reflect data in the datasets
		 */
		PlainHistogram.prototype.updateScales = function() {

			// Calculate x/y value bounds
			var x_min = 0, x_max = 0,
				y_min = 0, y_max = 0,
				first = true;
			for (var i=0; i<this.datasets.length; i++) {
				for (var j=0; j<this.datasets[i].data.length; j++) {
					var point = this.datasets[i].data[j];
					if ((first) || (point.xmin < x_min))
						x_min = point.xmin;
					if ((first) || (point.xmax > x_max))
						x_max = point.xmax;
					if ((first) || (point.y-point.yerrminus < y_min))
						y_min = point.y-point.yerrminus;
					if ((first) || (point.y+point.yerrplus > y_max))
						y_max = point.y+point.yerrplus;
					first = false;
				}
			}

			// Estimate width/height boudns
			this.plotWidth = this.width - this.margin.left - this.margin.right;
			this.plotHeight = this.height - this.margin.top - this.margin.bottom;

			// Update scales 
			this.x.domain([x_min, x_max])
				  .range([0, this.plotWidth]);

			// When we don't have autoscale, disable
			if (this.ydomain != null) {
				this.y.domain(this.ydomain) // Reverse y axis
					  .range([this.plotHeight, 0]);
			} else {
				this.y.domain([y_min, y_max]) // Reverse y axis
					  .range([this.plotHeight, 0]);
			}

		}

		/**
		 * Regenerate bars of the histogram
		 */
		PlainHistogram.prototype.updateBars = function() {
			var self = this,
				shadeColor = function(color, percent) {   
				    var num = parseInt(color.slice(1),16),
				    	amt = Math.round(2.55 * percent),
				    	R = (num >> 16) + amt,
				    	G = (num >> 8 & 0x00FF) + amt,
				    	B = (num & 0x0000FF) + amt;
				    return "#" + (0x1000000 + 
				    	(R<255?R<1?0:R:255)*0x10000 + 
				    	(G<255?G<1?0:G:255)*0x100 + 
				    	(B<255?B<1?0:B:255)
				    	).toString(16).slice(1);
				};

			// Shared variables
			var info;

			// Helper to define/update bar
			var define_bar = function(selection) {

				// Get element references
				var rect = selection.select("rect"),
					line = selection.select("line"),
					vmax = selection.select("text.max"),
					vmin = selection.select("text.min");

				// Create missing
				if (rect.empty()) rect = selection.append("rect").attr("class", "d-error");
				if (line.empty()) line = selection.append("line");
				if (vmax.empty()) vmax = selection.append("text").attr("class", "max");
				if (vmin.empty()) vmin = selection.append("text").attr("class", "min");

				// Change the bar location
				selection
					.attr("transform", function(d,i) {
						return "translate("+ self.x(d.xmin) +",0)"
					});

				// Update rect
				rect
					.attr("fill", info.color)
					.attr("fill-opacity", info.opacity)
					.attr("x", 0)
					.attr("y", function(d) {
						return self.y(d.y+d.yerrplus);
					 })
					.attr("width", function(d) {
						return self.x(d.xmax) - self.x(d.xmin);
					 })
					.attr("height", function(d) {
						var h = self.y(d.y-d.yerrminus) - self.y(d.y+d.yerrplus);
						if (h + self.y(d.y+d.yerrplus) > self.plotHeight)
							h = self.plotHeight - self.y(d.y+d.yerrplus);
						return h;
					 });

				// Update value line
				if (info.valueBar) {
					line
						.attr("stroke", info.valueColor, 0)
						.attr("x1", function(d) { return 0; })
						.attr("x2", function(d) { return self.x(d.xmax) - self.x(d.xmin); })
						.attr("y1", function(d) { return self.y(d.y); })
						.attr("y2", function(d) { return self.y(d.y); });

					if (info.valueDash)
						line.attr("stroke-dasharray", info.valueDash)
				}

				// Update text
				vmin
					.attr("text-anchor", "middle")
					.attr("x", function(d) { 
						return (self.x(d.xmax) - self.x(d.xmin))/2
					 })
					.attr("y", self.plotHeight + 12)
					.text(function(d) { 
						return d.xmin.toFixed(2); 
					 });
				vmax
					.attr("text-anchor", "middle")
					.attr("x", function(d) { 
						return (self.x(d.xmax) - self.x(d.xmin))/2
					 })
					.attr("y", self.plotHeight + 24)
					.text(function(d) { 
						return d.xmax.toFixed(2); 
					 });

			}

			// Generate datasets
			for (var i=0; i<this.datasets.length; i++) {
				info = this.datasets[i];

				// Allocate plot if missing
				var plot = this.svgPlot.select("g#"+info.id+".plot");
				if (plot.empty()) {
					plot = this.svgPlot.append("g")
							.attr("class", "plot")
							.attr("id", info.id);
				}

				// Relational join for the data in this plot
				var changes = plot.selectAll(".bar")
					.data(info.data);

				// Create new elements
				changes.enter()
					.append("g")
					.attr("class", "bar")
					.call(define_bar);

				// Update changed elements
				changes
					.call(define_bar);

				// Delete old elements
				changes.exit()
					.remove();

			}

		}

		PlainHistogram.prototype.updateAxes = function() {

			/*
			// Update axes
			this.xAxisGraphic
			    .attr("transform", "translate(0,"+this.plotHeight+")")
				.call(this.xAxis);
			this.yAxisGraphic
				.call(this.yAxis);
			*/

			this.xAxisGraphic
				.attr("transform", "translate(0.5,0.5)") // For crisp line
				.attr("x1",0)
				.attr("x2",this.plotWidth)
				.attr("y1",this.plotHeight)
				.attr("y2",this.plotHeight);

			// Create the x-lavels
			this.xLabelMin
				.attr("y", this.plotHeight + 12 + this.margin.top);
			this.xLabelMax
				.attr("y", this.plotHeight + 24 + this.margin.top);

		}

		PlainHistogram.prototype.showErrorBars = function( show ) {
			if (show) {
				this.svg.attr("class", "dv-plot");
			} else {
				this.svg.attr("class", "dv-plot hide-d-error");
			}
		}


		///////////////////////////////////////////////////////////////////////////////
		////                          EVENT HANDLERS                               ////
		///////////////////////////////////////////////////////////////////////////////

		/**
		 * Update the histogram with the data given
		 * @param {object} data - The new data to render on the histogram
		 */
		PlainHistogram.prototype.onUpdate = function( data ) {

			// Fetch the data from the data parameter and apply it to the datasets
			if (data == null) {
				for (var i=0; i<this.datasets.length; i++) {
					for (var j=0; j<this.datasets[i].data.length; j++) {
						this.datasets[i].data[j].y = 0;
						this.datasets[i].data[j].yerrplus = 0;
						this.datasets[i].data[j].yerrminus = 0;
					}
				}
			} else {
				for (var i=0; i<this.datasets.length; i++) {
					for (var j=0; j<this.datasets[i].data.length; j++) {
						this.datasets[i].data[j].y = data[i][j][0];
						this.datasets[i].data[j].yerrplus = data[i][j][1];
						this.datasets[i].data[j].yerrminus = data[i][j][2];
					}
				}
			}

			this.updateScales();
			this.updateBars();
			this.updateAxes();

		}

		/**
		 * Update the histogram with the data given
		 * @param {object} data - The new data to render on the histogram
		 */
		PlainHistogram.prototype.onMetaUpdate = function( data ) {

			// Check if we have hard-coded domain
			if (data['domain'] != undefined)
				this.ydomain = data['domain'];

			// (Re-)define sets
			this.defineSets( data['bins'], data['sets'] );

		}

		/**
		 * Resize histogram to fit container
		 * @param {int} width - The width of the container
		 * @param {int} height - The height of the container
		 */
		PlainHistogram.prototype.onResize = function( width, height ) {
			this.width = width;
			this.height = height;

			// Resize SVG
			this.svg
				.attr("width", width)
				.attr("height", height);

			// Update scales
			this.updateScales();
			this.updateBars();

		}

		// Store histogram data visualization on registry
		R.registerComponent( 'dataviz.histogram_plain', PlainHistogram, 1 );

	}

);