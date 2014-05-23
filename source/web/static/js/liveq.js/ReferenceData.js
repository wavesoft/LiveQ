
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
	 * The title of the histogram.
	 * @member {string}
	 */
	this.title = "";

	/**
	 * Short description of the histogram.
	 * @member {string}
	 */
	this.shortdesc = "";

	/**
	 * Short description for the left-side of the histogram.
	 * @member {string}
	 */
	this.leftdesc = "";

	/**
	 * Short description for the right-side of the histogram.
	 * @member {string}
	 */
	this.rightdesc = "";

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
	 * The URL where more information can be found.
	 * @member {string}
	 */
	this.url = "";

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

	// Get configuration
	var config = reader.getJSON();

	// Store local references
	hc.id = config['id'];
	hc.title = config['title'];
	hc.short = config['short'];
	hc.observable = config['observable'];
	hc.group = config['group'];
	hc.beam = config['beam'];
	hc.energy = config['energy'];
	hc.process = config['process'];
	hc.params = config['params'];
	hc.shortdesc = config['shortdesc'];
	hc.leftdesc = config['leftdesc'];
	hc.rightdesc = config['rightdesc'];
	hc.url = config['urldesc'];

	// Get PNG for title
	hc.imgTitle = reader.getData('image/png');
	hc.imgXLabel = reader.getData('image/png');
	hc.imgYLabel = reader.getData('image/png');

	// Get reference histogram
	hc.reference = LiveQ.HistogramData.fromReader( reader );

	return hc;
}