
/**
 * HistogramData Class
 *
 * This class contains the data values of a histogram plus it's name.
 *
 * The name can be used as an index to lookup it's {@link ReferenceData}
 * class in order to receive additional information.
 *
 * @class
 */
LiveQ.HistogramData = function( bins ) {

	/**
	 * The number of bins in the histogram.
	 * @member {int}
	 */
	this.bins = (bins == undefined) ? 0 : bins;

	/**
	 * The index name of the histogram.
	 * @member {string}
	 */
	this.id = "";

	/**
	 * The X-Values of every bin in the histogram.
	 * @member {Float64Array}
	 */
	this.x = [];

	/**
	 * The positive X-Error of every bin in the histogram.
	 * @member {Float64Array}
	 */
	this.xErrPlus = [];

	/**
	 * The ngative X-Error of every bin in the histogram.
	 * @member {Float64Array}
	 */
	this.xErrMinus = [];

	/**
	 * The Y-Values of every bin in the histogram.
	 * @member {Float64Array}
	 */
	this.y = [];

	/**
	 * The positive Y-Error of every bin in the histogram.
	 * @member {Float64Array}
	 */
	this.yErrPlus = [];

	/**
	 * The negative Y-Error of every bin in the histogram.
	 * @member {Float64Array}
	 */
	this.yErrMinus = [];

}

/**
 * Update histogram data from the specified input reader
 *
 * @param {LiveQ.BufferReader} reader - The input reader to read the histogram from
 */
LiveQ.HistogramData.prototype.updateFromReader = function( reader ) {

	// ---------------
	//  Hedaer
	// ---------------

	// Get the number of bins
	this.bins = reader.getUint32();
	// Extra void to reach 64 bits
	reader.getUint32();

	// ---------------
	//  String name
	// ---------------

	// Get id
	this.id = reader.getString();

	// ---------------
	//  Histogram bins
	// ---------------

	// Get Y values
	this.y = reader.getFloat64Array( this.bins );
	this.yErrPlus = reader.getFloat64Array( this.bins );
	this.yErrMinus = reader.getFloat64Array( this.bins );

	// Get Y values
	this.x = reader.getFloat64Array( this.bins );
	this.xErrPlus = reader.getFloat64Array( this.bins );
	this.xErrMinus = reader.getFloat64Array( this.bins );

}

/**
 * Construct a histogram from the specified input reader
 *
 * @param {LiveQ.BufferReader} reader - The input reader to read the histogram from
 * @returns {LiveQ.HistogramData} A HistogramData instance
 */
LiveQ.HistogramData.fromReader = function( reader ) {

	// Create new Histogram
	var histo = new LiveQ.HistogramData();

	// Update it's values
	histo.updateFromReader(reader);

	// Return instance
	return histo;

}

