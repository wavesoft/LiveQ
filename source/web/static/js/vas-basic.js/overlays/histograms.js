define(

	// Dependencies

	["jquery", "core/registry","core/base/component", "core/db", "liveq/Calculate" ], 

	/**
	 * This is the default component for displaying flash overlay messages
	 *
 	 * @exports vas-basic/overlay/flash
	 */
	function(config, R, Component, DB, Calculate) {

		/**
		 * The default tunable body class
		 */
		var OverlayHistograms = function(hostDOM) {

			// Initialize widget
			Component.call(this, hostDOM);
			hostDOM.addClass("histograms-overlay");

			// Prepare categories
			this.elmCategories = [
				$('<div class="group group-attention"></div>').appendTo(hostDOM).append( $('<h1><span class="glyphicon glyphicon-warning-sign"></span> Bad Matches</h1><p class="subtitle">Histograms that have bad match (error bigger than 3 sigma).</p>') ),
				$('<div class="group group-warn"></div>').appendTo(hostDOM).append( $('<h1><span class="glyphicon glyphicon-exclamation-sign"></span> Fair Matches</h1><p class="subtitle">Histograms that are fairly good, but still have some minor issues to fix  (error bigger than 3 sigma).</p>') ),
				$('<div class="group group-good"></div>').appendTo(hostDOM).append( $('<h1><span class="glyphicon glyphicon-ok"></span> Good Matches</h1><p class="subtitle">Histograms that are successfuly tuned to the best possible case.</p>') )
			];

			// Prepare the category contents
			this.elmCategoryHistograms = [];
			for (var i=0; i<this.elmCategories.length; i++) {
				this.elmCategoryHistograms.push( $('<div class="histograms"></div>').appendTo(this.elmCategories[i]) );
			}

			// Array of histogram objects
			this.histograms = [];

		};

		// Subclass from ObservableWidget
		OverlayHistograms.prototype = Object.create( Component.prototype );

		/**
		 * Reposition flashDOM on resize
		 */
		OverlayHistograms.prototype.onHistogramsDefined = function( histograms ) {
			var histoGroups = [[], [], []];

			// Scan histograms and sort them into groups
			for (var i=0; i<histograms.length; i++) {
				var chi2fit = Calculate.chi2WithError( histograms[i].data, histograms[i].ref.data );
				if (chi2fit[0] < 4) { // 1 sigma
					histoGroups[2].push( histograms[i] );
				} else if (chi2fit[0] < 9) { // 2 sigma
					histoGroups[1].push( histograms[i] );
				} else { // 3 sigma or more
					histoGroups[0].push( histograms[i] );
				}
			}

			// Create the visual components
			this.histograms = [];
			for (var i=0; i<histoGroups.length; i++) {
				var histos = histoGroups[i],
					targetDOM = this.elmCategoryHistograms[i].empty();

				// Create, initialize and place on DOM
				this.elmCategories[i].hide();
				for (var j=0; j<histos.length; j++) {

					// Create histogram data visualization
					var domHisto = $('<div class="histogram"></div>').appendTo(targetDOM),
						domDetails = $('<div class="details"></div>').appendTo(domHisto),
						chi2fit = Calculate.chi2WithError( histos[j].data, histos[j].ref.data ),
						hist = R.instanceComponent("dataviz.histogram_full", domHisto);

					// Store on histograms
					hist.onUpdate( histos[j] );
					this.histograms.push( hist );

					// Populate histogram details
					var obsDetails = DB.cache['observables'][histos[j].id];
					if (obsDetails) {
						$('<div class="description"><h2>' + obsDetails['info']['name'] + '</h2><p>' + (obsDetails['info']['desc'] || "(Missing description)") + '</p></div>')
							.appendTo(domDetails);
					} else {
						$('<div class="description"><h2>' + histos[j].id + '</h2><p>(Missing details)</p></div>')
							.appendTo(domDetails);
					}

					// Check on which scale is the fit
					var status_msg, status_cls;
					if (chi2fit[0] < 1) { // 1 sigma
						status_msg = "Perfect Match";
						status_cls = "perfect";
					} else if (chi2fit[0] < 4) { // 2 sigma
						status_msg = "Good Match";
						status_cls = "good";
					} else if (chi2fit[0] < 9) { // 3 sigma
						status_msg = "Fair Match";
						status_cls = "average";
					} else {
						status_msg = "Bad Match";						
						status_cls = "bad";
					}


					// Update fit score
					var score = $('<div class="fit-score ' + status_cls + '">')
						.append($('<div class="status">'+status_msg+'</div>'))
						.append($('<div class="detail"><div><strong>Events:</strong> ' + histos[j].data.nevts + '</div><div><strong>Error:</strong> ' + chi2fit[0].toFixed(2) + ' ± ' + chi2fit[1].toFixed(2) + '</div></div>'))
						.appendTo(domDetails);

					// Show category
					this.elmCategories[i].show();

				}
			}

		}


		/**
		 * Reposition flashDOM on resize
		 */
		OverlayHistograms.prototype.onWillShow = function( cb ) {

			// Resize histograms to update their UI
			for (var i=0; i<this.histograms.length; i++) {
				var com = this.histograms[i],
					w = com.hostDOM.width(),
					h = com.hostDOM.height();

				com.onResize(w,h);
				com.onWillShow(function() {
					com.onShown();
				});
			}

			// Fire shown
			cb();

		}

		// Store overlay component on registry
		R.registerComponent( 'overlay.histograms', OverlayHistograms, 1 );

	}

);