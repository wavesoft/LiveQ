
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
		xMinValues=[], xMaxValues=[],
		yMinValues=[], yMaxValues=[];

	// If the histogram is empty, return no bounds
	if (this.histo.empty)
		return null;

	// Run over bins and calculate bounds (including error bars)
	for (var i=0; i<this.histo.bins; i++) {

		// Calculate the min/max for Y
		vMax = this.histo.values[i][0] + this.histo.values[i][1];
		vMin = this.histo.values[i][0] - this.histo.values[i][2];
		xMaxValues.push(vMax);
		xMinValues.push(vMin);

		// Calculate the min/max for X
		vMax = this.histo.values[i][3] + this.histo.values[i][4];
		vMin = this.histo.values[i][3] - this.histo.values[i][5];
		yMaxValues.push(vMax);
		yMinValues.push(vMin);

	}

	// Sort Min/Max values
	xMaxValues.sort().reverse(); xMinValues.sort();
	yMaxValues.sort().reverse(); yMinValues.sort();

	// Add an extra padding on yMin/yMax xMin/xMax
	xMin = xMinValues[0] - (xMinValues[1] - xMinValues[0]);
	xMax = xMaxValues[0] + (xMaxValues[0] - xMaxValues[1]);
	yMin = yMinValues[0] - (yMinValues[1] - yMinValues[0]);
	yMax = yMaxValues[0] + (yMaxValues[0] - yMaxValues[1]);

	// If we are protecting logarithmic scale, do not allow to reach 0
	if ((logProtect == true) || (logProtect == undefined))
		if (yMin<=0) yMin=0.000001;

	// Return bounds
	return [ xMin, xMax, yMin, yMax ];

}
