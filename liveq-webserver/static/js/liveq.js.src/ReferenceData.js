
/**
 * Histogram Reference
 *
 * This class contains information used for rendering a particular histogram.
 * It contains the following information:
 *
 *  * The HTML Representation of it's Name
 *  * The PNG data for it's title (LaTeX-Rendered PNG)
 *  * The PNG data for it's X and Y axis (LaTeX-Rendered PNG)
 *  * The reference histogram data
 *
 * @class
 */
LiveQ.ReferenceData = function( ) {

	/**
	 * The index name of the histogram.
	 * @member {string}
	 */
	this.id = "";

	/**
	 * The name of the histogram.
	 * @member {string}
	 */
	this.name = "";

	/**
	 * The name of the observable of the histogram.
	 * @member {string}
	 */
	this.observable = "";

	/**
	 * The name of the group this histogram belongs to.
	 * @member {string}
	 */
	this.group = "";

	/**
	 * The data: url that contains the image of the title (with the rendered LaTeX).
	 * @member {string}
	 */
	this.imgTitle = "";

	/**
	 * The data: url that contains the x-label image (with the rendered LaTeX).
	 * @member {string}
	 */
	this.imgXLabel = "";

	/**
	 * The data: url that contains the y-label image (with the rendered LaTeX).
	 * @member {string}
	 */
	this.imgYLabel = "";

	/**
	 * The reference histogram for the data set.
	 * @member {LiveQ.HistogramData}
	 */
	this.reference = null;

}

/**
 * Construct a histogram reference from the specified input reader.
 *
 * @param {LiveQ.BufferReader} reader - The input reader to read the histogram reference from
 * @returns {LiveQ.ReferenceData} A ReferenceData instance
 */
LiveQ.ReferenceData.fromReader = function( reader ) {
	var hc = new LiveQ.ReferenceData();

	// Read histogram id
	hc.id = reader.getString();
	// Read histogram name
	hc.name = reader.getString();
	// Read histogram observable
	hc.observable = reader.getString();
	// Read histogram group
	hc.group = reader.getString();
	// Read beam
	hc.beam = reader.getString();
	// Read energy
	hc.energy = reader.getString();
	// Read process
	hc.process = reader.getString();
	// Read params
	hc.params = reader.getString();

	// Get PNG for title
	hc.imgTitle = reader.getData('image/png');
	hc.imgXLabel = reader.getData('image/png');
	hc.imgYLabel = reader.getData('image/png');

	// Get reference histogram
	hc.reference = LiveQ.HistogramData.fromReader( reader );

	return hc;
}