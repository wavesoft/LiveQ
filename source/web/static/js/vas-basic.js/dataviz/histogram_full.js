define(

	// Dependencies
	["jquery", "d3", "core/registry","core/base/data_widget", "liveq/Calculate" ], 

	/**
	 * This is the default data widget for visualizing a historgram
	 *
 	 * @exports vas-basic/dataviz/histogram
	 */
	function(config, d3, R, DataWidget, Calculate) {

		/**
		 * A histogram object that can be placed 
		 *
		 * @class
		 */
		var PlotHistogram = function(parent, histo, color, title) {

			// Keep references
			this.parent = parent;
			this.histo = histo;

			// Setup information
			this.color = color || "red";
			this.title = title || histo.id;

			// Calculate the ID from the histogram
			this.id = histo.id.substr(1).replace(/[\/_]/g,"-");

		}

		/**
		 * Create and return the SVG group with the given ID
		 *
		 * @param {d3.selection} hostSVG - The SVG container where we should create our element
		 * @param {Object} boudns - An object that contains the bound rectangle fields for the plot: x,y,width,height 
		 * @returns {d3.selection} Returns an SVG element that will be used for rendering the plot
		 */
		PlotHistogram.prototype.create = function( hostSVG, bounds ) {
		}

		/**
		 * Create and return the SVG group with the given ID
		 *
		 * @param {d3.selection} hostSVG - The SVG container where we should create our element
		 * @param {d3.selection} plotSVG - The SVG element created previously with the create() function
		 * @param {Object} boudns - An object that contains the bound rectangle fields for the plot: x,y,width,height 
		 * @returns {d3.selection} Removes the plotSVG element from the hostSVG container
		 */
		PlotHistogram.prototype.remove = function( hostSVG, plotSVG, bounds ) {
		}

		/**
		 * Update the metrics of the histogram
		 */
		PlotHistogram.prototype.update = function( hostSVG, plotSVG, bounds ) {
		}

		////////////////////////////////////////////////////////////
		//              Full Histogrma Visualization
		////////////////////////////////////////////////////////////

		/**
		 * The default observable body class
		 *
		 * @class
		 * @exports vas-basic/dataviz/histogram_full
		 */
		var DataVizFullHistogram = function(hostDOM) {

			// Initialize widget
			DataWidget.call(this, hostDOM);

			// Initialize properties
			this.metadata = {};

			// Create SVG instance and specify dimentions
			this.svg = d3.select(this.hostDOM.get(0))
				.append("svg:svg")
					.attr("class", "dv-plot-full")
					.attr("width", this.width || 1)
					.attr("height", this.height || 1);

			// Predefined colors
			this.colors = [
					"#0066FF", "#000000", "#CC6600", "#669900",
					"#3333CC", "#993333", "#996633", "#006666"
				];
			this.lastColor = 0;

			// Prepare style information
			this.style = {

				'bulletSize'   : 2,
				'titlePad'	   : 5,
				'legendBullet' : 10,
				'legendHeight' : 16,

				'plotMargin': {
					'left': 40,
					'top': 30,
					'bottom': 30,
					'right': 20
				},

				'features': {
					'errorBand': true,
					'errorBarsY' : true,
					'colorError': false
				}

			};

			// Initialize plot components
			this.initPlot();

			// Prepare histogram plots
			this.plots = [ ];

		}

		// Subclass from ObservableWidget
		DataVizFullHistogram.prototype = Object.create( DataWidget.prototype );


		/**
		 * Safe accessor to the yScale
		 * @private
		 */
		DataVizFullHistogram.prototype._yScale = function( v ) {
			var width = this.width - this.style.plotMargin.right - this.style.plotMargin.left,
				height = this.height - this.style.plotMargin.top - this.style.plotMargin.bottom;

			if (v == 0) {
				return height;
			} else {
				return Math.min(this.yScale(v), height);
			}
		}

		/**
		 * Initialize histogram images
		 *
		 * This function preloads the given 3 images and places them on the histogram
		 *
		 * @param {string} iTitle - The URL of the image to use for title
		 * @param {string} iX - The URL of the image to use for X-Axis label
		 * @param {string} iY - The URL of the image to use for Y-Axis label
		 *
		 */
		DataVizFullHistogram.prototype.initImages = function( iTitle, iX, iY ) {
			var width = this.width - this.style.plotMargin.right - this.style.plotMargin.left,
				height = this.height - this.style.plotMargin.top - this.style.plotMargin.bottom,
				self = this;

			// Remove previous instances
			if (self.imgXLabel) self.imgXLabel.remove();
			if (self.imgYLabel) self.imgYLabel.remove();
			if (self.imgTitle) self.imgTitle.remove();

			// Check for title
			if (iX) {
				var imTitle = new Image();
				imTitle.onload = function() {
					var imW = this.width, imH = this.height;

					// Create X-Axis
					self.imgXLabel = self.svgPlot.append("image")
						.attr("xlink:href", iX)
						.attr("width", imW)
						.attr("height", imH)
						.attr("x", width-imW )
						.attr("y", height-imH-self.style.titlePad );

				};
				imTitle.src = iX;
			}

			// Check for title
			if (iY) {
				var imTitle = new Image();
				imTitle.onload = function() {
					var imW = this.width, imH = this.height;

					// Create X-Axis
					self.imgYLabel = self.svgPlot.append("image")
						.attr("xlink:href", iY)
						.attr("width", imW)
						.attr("height", imH)
						.attr("transform", "rotate(270) translate("+(-imW)+","+self.style.titlePad+")");


				};
				imTitle.src = iY;
			}

			// Check for title
			if (iTitle) {
				var imTitle = new Image();
				imTitle.onload = function() {
					var imW = this.width, imH = this.height;

					// Create X-Axis
					self.imgTitle = self.svg.append("image")
						.attr("xlink:href", iTitle)
						.attr("width", imW)
						.attr("height", imH)
						.attr("x", self.style.plotMargin.left+(width-imW)/2 )
						.attr("y", self.style.titlePad );

				};
				imTitle.src = iTitle;
			}

		}

		/**
		 * Initialize histogram plots
		 */
		DataVizFullHistogram.prototype.initPlot = function() {
			var width = this.width - this.style.plotMargin.right - this.style.plotMargin.left,
				height = this.height - this.style.plotMargin.top - this.style.plotMargin.bottom;

			// Prepare scales
			this.xScale = d3.scale.linear()
				.range([0, width])
				.clamp(true)
				.domain([0, 1]);
			this.yScale = d3.scale.log()
				.range([height, 0])
				.clamp(true)
				.domain([0, 1]);

			// Prepare axes
			this.xAxis = d3.svg.axis()
			    .scale(this.xScale)
			    .orient("bottom");
			this.yAxis = d3.svg.axis()
			    .scale(this.yScale)
			    .orient("left");

			// Create a group for hosting the SVG plot
			this.svgPlot = this.svg.append("g")
				.attr("transform", "translate("+this.style.plotMargin.left+","+this.style.plotMargin.top+")");

			// Create backdrop
			this.svgBackdrop = this.svgPlot.append("g")
				.attr("opacity", 0)
				.attr("class", "backdrop");

			// Create the X and Y axis
			this.xAxisGraphic = this.svgPlot.append("g")
			    .attr("class", "x axis")
			    .attr("transform", "translate(0,"+height+")")
			    .call(this.xAxis);
			this.yAxisGraphic = this.svgPlot.append("g")
			    .attr("class", "y axis")
			    .call(this.yAxis);

			// Crate legend
			this.svgLegend = this.svgPlot.append("g")
				.attr("class", "legend")
			    .attr("transform", "translate("+width+","+(height-this.style.titlePad*2-20)+")");

		}

		/**
		 * Add a histogram in the plot window
		 *
		 * @param {HistogramData} histo - The histogram data to place on the plot.
		 * @param {string} title - The title of the histogram. If missing, the histogram ID will be used.
		 * @param {string} color - The color of the new histogram. If missing, a color will be picked.
		 */
		DataVizFullHistogram.prototype.addHistogram = function(histo, title, color) {

			// Pick next color if color is not defined
			if (!color) {
				color = this.colors[this.lastColor];
				if (++this.lastColor>=this.colors.length)
					this.lastColor=0;
			}

			// Create plot
			var plot = new PlotHistogram(this, histo, color, title);
			this.plots.push(plot);

			// Update
			this.rescaleAxes();
			this.updateLegend();
			this.update();

			// Return plot instance
			return plot;

		}

		/**
		 * Calculate how many points are inside each region and find
		 * the one with the smallest number of points.
		 *
		 * This function will return the index of the region array specified.
		 *
		 * @param {array} areas - The array of the region boundaries to check (format: [x,y,w,h])
		 */
		DataVizFullHistogram.prototype.getLeastUsedRegion = function(areas) {

			// Initialize usage array
			var usage = [ ];
			for (var i=0; i<areas.length; i++) {
				usage.push(0);
			}

			// Iterate over the histograms
			for (var j=0; j<this.plots.length; j++) {
				var histo = this.plots[j].histo;
				// Run over bins and get point positions
				for (var i=0; i<histo.bins; i++) {
					// Get position
					var x = this.xScale(histo.values[i][3]),
						y = this._yScale(histo.values[i][0]);

					// Hit-test areas
					for (var k=0; k<areas.length; k++) {
						if ( (x >= areas[k][0]) && (x <= (areas[k][0]+areas[k][2])) &&
							 (y >= areas[k][1]) && (y <= (areas[k][1]+areas[k][3])) ) {
							usage[k] += 1;
							break;
						}
					}
				}
			}

			// Find minimum
			var min=usage[0], min_index=0;
			for (var i=0; i<usage.length; i++) {
				if (usage[i]<min) {
					min=usage[i];
					min_index=i;
				}
			}

			// Return index
			return min_index;

		}

		/**
		 * Update the histogram legend
		 *
		 * This function re-aligns and re-draws the legend object of the plot.
		 */
		DataVizFullHistogram.prototype.updateLegend = function() {
			var self = this, lb = this.style.legendBullet,
				width = this.width - this.style.plotMargin.right - this.style.plotMargin.left,
				height = this.height - this.style.plotMargin.top - this.style.plotMargin.bottom;

			//
			// Find in which region to place the legend.
			// The placeAt gets one of the following values:
			//
			//  +---+---+
			//  | 0 | 1 |
			//  +---+---+
			//  | 2 | 3 |
			//  +---+---+
			//
			var midW = width/2, midH = height/2,
				placeAt = this.getLeastUsedRegion([
						[0,0,midW,midH], [midW,0,midW,midH],
						[0,midH,midW,midH], [midW,midH,midW,midH]
					]);

			// Calculate offsets, based on the area we should place the legend
			var rightAlign = false, ofsX = 0, ofsY = 0, yDirection = 1;
			if (placeAt == 0) {
				ofsX = this.style.titlePad*2 + 20;
				ofsY = 20;
			} else if (placeAt == 1) {
				rightAlign = true;
				ofsX = width;
				ofsY = 20;
			} else if (placeAt == 2) {
				yDirection = -1;
				ofsX = this.style.titlePad*2 + 20;
				ofsY = height - this.style.titlePad*2 - 20;
			} else if (placeAt == 3) {
				rightAlign = true;
				yDirection = -1;
				ofsX = width;
				ofsY = height - this.style.titlePad*2 - 20;
			}
			console.log("log:",placeAt,ofsX, ofsY, rightAlign, yDirection);

			// Set legend alignment
			this.svgLegend
				.attr("transform", "translate("+ofsX+","+ofsY+")");

			// Open data record
			var record = this.svgLegend.selectAll("g.legend-entry").data(this.plots);

			// Enter
			var newGroups = record.enter()
				.append("g")
					.attr("class", "legend-entry");
				if (rightAlign) {
					newGroups.append("path")
						.attr("d", "M"+(-lb)+","+(-lb/2)
								  +"L0,"+(-lb/2)
								  +"L0,"+(lb/2)
								  +"L"+(-lb)+","+(lb/2)
								  +"Z" );
					newGroups.append("text")
						.attr("transform", "translate("+(-lb-4)+",0)")
						.style("dominant-baseline", "middle")
						.style("text-anchor", "end" );
				} else {
					newGroups.append("path")
						.attr("d", "M"+lb+","+(-lb/2)
								  +"L0,"+(-lb/2)
								  +"L0,"+(lb/2)
								  +"L"+lb+","+(lb/2)
								  +"Z" );
					newGroups.append("text")
						.attr("transform", "translate("+(lb+4)+",0)")
						.style("dominant-baseline", "middle")
						.style("text-anchor", "start" );
				}

			// Update
			record
				.attr("transform", function(d,i) { 
					return "translate(0,"+(yDirection*i*self.style.legendHeight)+")"
				});
			record.selectAll("text")
				.text(function(d,i) { return d.title + (d.histo.interpolated?" [Estimate]":"") });
			record.selectAll("path")
				.attr("fill", function(d,i) { 
					var color = d.color;
					if (typeof(d.color) == 'object') {
						if (d.histo.interpolated) {
							color = d.color[1];
						} else {
							color = d.color[0];
						}
					}
					return color; 
				});

			// Update align
			if (rightAlign) {
				newGroups.selectAll("path")
					.attr("d", "M"+(-lb)+","+(-lb/2)
							  +"L0,"+(-lb/2)
							  +"L0,"+(lb/2)
							  +"L"+(-lb)+","+(lb/2)
							  +"Z" );
				record.selectAll("text")
					.attr("transform", "translate("+(-lb-4)+",0)")
					.style("text-anchor", "end" );
			} else {
				record.selectAll("text")
					.attr("transform", "translate("+(lb+4)+",0)")
					.style("text-anchor", "start" );
				newGroups.selectAll("path")
					.attr("d", "M"+lb+","+(-lb/2)
							  +"L0,"+(-lb/2)
							  +"L0,"+(lb/2)
							  +"L"+lb+","+(lb/2)
							  +"Z" );
			}

			// Delete
			record.exit()
				.remove();


		}

		/**
		 * Update the backdrop error visualization
		 *
		 * This function updates the histogram backdrop where the error comparison
		 * is printed.
		 */
		DataVizFullHistogram.prototype.updateErrorVisualization = function() {
			var self = this,
				width = this.width - this.style.plotMargin.right - this.style.plotMargin.left,
				height = this.height - this.style.plotMargin.top - this.style.plotMargin.bottom;

			// Not enough data for visualizing error
			if (this.plots.length < 2)
				return;

			// Prepare color scale
			var colorScale = d3.scale.pow()
				.range(['#FFFFFF', '#FFFF00', '#FF0000'])
				.domain([0.1, 1, 4])
				.clamp(true);

			// Compare bins of those histograms
			var yErrors = Calculate.chi2Bins( this.plots[1].histo, this.plots[0].histo );
			if (!yErrors)
				return;

			// Calculate x-bounds
			var data = [ ];
			for (var i=0; i<this.plots[0].histo.values.length; i++) {
				var val = this.plots[0].histo.values[i];
				data.push([
					val[3]-val[4],
					val[3]+val[5],
					yErrors[i]
				]);
			}

			// Update backdrop
			if (this.style.features.colorError) {
				this.svgBackdrop.attr("opacity", "1");
				var record = this.svgBackdrop.selectAll("rect").data(data);

				// Enter
				record.enter()
					.append("rect")
						.attr("height", height)
						.attr("y", 0)
						.attr("fill-opacity", 0.3);

				// Update
				record
					.attr("x", function(d,i){ return self.xScale(d[0]); })
					.attr("width", function(d,i){ return (self.xScale(d[1]) - self.xScale(d[0])); })
					.attr("fill", function(d,i){ return (d[2]==0)?"#000000":colorScale(d[2]); });

				// Delete
				record.exit()
					.remove();
			} else {
				this.svgBackdrop.attr("opacity", "0");
			}

		}

		/**
		 * Update the histogram elements
		 * 
		 * This function redraws the plot lines, the error bands and the error bars
		 * of all the plots in the PlotWindow.
		 */
		DataVizFullHistogram.prototype.update = function() {

			// Tunables
			var bulletSize = this.style.bulletSize,
				margin = this.style.plotMargin,
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
				},
				colorOpacity = function(color, percent) {
				    var num = parseInt(color.slice(1),16),
				    	A = Math.round(percent/100),
				    	R = parseInt((num >> 16) & 0xFF),
				    	G = parseInt((num >> 8) & 0xFF),
				    	B = parseInt(num & 0xFF);
				    return "rgba("+R+", "+G+", "+B+", "+A+")";
				};


			// Line path templates
			var self = this;
			var pathLine = d3.svg.line()
				//.interpolate("basis")
				.x(function(d,i) { return self.xScale(d[3]); })
				.y(function(d,i) { return self._yScale(d[0]); });
			var pathArea = d3.svg.area()
				.x(function(d)   { return self.xScale(d[3]); })
				.y0(function(d)  { return self._yScale(d[0]-d[2]); })
				.y1(function(d)  { return self._yScale(d[0]+d[1]); });

			// Process plots
			for (var i=0; i<this.plots.length; i++) {
				var plot = this.plots[i];

				// Access plot's group
				var group = this.svgPlot.select("g.plot#"+plot.id);
				if (group.empty()) {
					group = this.svgPlot.append("g")
						.attr("class", "plot")
						.attr("id", plot.id);
				}

				// Pick a plot color if we have multiple
				var color = plot.color;
				if (typeof(plot.color) == 'object') {
					if (plot.histo.interpolated) {
						color = plot.color[1];
					} else {
						color = plot.color[0];
					}
				}

				// -----------------------------
				//  Render Plot Area
				// -----------------------------

				// Access D3 record for this element
				var record = group.selectAll("path.plot-area")
								.data([plot.histo.values]);

				// Enter
				record.enter()
					.append("svg:path")
						.attr("class", "plot-area")
						.attr("fill", color)
						.attr("fill-opacity", 0.3);

				// Update
				record
					.attr("d", pathArea)
					.attr("visibility", this.style.features.errorBand ? "visible" : "hidden")
					.attr("fill", color);

				// Delete
				record.exit()
					.remove();

				// -----------------------------
				//  Render Plot Lines
				// -----------------------------

				// Access D3 record for this element
				var record = group.selectAll("path.plot-line")
								.data([plot.histo.values]);

				// Enter
				record.enter()
					.append("svg:path")
						.attr("class", "plot-line")
						.attr("stroke", color);

				// Update
				record.attr("d", pathLine)
						.attr("stroke", color);

				// Delete
				record.exit()
					.remove();

				// -----------------------------
				//  Render Plot Bullets
				// -----------------------------

				var record = group.selectAll("path.plot-bullet")
								.data(plot.histo.values);

				// Enter
				record.enter()
					.append("svg:path")
						.attr("class", "plot-bullet")
						.attr("stroke", color);

				// Update
				record
					.attr("transform", function(d,i){
						return "translate(" + self.xScale(d[3]) + "," + self._yScale(d[0]) + ")"
					})
					.attr("d", function(d,i) {
						var bs = bulletSize/2;

						// Path for the bullet
						var D_RECT= "M"+(-bs)+","+(-bs)+
									"L"+bs+","+(-bs)+
									"L"+bs+","+bs+
									"L"+(-bs)+","+bs+
									"Z";

						// Calculate error bar sizes
						var e_up = self._yScale(d[0]) - self._yScale(d[0]+d[1]),
							e_dn = self._yScale(d[0]-d[2]) - self._yScale(d[0]);

						// Draw upper error bar
						var D_YEUP = "M"+(-bs)+","+(-e_up)+"L"+bs+","+(-e_up)+"Z" +
									 "M0,"+(-e_up)+"L0,"+(-bs)+"Z";
						var D_YEDN = "M"+(-bs)+","+e_dn+"L"+bs+","+e_dn+"Z" +
									 "M0,"+e_dn+"L0,"+bs+"Z";

						return  (self.style.features.errorBarsY ? (D_YEUP+D_YEDN) : "") // Switchable Y error bars
								+ D_RECT;

					})
					.attr("stroke", color);

				// Delete
				record.exit()
					.remove();

			}

			// -----------------------------
			// Process axes
			// -----------------------------

			this.xAxisGraphic.call(this.xAxis);
			this.yAxisGraphic.call(this.yAxis);

			// Update comparison
			this.updateErrorVisualization();
		}

		/**
		 * Rescale axes in order to fit the histogram
		 *
		 * This function will find the boundaries of the X and Y values, and use them
		 * as the new range for the X and Y scale.
		 *
		 */
		DataVizFullHistogram.prototype.rescaleAxes = function() {

			// Reset histograms
			var hBounds,
				xMin=null, yMin=null,
				xMax=null, yMax=null,
				margin = this.style.plotMargin;

			// Run over histograms and calculate bounds
			for (var i=0; i<this.plots.length; i++) {

				// Fetch histogram bounds and skip empty ones
				hBounds = this.plots[i].histo.getBounds();
				if (!hBounds) continue;

				// Update collective bounds
				if (xMin == null) {
					xMin = hBounds[0]; xMax = hBounds[1];
					yMin = hBounds[2]; yMax = hBounds[3];
				} else {
					if (hBounds[0]<xMin) xMin=hBounds[0];
					if (hBounds[1]>xMax) xMax=hBounds[1];
					if (hBounds[2]<yMin) yMin=hBounds[2];
					if (hBounds[3]<yMax) yMax=hBounds[3];
				}
			}

			// Skip empty histograms
			if ((xMin == null) || (yMin == null)) return;

			// Update scale domains
			this.xScale
				.range([0, this.width-margin.left-margin.right])
				.domain([xMin, xMax]);
			this.yScale
				.range([this.height-margin.top-margin.bottom, 0])
				.domain([yMin, yMax]);

		}

		////////////////////////////////////////////////////////////
		//                  Component functions                   //
		////////////////////////////////////////////////////////////

		/**
		 * Resize histogram when component resizes
		 */
		DataVizFullHistogram.prototype.onResize = function(w, h) {
			var imW, imH;

			// Update properties
			this.width = w;
			this.height = h;

			// Update SVG DOM
			if (!this.svg) return;
			this.svg
				.attr("width", this.width)
				.attr("height", this.height);

			// Update components critical to dimentions
			var width = this.width - this.style.plotMargin.right - this.style.plotMargin.left,
				height = this.height - this.style.plotMargin.top - this.style.plotMargin.bottom;

			// Scale
			this.xScale.range([0, width]);
			this.yScale.range([height, 0]);
			// Legend
			this.svgLegend
			    .attr("transform", "translate("+width+","+(height-this.style.titlePad*2-20)+")");
			// X-Axis graphic
			this.xAxisGraphic
			    .attr("transform", "translate(0,"+height+")");

			// Update image positions
			if (this.imgXLabel) {
				imW = parseInt(this.imgXLabel.attr("width"));
				imH = parseInt(this.imgXLabel.attr("height"));
				this.imgXLabel
					.attr("x", width-imW )
					.attr("y", height-imH-this.style.titlePad );
			}
			if (this.imgYLabel) {
				imW = parseInt(this.imgYLabel.attr("width"));
				this.imgYLabel
					.attr("transform", "rotate(270) translate("+(-imW)+","+this.style.titlePad+")");
			}
			if (this.imgTitle) {
				imW = parseInt(this.imgTitle.attr("width"));
				imH = parseInt(this.imgTitle.attr("height"));
				this.imgTitle
					.attr("x", this.style.plotMargin.left+(width-imW)/2 )
					.attr("y", this.style.titlePad );
			}

			// Update everything else
			this.rescaleAxes();
			this.updateLegend();
			this.update();
		}

		/**
		 * Realign everything before show
		 */
		DataVizFullHistogram.prototype.onWillShow = function(cb) {
			this.onResize(this.width, this.height);
			cb();
		}

		/**
		 * Update histogram data
		 */
		DataVizFullHistogram.prototype.onUpdate = function(data) {

			// Remove all histograms
			this.plots = [];

			// If we have data, update histograms
			if (data != null) {
				this.addHistogram(data['data'], data['ref'].title);
				this.addHistogram(data['ref'].data, "Reference Data");

				// Initialize images
				this.initImages(
					data['ref'].imgTitle,
					data['ref'].imgXLabel,
					data['ref'].imgYLabel
					);
			}

			// Update
			this.rescaleAxes();
			this.updateLegend();
			this.update();
		}

		/**
		 * Update widget metadata
		 */
		DataVizFullHistogram.prototype.onMetaUpdate = function( config ) {
			this.metadata = config;

			// Update styling
			if (this.metadata['errorBars'] !== undefined) {
				this.style.features.errorBand = this.metadata['errorBars'];
				this.style.features.errorBarsY = this.metadata['errorBars'];
			}
			if (this.metadata['errorColors'] !== undefined) {
				this.style.features.colorError = this.metadata['errorColors'];
			}

			this.update();
		}

		// Store histogram data visualization on registry
		R.registerComponent( 'dataviz.histogram_full', DataVizFullHistogram, 1 );

	}

);