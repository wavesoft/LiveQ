
/**
 * A histogram object that can be placed 
 *
 * @class
 */
LiveQ.UI.PlotHistogram = function(parent, histo, color, title) {

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
LiveQ.UI.PlotHistogram.prototype.create = function( hostSVG, bounds ) {
	
}

/**
 * Create and return the SVG group with the given ID
 *
 * @param {d3.selection} hostSVG - The SVG container where we should create our element
 * @param {d3.selection} plotSVG - The SVG element created previously with the create() function
 * @param {Object} boudns - An object that contains the bound rectangle fields for the plot: x,y,width,height 
 * @returns {d3.selection} Removes the plotSVG element from the hostSVG container
 */
LiveQ.UI.PlotHistogram.prototype.remove = function( hostSVG, plotSVG, bounds ) {
	
}

/**
 * Update the metrics of the histogram
 */
LiveQ.UI.PlotHistogram.prototype.update = function( hostSVG, plotSVG, bounds ) {

}