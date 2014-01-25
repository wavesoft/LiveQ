
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
 * Calculate the Chi-squared between the current histogram and the specified
 *
 * @param {LiveQ.HistogramData} histogram - The histogram to compare to
 * @returns {array} A HistogramData instance
 */
LiveQ.HistogramData.prototype.chi2ToReference = function( refHisto, uncertainty ) {

	// Ensure equal bins
	if (refHisto.bins != this.bins) 
		return null;

	// Prepare chi2 per bin and average
	var perBin = [];

	// Put default value to uncertainty
	if (!uncertainty) uncertainty=0.05;

	// Handle bins
	for (var i=0; i<this.bins; i++) {

		// Require same bins filled. If data is filled and MC is not filled,
		// we do not know what the chi2 of that bin is. Return error.
		// (b.isEmpty() && !r.isEmpty()) return -1;
		if ((this.values[i][0] == 0) && (refHisto.values[i][0] == 0)) {
			perBin.push(0);
			return null;
		}

		// Skip empty bins (if data is empty but theory is filled, it's ok. We
		// are allowed to plot theory outside where there is data, we just 
		// cannot calculate a chi2 there).
		if ((this.values[i][0] == 0) || (refHisto.values[i][0] == 0)) {
			perBin.push(0);
			continue;
		}

		//
		// compute one element of test statistics:
		//                     (Theory - Data)^2
		// X = --------------------------------------------------------
		//      Sigma_data^2 + Sigma_theory^2 + (uncertainty*Theory)^2
		//
		var theory = this.values[i][0],
			data = refHisto.values[i][0],
			sTheory, sData;

		if (theory > data) {
			sTheory = this.values[i][2]   // yErrMinus
			sData = refHisto.values[i][1] // yErrPlus
		} else {
			sTheory = this.values[i][1]   // yErrMinus
			sData = refHisto.values[i][2] // yErrPlus
		}

		// Calculate nomin & denom 
		var nomin = (theory-data)*(theory-data),
			denom = sData*sData + sTheory*sTheory + (uncertainty*theory)*(uncertainty*theory);

		// Ensure we don't divide by 0
		if (denom == 0) {
			perBin.push(0);
			continue;
		}

		// Calculate bin Chi2
		var X = nomin/denom;
		perBin.push(X);

	}

	// Calculate averages
	return perBin;

}