
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
LiveQ.HistogramData = function( bins, id ) {

	/**
	 * The number of bins in the histogram.
	 * @member {int}
	 */
	this.bins = (bins == undefined) ? 0 : bins;

	/**
	 * The index name of the histogram.
	 * @member {string}
	 */
	this.id = id || "";

	/**
	 * The bin values of each histogram. Each bin is an Float64Array that contains
	 * the following values: [ y, yErrPlus, yErrMinus, x, xErrPlus, xErrMinus ]
	 * @member {Float64Array}
	 */
	this.values = [];

	/**
	 * The number of events in the histogram
	 * @member {int}
	 */
	this.nevts = 0;

	/**
	 * Array of the callback functions to be fired when the histogram data are updated
	 * @private
	 * @member {array}
	 */
	this._updateCallbacks = [ ];

	// If we have bins specified, generate an empty ArrayBuffer for the components.
	this.empty = true;
	if (this.bins > 0) {

		// Reset histogram values
		var ofs = 0;
		for (var i=0; i<this.bins; i++) {
			this.values.push([0,0,0,0,0,0]); 
			ofs += 48;
		}

	}

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

/**
 * Update histogram data from the specified input reader
 *
 * @param {LiveQ.BufferReader} reader - The input reader to read the histogram from
 * @param {bool} copy 				  - If spcified, the data will be copied to the local fields
 */
LiveQ.HistogramData.prototype.updateFromReader = function( reader, copy, useID ) {

	// Get copy value
	var cp = (copy == undefined) ? false : copy;

	// Skip ID scanning if it is provided
	var id = useID;
	if (id == undefined) {
		// ---------------
		// Get id (string)
		id = reader.getString();
		// ---------------
	}

	// ---------------
	// Get Histogram header (64 bit)
	var bins = reader.getUint32(),
		nevts = reader.getUint32();
	// ---------------

	// Store number of events
	this.nevts = nevts;

	// Check how we should apply the information so far
	if (cp) {
		if (id != this.id) {
			console.error("Mismatched histogram ID while copy-update of histogram ", this.id);
			return false;
		}
		if (bins != this.bins) {
			console.error("Mismatched bins while copy-update of histogram", this.id);
			return false;
		}
	} else {
		// Reset fields
		this.id = id;
		this.bins = bins;
	}

	// ---------------
	// Replace bin contents: [y, y+, y-, x, x+, x-]
	for (var i=0; i<this.bins; i++) {
		this.values[i] = reader.getFloat64Array(6);
	}
	// ---------------

	// We are not empty any more
	this.empty = false;

	// The histogram is updated, fire callbacks
	for (var i=0; i<this._updateCallbacks.length; i++) {
		this._updateCallbacks[i]( this );
	}

}

/**
 * Register a callback to be notified when the contents of the histogram are changed
 *
 * @param {function} cb - The callback function
 */
LiveQ.HistogramData.prototype.onUpdate = function( cb ) {
	this._updateCallbacks.push(cb);
}

/**
 * Unregister a callback, previously registered with onUpdate
 *
 * @param {function} cb - The callback function
 */
LiveQ.HistogramData.prototype.offUpdate = function( cb ) {
	var i = this._updateCallbacks.indexOf(cb);
	this._updateCallbacks.splice(i,1);
}

/**
 * Calculate and return the x and y bounds for this histogram
 *
 * @param {bool} logProtect - If set to true, the minimum y value will never be smaller than 0.000001
 */
LiveQ.HistogramData.prototype.getBounds = function( logProtect ) {
	// Reset bounds
	var vMin, vMax,
		xMin=null, yMin=null,
		xMax=null, yMax=null;

	// If the histogram is empty, return no bounds
	if (this.empty)
		return null;

	// Run over bins and calculate bounds (including error bars)
	for (var i=0; i<this.bins; i++) {

		// Calculate the min/max for Y
		vMax = this.values[i][0] + this.values[i][1];
		vMin = this.values[i][0] - this.values[i][2];
		if ((vMax>yMax) || (yMax==null)) yMax=vMax;
		if ((vMin<yMin) || (yMin==null)) yMin=vMin;

		// Calculate the min/max for X
		vMax = this.values[i][3] + this.values[i][4];
		vMin = this.values[i][3] - this.values[i][5];
		if ((vMax>xMax) || (xMax==null)) xMax=vMax;
		if ((vMin<xMin) || (xMin==null)) xMin=vMin;

	}

	// If we are protecting logarithmic scale, do not allow to reach 0
	if ((logProtect == true) || (logProtect == undefined))
		if (yMin<=0) yMin=0.000001;

	// Return bounds
	return [ xMin, xMax, yMin, yMax ];

}
