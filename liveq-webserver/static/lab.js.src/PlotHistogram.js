
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
	this.title = title || histo.id;

	// Calculate the ID from the histogram
	this.id = histo.id.substr(1).replace(/[\/_]/g,"-");

}

/**
 * Calculate and return the x and y bounds for this histogram
 *
 * @param {bool} logProtect - If set to true, the minimum y value will never be smaller than 0.000001
 */
LiveQ.PlotHistogram.prototype.getBounds = function( logProtect ) {
	// Reset bounds
	var vMin, vMax,
		xMin=null, yMin=null,
		xMax=null, yMax=null;

	// If the histogram is empty, return no bounds
	if (this.histo.empty)
		return null;

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

	// If we are protecting logarithmic scale, do not allow to reach 0
	if ((logProtect == true) || (logProtect == undefined))
		if (yMin<=0) yMin=0.000001;

	// Return bounds
	return [ xMin, xMax, yMin, yMax ];

}
