/**
 * A Plot window where plots can be placed
 * @class
 */
LiveQ.PlotWindow = function(host, config) {
	var self = this;

	// Prepare default configuration
	var cfg = config || { };
	cfg.width = cfg.width || 400;
	cfg.height = cfg.height || 300;
	cfg.imgTitle = cfg.imgTitle || "";
	cfg.imgXLabel = cfg.imgXLabel || "";
	cfg.imgYLabel = cfg.imgYLabel || "";

	// Store dimentions
	this.width = cfg.width;
	this.height = cfg.height;

	// Create SVG instance and specify dimentions
	this.svg = d3.select(host)
		.append("svg:svg")
			.attr("width", this.width)
			.attr("height", this.height);

	// Predefined colors
	this.colors = [
			"#0066FF", "#000000", "#CC6600", "#669900",
			"#3333CC", "#993333", "#996633", "#006666"
		];
	this.lastColor = 0;

	// Prepare style information
	this.style = {

		'bulletSize'   : 4,
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
			'errorBand': false,
			'errorBarsY' : true
		}

	};

	// Initialize plot components
	this.initPlot();

	// Initialize images
	this.initImages(
		cfg.imgTitle,
		cfg.imgXLabel,
		cfg.imgYLabel
		);

	// Prepare histogram plots
	this.plots = [ ];

}

/**
 * Initialize histogram images
 */
LiveQ.PlotWindow.prototype.initImages = function( iTitle, iX, iY ) {
	var width = this.width - this.style.plotMargin.right - this.style.plotMargin.left,
		height = this.height - this.style.plotMargin.top - this.style.plotMargin.bottom,
		self = this;

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
			self.imgXLabel = self.svgPlot.append("image")
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
LiveQ.PlotWindow.prototype.initPlot = function() {
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

	// Create the X and Y axis
	this.xAxisGraphic = this.svgPlot.append("g")
	    .attr("class", "x axis")
	    .attr("transform", "translate(0,"+height+")")
	    .call(this.xAxis);
	this.yAxisGraphic = this.svgPlot.append("g")
	    .attr("class", "y axis")
	    .call(this.yAxis);

	// Crate group
	this.svgLegend = this.svgPlot.append("g")
		.attr("class", "legend")
	    .attr("transform", "translate("+width+","+(height-this.style.titlePad*2-20)+")");

}

/**
 * Add a histogram in the plot window
 */
LiveQ.PlotWindow.prototype.addHistogram = function(histo, title, color) {

	// Pick next color if color is not defined
	if (!color) {
		color = this.colors[this.lastColor];
		if (++this.lastColor>=this.colors.length)
			this.lastColor=0;
	}

	// Create plot
	var plot = new LiveQ.PlotHistogram(this, histo, color, title);
	this.plots.push(plot);

	// Update
	this.rescaleAxes();
	this.updateLegend();
	this.update();

	// Return plot instance
	return plot;

}

/**
 * Calculate how many points are inside each area and find
 * the one with the smallest number of points.
 *
 * This function will return the index of the area array specified.
 *
 * @param {array} areas - The array of the area boundaries to check (format: [x,y,w,h])
 */
LiveQ.PlotWindow.prototype.getLeastUsedArea = function(areas) {

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
				y = this.yScale(histo.values[i][0]);

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
 * Update the histogram elements
 */
LiveQ.PlotWindow.prototype.updateLegend = function() {
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
		placeAt = this.getLeastUsedArea([
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
		.text(function(d,i) { return d.title });
	record.selectAll("path")
		.attr("fill", function(d,i) { return d.color });

	// Delete
	record.exit()
		.remove();


}

/**
 * Update the histogram elements
 */
LiveQ.PlotWindow.prototype.update = function() {

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
		};


	// Line path templates
	var self = this;
	var pathLine = d3.svg.line()
		//.interpolate("basis")
		.x(function(d,i) { return self.xScale(d[3]); })
		.y(function(d,i) { return self.yScale(d[0]); });
	var pathArea = d3.svg.area()
		.x(function(d)   { return self.xScale(d[3]); })
		.y0(function(d)  { return self.yScale(d[0]-d[2]); })
		.y1(function(d)  { return self.yScale(d[0]+d[1]); });

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
				.attr("fill", shadeColor(plot.color, 60));

		// Update
		record
			.attr("d", pathArea)
			.attr("visibility", this.style.features.errorBand ? "visible" : "hidden");

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
				.attr("stroke", plot.color);

		// Update
		record.attr("d", pathLine);

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
				.attr("stroke", plot.color);

		// Update
		record
			.attr("transform", function(d,i){
				return "translate(" + self.xScale(d[3]) + "," + self.yScale(d[0]) + ")"
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
				var e_up = self.yScale(d[0]) - self.yScale(d[0]+d[1]),
					e_dn = self.yScale(d[0]-d[2]) - self.yScale(d[0]);

				// Draw upper error bar
				var D_YEUP = "M"+(-bs)+","+(-e_up)+"L"+bs+","+(-e_up)+"Z" +
							 "M0,"+(-e_up)+"L0,"+(-bs)+"Z";
				var D_YEDN = "M"+(-bs)+","+e_dn+"L"+bs+","+e_dn+"Z" +
							 "M0,"+e_dn+"L0,"+bs+"Z";

				return  (self.style.features.errorBarsY ? (D_YEUP+D_YEDN) : "") // Switchable Y error bars
						+ D_RECT;

			})

		// Delete
		record.exit()
			.remove();

	}

	// -----------------------------
	// Process axes
	// -----------------------------

	this.xAxisGraphic.call(this.xAxis);
	this.yAxisGraphic.call(this.yAxis);

}

/**
 * Rescale axes in order to fit the histogram
 */
LiveQ.PlotWindow.prototype.rescaleAxes = function() {

	// Reset histograms
	var hBounds,
		xMin=null, yMin=null,
		xMax=null, yMax=null,
		margin = this.style.plotMargin;

	// Run over histograms and calculate bounds
	for (var i=0; i<this.plots.length; i++) {
		hBounds = this.plots[i].getBounds();
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

	// Update scale domains
	this.xScale
		.range([0, this.width-margin.left-margin.right])
		.domain([xMin, xMax]);
	this.yScale
		.range([this.height-margin.top-margin.bottom, 0])
		.domain([yMin, yMax]);

}