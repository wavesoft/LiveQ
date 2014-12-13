

define(

	// Requirements
	["jquery", "core/registry", "core/base/components", "core/db", "core/ui", "liveq/Calculate", "core/apisocket" ],

	/**
	 * Basic version of the introduction to tutorial screen
	 *
	 * @exports basic/components/explain_screen
	 */
	function($, R, C, DB, UI, Calculate, APISocket) {
		
		/**
		 * Helper function to format thousands
		 */
		function numberWithCommas(x) {
		    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		}

		/**
		 * Helper class for managing multiple histograms
		 */
		var HistogramsGroup = function( hostDOM, eventsLabel, progressBar, progressLabel, chi2Label ) {
			this.hostDOM = hostDOM;
			this.eventsLabel = eventsLabel;
			this.progressBar = progressBar;
			this.progressLabel = progressLabel;
			this.chi2Label = chi2Label;

			this.width = 0;
			this.height = 0;
			this.rows = 0;
			this.cols = 0;
			this.maxEvents = 800000;

			// Flags
			this.flagErrorBars = false;
			this.flagErrorColors = false;

			// Histogram resizing information
			this.histograms = [];

			// Callback to be fired when we reached 100%
			this.onMaxedOut = function() { };

			// Hide error bars
			this.showErrorBars(false);
			this.showErrorColors(false);
			this.vibrationWidth = 0;

		}

		/**
		 * Resize histograms
		 */
		HistogramsGroup.prototype.resizeHistograms = function() {
			var pad = 20, x=0, y=0,
				elmW = (this.width - 2 * this.cols * pad) / this.cols,
				elmH = (this.height - 2 * this.rows * pad) / this.rows;

			for (var i=0; i<this.histograms.length; i++) {
				var h = this.histograms[i],
					pX = pad * (x+1) + elmW * x,
					pY = pad * (y+1) + elmH * y;

				// Reposition element
				h.dom.css({
					'left': pX,
					'top': pY,
					'width': elmW,
					'height': elmH
				});

				// Resize object
				h.inst.onResize( elmW, elmH );

				// Forward
				if (++x >= this.cols) {
					x=0; y++;
				}
			}
		}


		/**
		 * Show/hide error bars
		 */
		HistogramsGroup.prototype.addHistogram = function( histoData, histoRef ) {

			// Store histogram
			var domHisto = $('<div></div>').appendTo(this.hostDOM),
				hist = R.instanceComponent("dataviz.histogram_full", domHisto);

			// Store on histograms
			hist.onUpdate({ 'data': histoData, 'ref': histoRef })
			this.histograms.push({ 'inst': hist, 'dom': domHisto, 'data': histoData, 'ref': histoRef });

			// Realign histograms
			var len = this.histograms.length;
			this.cols = parseInt(Math.ceil(Math.sqrt(len))),
			this.rows = parseInt(Math.ceil(len / this.cols));

			// Resize histograms
			this.resizeHistograms();
			this.applyFlags();

		}

		/**
		 * Show/hide error bars
		 */
		HistogramsGroup.prototype.clearHistograms = function() {
			this.hostDOM.empty();
			this.histograms = [];
		}

		/**
		 * Apply flags to the histograms
		 */
		HistogramsGroup.prototype.applyFlags = function() {
			for (var i=0; i<this.histograms.length; i++) {
				var h = this.histograms[i];
				h.inst.onMetaUpdate({
					'errorBars': this.flagErrorBars,
					'errorColors': this.flagErrorColors
				});
			}			
		}

		/**
		 * Show/hide error bars
		 */
		HistogramsGroup.prototype.showErrorBars = function( visible ) {
			this.flagErrorBars = visible;
			this.applyFlags();
		}

		/**
		 * Show/hide error bars
		 */
		HistogramsGroup.prototype.showErrorColors = function( visible ) {
			this.flagErrorColors = visible;
			this.applyFlags();
		}

		/**
		 * Update all histograms
		 */
		HistogramsGroup.prototype.updateHistograms = function( allHistograms ) {
			for (var i=0; i<allHistograms.length; i++) {
				var h = this.histograms[i];
				h.inst.onMetaUpdate(allHistograms[i]);
				h.data = allHistograms[i].data;
				h.ref = allHistograms[i].ref;
			}
		}

		/**
		 * Handle metadata update
		 */
		HistogramsGroup.prototype.handleMedatada = function( metadata ) {
			var progress = metadata['nevts'] / this.maxEvents;
			this.eventsLabel.text(numberWithCommas( metadata['nevts'] ));

			// Calculate machine load by the progress
			var load = progress / 2 + 0.5;

			// Update vibration width
			if (load > 0.8) {
				this.vibrationWidth = 20 * ((load - 0.8) / 0.2);
			} else {
				this.vibrationWidth = 0;
			}

			// Update progress
			load += 0.005 - Math.random() * 0.01;
			var percent = load * 100;
			this.progressBar.css({
				'width': percent + '%'
			});
			this.progressLabel.html("Machine Load: <strong>" + Math.round(percent).toFixed(0) + "%</strong>");

		}

		/**
		 * Handle metadata update
		 */
		HistogramsGroup.prototype.handleCompleted = function() {
			// We have maxed out!
			if (this.onMaxedOut) this.onMaxedOut();
		}

		/**
		 * Resize histograms on demand
		 */
		HistogramsGroup.prototype.resize = function(w,h) {
			this.width = w;
			this.height = h;
			this.resizeHistograms();
		}

		/**
		 * Re-roll, by creating a new sample set
		 */
		HistogramsGroup.prototype.initialize = function(config) {

			// Reset previous
			this.clearHistograms();

			// Open new training socket
			this.api = APISocket.openLabtrain(
				config.sequence || "good", 
				config.observables || [ 
					"/ALEPH_2004_S5765862/d54-x01-y01"
				]);

			// Handle API actions
			this.api.on('histogramAdded', this.addHistogram.bind(this));
			this.api.on('histogramsUpdated', this.updateHistograms.bind(this));
			this.api.on('metadataUpdated', this.handleMedatada.bind(this));
			this.api.on('completed', this.handleCompleted.bind(this));

		}

		/**
		 * Reset & start simulation
		 */
		HistogramsGroup.prototype.start = function() {
			// Start 
			if (this.api) this.api.beginTrain();
		}

		/**
		 * Stop running simulation
		 */
		HistogramsGroup.prototype.stop = function() {
			// Stop train sequence
			if (this.api) this.api.stopTrain();
		}

		/**
		 * Compare histograms and return an object with metrics and falgs
		 */
		HistogramsGroup.prototype.checkHistograms = function(histo, ref) {
			var res = {};

			// Perform chi-square per bins
			var chi2_err = Calculate.chi2WithError(histo, ref.data),
				chi2_bins = Calculate.chi2Bins(histo, ref.data);

			// Check some obvious cases
			res.trusted = false;
			if (chi2_err[1] < chi2_err[0]) { // Error smaller than data
				res.trusted = true;
			} else {
				if (chi2_err[0] < 2) {
					res.trusted = true;
				}
			}

			res.chi2 = chi2_err[0];
			res.chi2err = chi2_err[1];

			// Helper to check if error bars are within eachother
			// (values: [y, y+, y-, x, x+, x-])
			var errbar_inside = function(a,b) { // a inside b
					var ayTop = a[0]+a[1], ayBottom = a[0]-a[2],
						byTop = b[0]+b[1], byBottom = b[0]-b[2];
					return (ayTop <= byTop) && (ayBottom >= byBottom);
				},
				errbar_touch = function(a,b) {
					var ayTop = a[0]+a[1], ayBottom = a[0]-a[2],
						byTop = b[0]+b[1], byBottom = b[0]-b[2];
					return ((ayTop >= byBottom) && (ayTop <= byTop)) ||
						   ((ayBottom >= byBottom) && (ayBottom <= byTop));
				}

			// Reset flags
			res.hasBlank = false;

			// Reset metrics
			var errsInside = 0,
				errsTouch = 0;

			// Start counting
			for (var i=0; i<histo.values.length; i++) {
				if (chi2_bins[i] == 0) { // Missing bin? That's a major fault
					res.hasBlank = true;
					res.trusted = false;
				} else {
					// Check if error bars are wintin eachother
					if (errbar_inside(histo.values[i], ref.data.values[i]))
						errsInside++;
					if (errbar_touch(histo.values[i], ref.data.values[i]))
						errsTouch++;
				}
			}

			// Update flags based on metrics
			res.insideRatio = errsInside / histo.bins;
			res.touchRatio = errsTouch / histo.bins;

			return res;
		}

		/**
		 * Check current errors in the histograms
		 */
		HistogramsGroup.prototype.getResult = function( userIsTrusting ) {
			var allTrusted = true,
				allFit = true,
				bestFit = true,
				lastError = "";

			// Get metrics of all histograms
			for (var i=0; i<this.histograms.length; i++) {
				var status = this.checkHistograms( this.histograms[i].data, this.histograms[i].ref );
				if (status.hasBlank) // Blank data is an error right-away
					return "err-blank";
				if (status.trusted) {
					if (status.chi2 > 2) { // Chi 0-2 = accepted
						allFit = false;
					} else if (status.chi2 > 1) { // Chi 0-1 = best
						bestFit = false;
					}
				} else {
					allTrusted = false;
				}
			}

			// Pick a choice of words
			if (allTrusted) {
				if (allFit) {
					if (userIsTrusting) {
						return bestFit ? "perfect" : "good";
					} else {
						return "err-looksgood";
					}
				} else {
					if (!userIsTrusting) {
						return "good";
					} else {
						return "err-looksbad";
					}
				}
			} else {
				return "err-nostats";
			}

		}

		///////////////////////////////////////////////////////////////////////////////////
		// -------------------------------------------------------------------------------
		//                            TUTORIAL SCREEN IMPLEMENTATION
		// -------------------------------------------------------------------------------
		///////////////////////////////////////////////////////////////////////////////////



		/**
		 * @class
		 * @classdesc The introduction to statistics tutorial
		 */
		var StatsTutorial = function( hostDOM ) {
			C.TutorialScreen.call(this, hostDOM);

			// Mark host screen for cinematic
			this.hostDOM.addClass("tutorial-stats");
			this.vibratingDOM = $('<div class="vibrator-host"></div>').appendTo(this.hostDOM);

			// Prepare panels
			this.panelMachine = $('<div class="panel-load"></div>').appendTo(this.vibratingDOM);
			this.panelEvents = $('<div class="panel-event-rate"></div>').appendTo(this.vibratingDOM);
			this.panelHistogram = $('<div class="panel-histogram"></div>').appendTo(this.vibratingDOM);
			this.panelControls = $('<div class="panel-controls"></div>').appendTo(this.vibratingDOM);
			this.panelLegends = $('<div class="panel-histogram-legend"><span class="box" style="background-color: #000"></span> Measurements by past experiments &nbsp; &nbsp; <span class="box" style="background-color: rgb(0, 102, 255);"></span> Current measurements from the Quantum Simulation</div>').appendTo(this.vibratingDOM);

			// Prepare progress bar
			this.eProgressBar = $('<div class="progressbar"></div>').appendTo(this.panelMachine);
			this.eProgressBarBar = $('<div class="bar"></div>').appendTo(this.eProgressBar);
			this.eProgressBarValue = $('<div class="value">Machine Load: <strong>100%</strong></div>').appendTo(this.eProgressBar);

			this.eEventRate = $('<div class="rate">1,000,000</div>').appendTo(this.panelEvents);
			this.eEventRateLabel = $('<div class="label">Events<br />Generated</div>').appendTo(this.panelEvents);
			this.eProgressBarBar.css("width", "50%");

			// Prepare histogram features control group
			this.gControls = $('<div class="group"></div>').appendTo(this.panelControls);
			$('<span>Enable/Disable assistant features:</span>').appendTo(this.gControls);

			this.eToggleErrors = $('<a class="btn-toggle" href="#">Histogram error bars</a>').appendTo(this.gControls);
			this.eToggleErrors.click((function() {
				if (this.eToggleErrors.hasClass("active")) {
					this.eToggleErrors.removeClass("active");
					this.histograms.showErrorBars(false);
				} else {
					this.eToggleErrors.addClass("active");
					this.histograms.showErrorBars(true);
				}
			}).bind(this));

			this.eToggleErrorColors = $('<a class="btn-toggle" href="#">Per-bin comparison colors</a>').appendTo(this.gControls);
			this.eToggleErrorColors.click((function() {
				if (this.eToggleErrorColors.hasClass("active")) {
					this.eToggleErrorColors.removeClass("active");
					this.histograms.showErrorColors(false);
				} else {
					this.eToggleErrorColors.addClass("active");
					this.histograms.showErrorColors(true);
				}
			}).bind(this));

			// Prepare chi-squared group
			this.gChi2 = $('<div class="group"></div>').appendTo(this.panelControls).hide();
			this.chi2Label = $('<strong></strong>');
			($('<p>&chi;<sup>2</sup> test score = </p>').appendTo(this.gChi2)).append(this.chi2Label)

			this.eToggleChi2 = $('<a class="btn-toggle" href="#">&chi;<sup>2</sup> test score</a>')//.appendTo(this.gControls);
			this.eToggleChi2.click((function() {
				if (this.eToggleChi2.hasClass("active")) {
					this.eToggleChi2.removeClass("active");
					this.gChi2.hide();
				} else {
					this.eToggleChi2.addClass("active");
					this.gChi2.show();
				}
			}).bind(this));

			// Prepare the simulation class
			this.histograms = new HistogramsGroup(this.panelHistogram, this.eEventRate, this.eProgressBarBar, this.eProgressBarValue, this.chi2Label);
			this.histograms.onMaxedOut = (function(){ 
				this.trigger('sequence.next', 'timeout');
			}).bind(this);

			// Prepare Accept results group
			this.gControls = $('<div class="group group-bottom"></div>').appendTo(this.panelControls);
			this.eAcceptBtn = $('<a class="btn-accept" href="#">This is a match</a>').appendTo(this.gControls);
			this.eAcceptBtn.click((function() {

				// Stop sequencer
				this.histograms.stop();

				// User is trusting.. check
				var status = this.histograms.getResult(true);
				console.log("Status: ",status);
				this.trigger('sequence.next', status);

			}).bind(this));

			this.eDiscardBtn = $('<a class="btn-discard" href="#">This is not a match</a>').appendTo(this.gControls);
			this.eDiscardBtn.click((function() {

				// Stop sequencer
				this.histograms.stop();

				// User is not trusting.. check
				var status = this.histograms.getResult(false);
				console.log("Status: ",status);
				this.trigger('sequence.next', status);

			}).bind(this));

			this.eSkipTutorial = $('<a class="link-skip" href="do:skip">Skip introduction tutorial</a>').appendTo(this.gControls);
			this.eSkipTutorial.click((function(e) {
				e.preventDefault();
				e.stopPropagation();

				// Trigger seqnece exit
				this.trigger('sequence.exit');

			}).bind(this));

			// Vibration timer
			this.vibrationTimer = setInterval(this.__vibrator.bind(this), 50);

			// Register visual events
			R.registerVisualAid("tunetutorial.controls", this.eToggleErrors, { "screen": "screen.tutorial.stats" });
			R.registerVisualAid("tunetutorial.machine", this.panelEvents, { "screen": "screen.tutorial.stats" });
			R.registerVisualAid("tunetutorial.submit", this.eAcceptBtn, { "screen": "screen.tutorial.stats" });

		}
		StatsTutorial.prototype = Object.create( C.TutorialScreen.prototype );

		/**
		 * Handle vibration
		 */
		StatsTutorial.prototype.__vibrator = function() {
			var vibrationSize = this.histograms.vibrationWidth;
			if (vibrationSize <= 0) return;

			// Calculate a random offset around the center
			this.vibratingDOM.css({
				'left': vibrationSize - (vibrationSize * Math.random())/2,
				'top': vibrationSize - (vibrationSize * Math.random())/2
			});
		}

		///////////////////////////////////////////////////////////////////////////////////
		// -------------------------------------------------------------------------------
		//                            INTERFACE IMPLEMENTATION
		// -------------------------------------------------------------------------------
		///////////////////////////////////////////////////////////////////////////////////

		/**
		 * Handle sequence configuration
		 */
		StatsTutorial.prototype.onSequenceConfig = function( config, cbReady ) {
			this.trainConfig = config;
			if (config['events'])
				this.histograms.maxEvents = parseInt(config['events']);
			cbReady();
		}

		/**
		 * Handle resize vents
		 */
		StatsTutorial.prototype.onResize = function(width, height) {

			// Resize histogram
			this.histograms.resize( this.panelHistogram.width(), this.panelHistogram.height() );

		}

		/**
		 * Initialize before show
		 */
		StatsTutorial.prototype.onWillShow = function(cb) {
			this.histograms.initialize( this.trainConfig );
			this.histograms.start();
			cb();
		}

		/**
		 * Resize after show
		 */
		StatsTutorial.prototype.onShown = function() {
			this.histograms.resize( this.panelHistogram.width(), this.panelHistogram.height() );

			// Show visual aid
			UI.showFirstTimeAid("tunetutorial.controls");
			UI.showFirstTimeAid("tunetutorial.machine");
			UI.showFirstTimeAid("tunetutorial.submit");
		}

		/**
		 * Resize after show
		 */
		StatsTutorial.prototype.onHidden = function() {
			this.histograms.stop();
		}

		// Register screen component on the registry
		R.registerComponent( 'screen.tutorial.stats', StatsTutorial, 1 );

	}

);