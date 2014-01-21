
/**
 * A histogram object that can be placed 
 *
 * @class
 */
LiveQ.PlotHistogram = function(parent, histo, color, title) {

	// Keep references
	this.parent = parent;
	this.histo = histo;

	// Setup information
	this.color = color || "red";
	this.title = histo.id || "Histogram";

	// Calculate the ID from the histogram
	this.id = histo.id.substr(1).replace(/[\/_]/g,"-");

}

/**
 * Calculate and return the x and y bounds for this histogram
 */
LiveQ.PlotHistogram.prototype.getBounds = function() {
	// Reset bounds
	var vMin, vMax,
		xMin=null, yMin=null,
		xMax=null, yMax=null;

	// Run over bins and calculate bounds (including error bars)
	for (var i=0; i<this.histo.bins; i++) {

		// Calculate the min/max for Y
		vMax = this.histo.values[i][0] + this.histo.values[i][1];
		vMin = this.histo.values[i][0] - this.histo.values[i][2];
		if ((vMax>yMax) || (yMax==null)) yMax=vMax;
		if ((vMin<yMin) || (yMin==null)) yMin=vMin;

		// Calculate the min/max for X
		vMax = this.histo.values[i][3] + this.histo.values[i][4];
		vMin = this.histo.values[i][3] - this.histo.values[i][5];
		if ((vMax>xMax) || (xMax==null)) xMax=vMax;
		if ((vMin<xMin) || (xMin==null)) xMin=vMin;

	}

	// Return bounds
	return [ xMin, xMax, yMin, yMax ];

}
