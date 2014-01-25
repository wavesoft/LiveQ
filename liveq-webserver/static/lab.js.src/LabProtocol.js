
/**
 * Initialize the lab protocol class.
 *
 * The lab protocol class must be initialized by calling the handleConfigFrame function,
 * passing the first frame received by the WebSocket to it. 
 *
 * The frame contains configuration information required for properly 
 * visualizing the histograms in the page.
 *
 * Such information are:
 * 
 *  * Names of all the histogrms in the lab
 *  * Values of the reference data for each histogram
 *  * The bitmap contents of the LaTeX-rendered labels
 *
 * @class
 */
LiveQ.LabProtocol = function( ) {

	/**
	 * This object contains the mapping between the histogram name
	 * and it's {@link LiveQ.ReferenceData} class.
	 * @member {Object}
	 */
	this.reference = { };

	/**
	 * This object contains the histogram data in a 
	 * {@link LiveQ.HistogramData} class.
	 * @member {LiveQ.HistogramData}
	 */
	this.data = { };

	/**
	 * Array of the callback functions to be fired when a histogram is updated
	 * @private
	 * @member {array}
	 */
	this._onHistogramUpdate = [];

	/**
	 * Array of the callback functions to be fired when a histogram is added
	 * @private
	 * @member {array}
	 */
	this._onHistogramAdded = [];

	/**
	 * Array of the callback functions to be fired when a histogram is removed
	 * @private
	 * @member {array}
	 */
	this._onHistogramRemoved = [];

	/**
	 * Array of the callback functions to be fired when the metadata for the simulation changes
	 * @private
	 * @member {array}
	 */
	this._onMetadataUpdated = [];

}

/**
 * Register a callback to be notified when a histogram is updated
 *
 * @param {function} cb - The callback function
 */
LiveQ.LabProtocol.prototype.onHistogramUpdate = function( cb ) {
	this._onHistogramUpdate.push(cb);
}

/**
 * Unregister a callback, previously registered with onUpdate
 *
 * @param {function} cb - The callback function
 */
LiveQ.LabProtocol.prototype.offHistogramUpdate = function( cb ) {
	var i = this._onHistogramUpdate.indexOf(cb);
	this._onHistogramUpdate.splice(i,1);
}

/**
 * Register a callback to be notified when a histogram is added
 *
 * @param {function} cb - The callback function
 */
LiveQ.LabProtocol.prototype.onHistogramAdded = function( cb ) {
	this._onHistogramAdded.push(cb);
}

/**
 * Unregister a callback, previously registered with onHistogramAdded
 *
 * @param {function} cb - The callback function
 */
LiveQ.LabProtocol.prototype.offHistogramAdded = function( cb ) {
	var i = this._onHistogramAdded.indexOf(cb);
	this._onHistogramAdded.splice(i,1);
}

/**
 * Register a callback to be notified when a histogram is removed
 *
 * @param {function} cb - The callback function
 */
LiveQ.LabProtocol.prototype.onHistogramRemoved = function( cb ) {
	this._onHistogramRemoved.push(cb);
}

/**
 * Unregister a callback, previously registered with onHistogramRemoved
 *
 * @param {function} cb - The callback function
 */
LiveQ.LabProtocol.prototype.offHistogramRemoved = function( cb ) {
	var i = this._onHistogramRemoved.indexOf(cb);
	this._onHistogramRemoved.splice(i,1);
}

/**
 * Register a callback to be notified when the metadata of the current simulation changes
 *
 * @param {function} cb - The callback function
 */
LiveQ.LabProtocol.prototype.onMetadataUpdated = function( cb ) {
	this._onMetadataUpdated.push(cb);
}

/**
 * Unregister a callback, previously registered with onMetadataUpdated
 *
 * @param {function} cb - The callback function
 */
LiveQ.LabProtocol.prototype.offMetadataUpdated = function( cb ) {
	var i = this._onMetadataUpdated.indexOf(cb);
	this._onMetadataUpdated.splice(i,1);
}
/**
 * Configure LabProtocol with the given configuration frame
 *
 * This function handles the incoming configuration frame and re-initializes
 * the reference and histogram data.
 * 
 * @param {LiveQ.BufferReader} reader - The incoming configuration frame reader from the WebSocket.
 */
LiveQ.LabProtocol.prototype.handleConfigFrame = function( configReader ) {

	// Fire histogram removal callbacks
	for(var histoID in this.data){

		// Get histogram
		var histo = this.data[histoID];

		// Fire removal callbacks
		if ((histo != undefined) && (typeof(histo) != 'function')) {
			for (var i=0; i<this._onHistogramRemoved.length; i++) {
				this._onHistogramRemoved[i]( this.data[histoID], this.reference[histoID] );
			}
		}

	}

	// Reset reference and data
	this.reference = { };
	this.data = { };

	// Read the configuration header data
	var protoVersion = configReader.getUint8();

	// Handle protocols according to versions
	if (protoVersion == 1) {

		var reserved0 = configReader.getUint8(),
			reserved1 = configReader.getUint16(),
			numHistos = configReader.getUint32();

		// Read histograms
		for (var j=0; j<numHistos; j++) {
			// Fetch histogram from buffer
			var histo = LiveQ.ReferenceData.fromReader( configReader );

			// Store to reference
			this.reference[histo.id] = histo;

			// Use reference information to create new histogram
			this.data[histo.id] = new LiveQ.HistogramData( histo.reference.bins, histo.id );

			// Fire histogram added callbacks
			for (var i=0; i<this._onHistogramAdded.length; i++) {
				this._onHistogramAdded[i]( this.data[histo.id], this.reference[histo.id] );
			}

		}

	} else {

		// Invalid protocol
		console.error("Unknown configuration frame protocol v", protoVersion);

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
LiveQ.LabProtocol.prototype.handleFrame = function( reader ) {

	// Read the frame header
	var protoVersion = reader.getUint8(),
		numEvents = 0;

	// Handle protocols according to versions
	if (protoVersion == 1) {

		var reserved0 = reader.getUint8(),
			reserved1 = reader.getUint16(),
			numHistos = reader.getUint32();

		// Read histograms
		for (var j=0; j<numHistos; j++) {

			// Get histogram name
			var histoID = reader.getString();

			// Try to find a histogram with this id
			if (this.data[histoID] != undefined) {

				// Fetch histogram
				var histo = this.data[histoID];

				// Update histogram bins from reader, skipping the
				// reading of histogram ID (it has already happened)
				histo.updateFromReader( reader, true, histoID );

				// Update number of events
				if (histo.nevts > 0)
					numEvents = histo.nevts;

				// Fire histogram update callbacks
				for (var i=0; i<this._onHistogramUpdate.length; i++) {
					this._onHistogramUpdate[i]( histo, this.reference[histoID] );
				}

			} else {
				console.error("Histogram ", histoID, " was not defined in configuration!");
			}

		}

		// Fire metadata update histogram
		for (var i=0; i<this._onMetadataUpdated.length; i++) {
			this._onMetadataUpdated[i]({
				'nevts': numEvents
			});
		}


	} else {

		// Invalid protocol
		console.error("Unknown configuration frame protocol v", protoVersion);

	}

}
