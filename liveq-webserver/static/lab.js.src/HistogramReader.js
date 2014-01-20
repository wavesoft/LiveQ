
/**
 * Initialize the histogram reader class.
 *
 * The histogram reader is initialized by passing the first frame received by the WebSocket
 * to it. The frame contains configuration information required for properly visualizing the
 * histograms in the page.
 *
 * Such information are:
 * 
 *  * Names of all the histogrms in the lab
 *  * Values of the reference data for each histogram
 *  * The bitmap contents of the LaTeX-rendered labels
 *
 * @class
 * @param {LiveQ.BufferReader} configReader - The configuration frame reader, received upon initialization of the websocket connection.
 */
LiveQ.HistogramReader = function( configReader ) {

	/**
	 * This object contains the mapping between the histogram name
	 * and it's {@link LiveQ.ReferenceData} class.
	 * @member {Object}
	 */
	this.reference = { };

	// Read the configuration header data
	var numHistos = configReader.getUint16(),
		reserved = configReader.getUint16();

	// Read histograms
	for (var i=0; i<numHistos; i++) {
		// Fetch histo
		var histo = LiveQ.ReferenceData.fromReader( configReader );
		// Store to reference
		this.reference[histo.id] = histo;
	}

}

/**
 * Handle incoming data frame
 *
 * This function handles the incoming data frame and fires the
 * appropriate callback functions in order to visualize the 
 * data arrived.
 * 
 * @param {LiveQ.BufferReader} reader - The incoming data frame reader from the WebSocket.
 */
LiveQ.HistogramReader.prototype.handleFrame = function( reader ) {

}
