define(

	// Dependencies
	[ 'core/util/event_base', 'liveq/ReferenceData', 'liveq/HistogramData' ], 

	/**
	 * This is the default data widget for visualizing a historgram
	 *
 	 * @exports liveq/LabProtocol
	 */
	function( EventBase, ReferenceData, HistogramData ) {


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
		var LabProtocol = function( ) {

			// Initialize subclass
			EventBase.call(this);

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
			 * Check if we ware initialized
			 @ member {boolean}
			 */
			this.initialized = false;

		}

		// Subclass from LabProtocol
		LabProtocol.prototype = Object.create( EventBase.prototype );

		/**
		 * Configure LabProtocol with the given configuration frame
		 *
		 * This function handles the incoming configuration frame and re-initializes
		 * the reference and histogram data.
		 * 
		 * @param {module:liveq/BufferReader~BufferReader} reader - The incoming configuration frame reader from the WebSocket.
		 */
		LabProtocol.prototype.handleConfigFrame = function( configReader ) {

			// Fire histogram removal callbacks
			for(var histoID in this.data){

				// Get histogram
				var histo = this.data[histoID];

				// Fire removal callbacks
				if ((histo != undefined) && (typeof(histo) != 'function')) {
					this.trigger('histogramRemoved', this.data[histoID], this.reference[histoID]);
				}

			}

			// Reset reference and data
			this.reference = { };
			this.data = { };

			// Read the configuration header data
			var protoVersion = configReader.getUint8();

			// Handle protocols according to versions
			if (protoVersion == 1) {

				var flags = configReader.getUint8(),
					numEvents = configReader.getUint16(),
					numHistos = configReader.getUint32();

				// Fetch configuration and links data
				var tunablesJSON = configReader.getJSON(),
					linksJSON = configReader.getJSON();
				if (tunablesJSON) {
					this.trigger('tunablesUpdated', tunablesJSON, linksJSON);
				}

				// Read histograms
				for (var j=0; j<numHistos; j++) {
					// Fetch histogram from buffer
					var histo = ReferenceData.fromReader( configReader );

					// Store to reference
					this.reference[histo.id] = histo;

					// Use reference information to create new histogram
					this.data[histo.id] = new HistogramData( histo.data.bins, histo.id );

					// Fire histogram added callbacks
					this.trigger('histogramAdded', this.data[histo.id], this.reference[histo.id]);

				}

				// If we were not initialized, fire onReady
				if (!this.initialized) {
					this.initialized = true;
					this.trigger('ready', {
						'protocol': 1,
						'flags': flags,
						'targetEvents': numEvents * 1000
					});
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
		 * @param {module:liveq/BufferReader~BufferReader} reader - The incoming data frame reader from the WebSocket.
		 */
		LabProtocol.prototype.handleFrame = function( reader ) {

			// Read the frame header
			var protoVersion = reader.getUint8(),
				numEvents = 0;

			// Handle protocols according to versions
			if (protoVersion == 1) {

				var flags = reader.getUint8(),
					reserved0 = reader.getUint16(),
					numHistos = reader.getUint32();

				// Check if the data are from interpolation
				var fromInterpolation = ((flags & 0x01) != 0);

				// Read histograms
				var allHistos = [];
				for (var j=0; j<numHistos; j++) {

					// Get histogram name
					var histoID = reader.getString();

					// Try to find a histogram with this id
					if (this.data[histoID] != undefined) {

						// Fetch histogram
						var histo = this.data[histoID];

						// Update histogram bins from reader, skipping the
						// reading of histogram ID (it has already happened)
						histo.updateFromReader( reader, true, histoID, fromInterpolation );

						// Update number of events
						if (histo.nevts > 0)
							numEvents = histo.nevts;

						// Fire histogram update callbacks
						this.trigger( 'histogramUpdated', histo, this.reference[histoID] );

						// Keep the histogram data for the 'histogramsUpdated' event
						allHistos.push({
							'id': histoID,
							'data': histo,
							'ref': this.reference[histoID]
						});

					} else {
						console.error("Histogram ", histoID, " was not defined in configuration!");
					}

				}

				// Fire metadata update histogram
				this.trigger( 'metadataUpdated', {
					'nevts': numEvents,
					'interpolation': fromInterpolation
				});

				// Let everybody know that data arrived
				this.trigger( 'dataArrived', fromInterpolation );

				// Fire an update callback regarding all histograms
				this.trigger( 'histogramsUpdated', allHistos, fromInterpolation );


			} else {

				// Invalid protocol
				console.error("Unknown configuration frame protocol v", protoVersion);

			}

		}

		/**
		 * This event is fired when a histogram is added.
		 *
		 * @param {module:liveq/HistogramData~HistogramData} histogram - The histogram data
		 * @param {module:liveq/ReferenceData~ReferenceData} reference - The reference data
		 * @event module:liveq/LabProtocol~LabProtocol#histogramAdded		
		 */

		/**
		 * This event is fired when a histogram data are updated.
		 *
		 * @param {module:liveq/HistogramData~HistogramData} histogram - The histogram data
		 * @param {module:liveq/ReferenceData~ReferenceData} reference - The reference data
		 * @event module:liveq/LabProtocol~LabProtocol#histogramUpdated
		 */

		/**
		 * This event is fired when a histogram data are updated.
		 *
		 * @param {array} histograms - All the histograms as an object {id: .. , data: .. , ref: .. } format.
		 * @event module:liveq/LabProtocol~LabProtocol#histogramsUpdated
		 */

		/**
		 * This event is fired when a histogram is removed.
		 *
		 * @param {module:liveq/HistogramData~HistogramData} histogram - The histogram data
		 * @param {module:liveq/ReferenceData~ReferenceData} reference - The reference data
		 * @event module:liveq/LabProtocol~LabProtocol#histogramRemoved		
		 */

		/**
		 * This event is fired when the tunables table has arrived.
		 *
		 * @param {object} tunables - Tunables dictionary
		 * @param {object} correlation - Correlation information
		 * @event module:liveq/LabProtocol~LabProtocol#tunablesUpdated		
		 */

		/**
		 * This event is fired when the lab socket is initialized and the negotiation
		 * phase has been completed.
		 *
		 * @param {object} state - State dictionary
		 * @event module:liveq/LabProtocol~LabProtocol#ready		
		 */

		/**
		 * This event is fired when the metadata regarding the current run has
		 * updated.
		 *
		 * @param {object} meta - Metadata dictionary
		 * @event module:liveq/LabProtocol~LabProtocol#metadataUpdated		
		 */

		/**
		 * This event is fired when there are incoming data.
		 *
		 * @event module:liveq/LabProtocol~LabProtocol#dataArrived		
		 */

		// Return LabProtocol
		return LabProtocol;

	}

);