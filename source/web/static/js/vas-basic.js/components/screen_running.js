
define(

	// Requirements
	[ "jquery", "core/config", "core/registry", "core/base/components", "core/ui"],

	/**
	 * Basic version of the home screen
	 *
	 * @exports vas-basic/components/running_screen
	 */
	function($, config,R,C,UI) {

		/**
		 * Helper function to format thousands
		 */
		function numberWithCommas(x) {
		    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		}

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var RunningScreen = function( hostDOM ) {
			C.RunningScreen.call(this, hostDOM);

			// Prepare configuration
			this.diameter = 200;
			this.machines = [];
			this.lastWorkers = 0;
			this.rateLastTime = 0;
			this.rateLastNevts = 0;
			this.rateAvgBuffer = [];
			this.observableByID= {};
			this.observables = {};
			window.run = this;

			// Prepare host
			hostDOM.addClass("running");

			// Observable configuration
			this.obsAngleSpan = Math.PI*2;
			this.obsAngleShift = 0;
			this.obsWideSpan = 0;
			this.obsMinDistance = 400;
			this.obsMaxDistance = 600;

			// Create a slpash backdrop
			this.backdropDOM = $('<div class="'+config.css['backdrop']+'"></div>');
			hostDOM.append(this.backdropDOM);
			this.backdrop = R.instanceComponent("backdrop.running", this.backdropDOM);

			// Create foreground DOM
			this.foregroundDOM = $('<div class="'+config.css['foreground']+'"></div>');
			hostDOM.append( this.foregroundDOM );

			// Create the four pageparts
			this.ppTL = $('<div class="pagepart run-tl"></div>');
			this.ppTR = $('<div class="pagepart run-tr"></div>');
			this.ppBL = $('<div class="pagepart run-bl"></div>');
			this.foregroundDOM.append( this.ppTL );
			this.foregroundDOM.append( this.ppTR );
			this.foregroundDOM.append( this.ppBL );

			var btnTutorial = $('<div class="btn-taglike"><span class="uicon uicon-explain"></span><br />Tutorial</div>');
			this.ppTL.append( btnTutorial );
			btnTutorial.click(function(e) {
				e.preventDefault();
				e.stopPropagation();
				UI.showTutorial("ui.running");
			});

			var btnServerStatus = $('<div class="btn-taglike"><span class="uicon uicon-gear"></span><br />Status</div>');
			this.ppTR.append( btnServerStatus );
			var bytEventDetails = $('<div class="btn-taglike"><span class="uicon uicon-eye"></span><br />Details</div>');
			this.ppBL.append( bytEventDetails );

			// Fill-in information fields
			this.infoWorkers = $('<h1>0</h1>');
			this.ppTR.append(this.infoWorkers);
			this.ppTR.append($('<p>Connected machines</p>'));

			this.infoEventRate = $('<h1>0</h1>');
			this.ppTL.append(this.infoEventRate);
			this.ppTL.append($('<p>Events/sec</p>'));

			this.infoPercent = $('<h1>0%</h1>');
			this.ppBL.append(this.infoPercent);
			this.ppBL.append($('<p>Completed</p>'));

			// Prepare host for observing elements
			this.hostObserving = $('<div class="observing-host"></div>');
			this.foregroundDOM.append( this.hostObserving );

			// Create status widget
			this.statusWidget = R.instanceComponent( "widget.running_status", this.foregroundDOM );
			if (!this.statusWidget)
				console.warn("Unable to instantiate running screen status widget");
			else {
				this.forwardVisualEvents( this.statusWidget );
				this.forwardEvents( this.statusWidget, [ 'onWorkerAdded', 'onWorkerRemoved', 'onStartRun' ] );
				this.statusWidget.on('abort', (function() {
					this.trigger('abortRun');
				}).bind(this));
			}

			// Register visual aids
			R.registerVisualAid("running.label.workers", this.infoWorkers, { "screen": "screen.running" });
			R.registerVisualAid("running.label.events", this.infoEventRate, { "screen": "screen.running" });
			R.registerVisualAid("running.label.percent", this.infoPercent, { "screen": "screen.running" });

			// Prepare for observable elements
			this.obsElms = [];

		}
		RunningScreen.prototype = Object.create( C.RunningScreen.prototype );

		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		////                      INTERFACE DESIGN FUNCTIONS                       ////
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////

		/**
		 * Create observabe
		 */
		RunningScreen.prototype.defineObservables = function( observables ) {

			// Reset elements
			this.hostObserving.empty();
			this.observableByID = {};
			this.obsElms = [];

			// Render elements
			var firstObservable = true,
				aNum = observables.length,
				aStep = (Math.PI*2) / (aNum+1),
				aVal = -Math.PI;

			// Populate observables
			for (var i=0; i<aNum; i++) {
				var o = this.createObservable( (aVal += aStep), observables[i] );

				// Store on observable elements
				if (!o) {
					console.warn("TuningScreen: Could not create observable!");
					continue;
				}
				this.obsElms.push( o );
				this.observableByID[ observables[i]['_id'] ] = o;

				// First observable goes to visual helper
				if (firstObservable) {
					R.registerVisualAid( 'running.observable', o, {'screen': 'screen.running' } );
					firstObservable = false;
				}

			}


		}

		/**
		 * Create an observable widget
		 */
		RunningScreen.prototype.createObservable = function( angle, metadata ) {

			// Try to instantiate the observable component
			var e = R.instanceComponent("widget.observable.running", this.hostObserving );
			if (!e) {
				console.warn("Unable to instantiate an observable widget!");
				return undefined;
			}

			// Forward visual events
			this.forwardVisualEvents( e );

			// Set pivot configuration for doing this nice
			// circular distribution
			e.setRadialConfig( undefined, undefined, angle );

			// Event: Request for explanation
			e.on('explain', (function(book) {
				this.showBook( book );
			}).bind(this));

			// Set metadata and value
			e.onMetaUpdate( metadata );
			e.onUpdate( undefined );

			return e;

		}

		/**
		 * Update observing pivot position
		 */
		RunningScreen.prototype.updateObservingStatus = function() {

			// Update observing pivot coordinates
			var w=this.width,h=this.height,
				l=0, t=0;

			// Calculate shift depending on the sidebars
			if ($("body").hasClass('layout-compact')) {
				l = 200; w -= l;
			} else if ($("body").hasClass('layout-wide')) {
				l = 230; w -= l*2;
			} else if ($("body").hasClass('layout-vertical')) {
			} else if ($("body").hasClass('layout-mobile')) {
			}

			// Pick radius according to screen alignment
			if (w > h) {
				r = (h/2)-10;
			} else {
				r = (w/2)-10;
			}

			// Realign all the tunables
			var a = this.obsAngleShift, aStep = this.obsAngleSpan / this.obsElms.length;
			for (var i=0; i<this.obsElms.length; i++) {
				if (this.obsElms[i].setRadialConfig)
					this.obsElms[i].setRadialConfig( 160, r - 24, a += aStep );
				this.obsElms[i].onMove( l, t );
				this.obsElms[i].onResize( w, h );
			}

			// Update the status widget
			this.statusWidget.setShootTarget( (r-184)/2 + 160 );

		}

		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		////                          MAIN HOOK HANDLERS                           ////
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////

		/**
		 * Define the observable configuration
		 *
		 * @param {array} observables - A list of Observable classes, one for each observable.
		 */
		RunningScreen.prototype.onObservablesDefined = function(observables) {
			this.observables = {};

			// Build the observables-by ID lookup table
			for (var i=0; i<observables.length; i++) {
				this.observables[observables[i]._id] = observables[i];
			}
		}

		/**
		 * Fired when a worker node is added to the job
		 */
		RunningScreen.prototype.onWorkerRemoved = function( id ) {

			// Remove machine from list
			for (var i=0; i<this.machines.length; i++) {
				if (this.machines[i].id == id) {
					this.machines.splice(i,1);
					break;
				}
			}

			// Update text
			this.infoWorkers.text(this.machines.length);

		}

		/**
		 * Fired when a worker node is added to the job
		 */
		RunningScreen.prototype.onWorkerAdded = function( id, info ) {

			// If that's our first worker, show first-time aid
			if (this.machines.length == 0)
				UI.showFirstTimeAid( "running.label.workers" );				

			// Update the machines
			info['id'] = id;
			this.machines.push(info);

			// Update text
			this.infoWorkers.text(this.machines.length);

		}

		/**
		 * Reisze canvas & engine dimentions to fit host
		 */
		RunningScreen.prototype.onStartRun = function( values, observableIDs ) {

			// Reset run
			this.machines = [];
			this.rateAvgBuffer = [];
			this.rateLastTime = 0;
			this.rateLastNevts = 0;

			// Reset text fields
			this.infoWorkers.text("0");
			this.infoEventRate.text("0");
			this.infoPercent.text("0%");
			this.statusWidget.onUpdate(0);

			// Prepare observables
			var obs = [];
			for (var i=0; i<observableIDs.length; i++) {
				var obsRef = this.observables[ observableIDs[i] ];
				if (obsRef) obs.push( obsRef );
			}

			// Define observables
			this.defineObservables(obs);

		}

		/**
		 * Update histogram data
		 */
		RunningScreen.prototype.onUpdate = function( histograms, _tmpFakeProgress_ ) {
			if (histograms.length == 0) return;

			// Calculate event rate
			var nevts = histograms[0].data.nevts,
				eventRate = 0;

			if (this.rateLastNevts != 0) {
				var deltaEvents = nevts - this.rateLastNevts,
					deltaTime = (Date.now() - this.rateLastTime) / 1000,
					rate = deltaEvents/ deltaTime;

				// Put event rate in buffer
				this.rateAvgBuffer.push( rate );
				for (var i=0; i<this.rateAvgBuffer.length; i++) {
					eventRate += this.rateAvgBuffer[i];
				}

				// Apply ring buffer to average values
				if (this.rateAvgBuffer.length > 5)
					this.rateAvgBuffer.splice(0,1);
				eventRate = Math.round(eventRate / this.rateAvgBuffer.length);

			}
			this.rateLastNevts = nevts;
			this.rateLastTime = Date.now();

			// Update event rates
			if (eventRate > 0) {
				this.infoEventRate.text( numberWithCommas(eventRate) );
				UI.showFirstTimeAid( "running.label.events" );
			}

			// Calculate progress
			var totalEvents = this.machines.length * 200000,
				progress = nevts / totalEvents;

			// Update progress on the status widget
			this.statusWidget.onUpdate( progress );
			this.infoPercent.text( Math.round( progress * 100 ) + "%" )

			// Show first-time percent widget
			if (progress > 0.25)
				UI.showFirstTimeAid( "running.label.percent" );

			// Update observables
			var chiSum = 0, chiCount = 0;

			// Update histogram data
			for (var i=0; i<histograms.length; i++) {
				var histo = histograms[i];

				// Find the relative observable
				if (this.observableByID[histo.id]) {

					// Update histogram 
					this.observableByID[histo.id].onUpdate( histo );

					// Collect chi-squared average information
					chiSum += this.observableByID[histo.id].getValue();
					chiCount += 1;
				}

			}
			console.log(histograms);
			window.h = histograms;
		}

		/**
		 * When shown, show first-time aids
		 */
		RunningScreen.prototype.onShown = function() {

		}

		/**
		 * Reisze canvas & engine dimentions to fit host
		 */
		RunningScreen.prototype.onResize = function(w,h) {
			var globeW = 160, globeH = 160;
			this.width = w;
			this.height = h;

			// Update pivot point
			this.pivotX = this.width / 2;
			this.pivotY = this.height / 2;

			// Realign globe
			/*
			this.globeDOM.css({
				'left': (this.width - globeW) / 2,
				'top' : (this.height - globeH) / 2,
			});
			*/

			this.statusWidget.setPosition( this.pivotX, this.pivotY );

			// Realign background
			/*
			this.progressGroup.css({
				'left': (this.width - this.diameter) / 2,
				'top': (this.height - this.diameter) / 2,
			});
			*/

			// Update observables
			this.updateObservingStatus();

		}

		// Register home screen
		R.registerComponent( "screen.running", RunningScreen, 1 );

	}

);