
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
LiveQ.PlotHistogram.prototype.getBounds = function( logProtect ) {
	// Reset bounds
	var vMin, vMax,
		xMin=null, yMin=null,
		xMax=null, yMax=null,
		xStepMin=null, xStepMax=null, // "step" is the second value before the corresponding min/max,
		yStepMin=null, yStepMax=null; //  that will be used to calculate the extra padding.

	// If the histogram is empty, return no bounds
	if (this.histo.empty)
		return null;

	// Run over bins and calculate bounds (including error bars)
	for (var i=0; i<this.histo.bins; i++) {

		// Calculate the min/max for Y
		vMax = this.histo.values[i][0] + this.histo.values[i][1];
		vMin = this.histo.values[i][0] - this.histo.values[i][2];
		if ((vMax>yMax) || (yMax==null)) {
			yStepMax=yMax;
			yMax=vMax;
		}
		if ((vMin<yMin) || (yMin==null)) {
			yStepMin=yMin;
			yMin=vMin;
		}

		// Calculate the min/max for X
		vMax = this.histo.values[i][3] + this.histo.values[i][4];
		vMin = this.histo.values[i][3] - this.histo.values[i][5];
		if ((vMax>xMax) || (xMax==null)) {
			xStepMax=xMax;
			xMax=vMax;
		}
		if ((vMin<xMin) || (xMin==null)) {
			xStepMin=xMin;
			xMin=vMin;
		}

	}

	// Add an extra padding on yMin/yMax xMin/xMax
	xMin -= xStepMin - xMin;
	xMax += xMax - xStepMax;
	yMin -= yStepMin - yMin;
	yMax += yMax - yStepMax;

	// If we are protecting logarithmic scale, do not allow to reach 0
	if ((logProtect == true) || (logProtect == undefined))
		if (yMin<=0) yMin=0.000001;

	// Return bounds
	return [ xMin, xMax, yMin, yMax ];

}
