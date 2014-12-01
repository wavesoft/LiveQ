

define(

	// Requirements
	["jquery", "core/registry", "core/base/components", "core/db", "core/ui", "core/user", "vas-basic/data/trainhisto" ],

	/**
	 * Basic version of the introduction to tutorial screen
	 *
	 * @exports basic/components/explain_screen
	 */
	function($, R, C, DB, UI, User, TrainHisto) {
		
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

			// Create dummy histogram for testing
			var h = this.domHisto = $('<div style="width: 100%; height: 100%;"></div>').appendTo(hostDOM);
			var hc = this.hc = R.instanceComponent("dataviz.histogram_plain", h);

			// Callback to be fired when we reached 100%
			this.onMaxedOut = function() { };

			// Reroll
			this.reroll();

			// Hide error bars
			this.showErrorBars(false);

			this.timer = 0;
			this.vibrationWidth = 0;

		}

		/**
		 * Show/hide error bars
		 */
		HistogramsGroup.prototype.showErrorBars = function( visible ) {
			this.hc.showErrorBars(visible);
		}

		/**
		 * Resize histograms on demand
		 */
		HistogramsGroup.prototype.resize = function(w,h) {
			var padding = 20;

			this.domHisto.css({
				'width': w - padding*2,
				'height': h - padding*2
			})
			this.hc.onResize(w-padding*2,h-padding*2);
		}

		/**
		 * Resize histograms on demand
		 */
		HistogramsGroup.prototype.setProgression = function(v) {
			var easedValue = 1-Math.pow(1-v,4),
				totalEvents = Math.round(v * 100000000),
				load = (easedValue/2 + 0.5);

			// Update vibration width
			if (load > 0.8) {
				this.vibrationWidth = 20 * ((load - 0.8) / 0.2);
			} else {
				this.vibrationWidth = 0;
			}

			// Update events rate
			this.eventsLabel.text( numberWithCommas(totalEvents) );

			// Update progress
			load += 0.005 - Math.random() * 0.01;
			var percent = load * 100;
			this.progressBar.css({
				'width': percent + '%'
			});
			this.progressLabel.html("Machine Load: <strong>" + Math.round(percent).toFixed(0) + "%</strong>");

			// Update histogram
			this.hc.onUpdate([
					this.th.gen(1, 1),
					this.th.gen(easedValue , 0.65)
				]);

			// Update chi-squared fit
			this.chi2 = this.th.chi2(easedValue, 0.65, 1.0);
			this.chi2Label.text( this.chi2.toFixed(2) );

		}

		/**
		 * Re-roll, by creating a new sample set
		 */
		HistogramsGroup.prototype.reroll = function() {
			// Setup a new train histogram
			var th = this.th = new TrainHisto({
				bins: 20,
				samples:  10000,
				fuzziness:1000
			});

			// Update histogram metadata
			this.hc.onMetaUpdate({
				'bins': th.bins(),
				'domain': [0,1],
				'sets': [
					{
						'name': 'Reference',
						'color': '#fbb03b',
						'valueBar': true,
						'valueColor': '#993300'
					},
					{
						'name': 'Simulation',
						'color': '#2ecc71',
						'opacity': 0.5,
						'valueBar': true,
						'valueColor': '#000000',
						'valueDash' : '2, 2'
					}
				]
			});

			// Update original values
			this.hc.onUpdate([
					th.gen(),
					th.gen()
				]);

		}

		/**
		 * Reset & start simulation
		 */
		HistogramsGroup.prototype.start = function() {
			var i=0.001;
			
			// Reset properties
			this.chi2 = 1000;

			if (this.timer) clearInterval(this.timer);
			this.timer = setInterval((function() {

				// Update progression
				this.setProgression(i);

				// Check for completion
				if (i >= 0.9999) {
					i = 0;
					if (this.onMaxedOut) this.onMaxedOut();
					this.stop();
				}

				// Update step
				i = Math.min(1.0, i+Math.random() * 0.001);

			}).bind(this), 100);
		}

		/**
		 * Stop running simulation
		 */
		HistogramsGroup.prototype.stop = function() {
			if (this.timer) clearInterval(this.timer);
			this.timer = 0;
		}

		/**
		 * Check if values are accepted
		 */
		HistogramsGroup.prototype.isAccepted = function() {

		}

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
			this.panelLegends = $('<div class="panel-histogram-legend"><span class="box" style="background-color: #fbb03b"></span> Measurements by the accelerators &nbsp; &nbsp; <span class="box" style="background-color: #2ecc71"></span> Current measurements from the Quantum Simulation</div>').appendTo(this.vibratingDOM);

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

			// Prepare chi-squared group
			this.gChi2 = $('<div class="group"></div>').appendTo(this.panelControls).hide();
			this.chi2Label = $('<strong></strong>');
			($('<p>&chi;<sup>2</sup> test score = </p>').appendTo(this.gChi2)).append(this.chi2Label)

			this.eToggleChi2 = $('<a class="btn-toggle" href="#">&chi;<sup>2</sup> test score</a>').appendTo(this.gControls);
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
			this.onMaxedOut = (function(){ 
				this.trigger('sequence.next', 'timeout');
			}).bind(this);

			// Prepare Accept results group
			this.gControls = $('<div class="group group-bottom"></div>').appendTo(this.panelControls);
			this.eAcceptBtn = $('<a class="btn-accept" href="#">Accept this values</a>').appendTo(this.gControls);
			this.eAcceptBtn.click((function() {
				if (this.histograms.chi2 < 1) {
					this.trigger('sequence.next', 'perfect');
				} else if (this.histograms.chi2 < 2) {
					this.trigger('sequence.next', 'good');
				} else {
					this.trigger('sequence.next', 'bad');
				}
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
			this.histograms.reroll();
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