
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
			window.run = this;

			// Prepare host
			hostDOM.addClass("running");

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
			this.infoEventRate = $('<h1>0</h1>');
			this.ppTL.append(this.infoEventRate);
			this.ppTL.append($('<p>Events/sec</p>'));

			this.infoWorkers = $('<h1>0</h1>');
			this.ppTR.append(this.infoWorkers);
			this.ppTR.append($('<p>Connected machines</p>'));

			this.infoPercent = $('<h1>25%</h1>');
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

			// Prepare observables
			this.defineObservables();


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

			// ----- CUT HERE ------------------

			// Create dummpy
			var observables = [];
			for (var i=0; i<5; i++) {
				observables.push({
					'info': {
						'name': 'O'+i,
						'short': 'O'+i,
						'book': 'more-'+i
					}
				});
			}

			// ----- TILL HERE -----------------

			// Reset elements
			this.hostObserving.empty();
			this.obsElms = [];

			// Render elements
			var aNum = observables.length,
				aStep = (Math.PI*2) / (aNum+1),
				aVal = -Math.PI;

			for (var i=0; i<aNum; i++) {
				var o = this.createObservable( (aVal += aStep), observables[i] );
				//o.onUpdate( Math.random() );
				this.obsElms.push(o);
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

			// Set pivot configuration for doing this nice
			// circular distribution
			e.setRadialConfig( 150, 350, angle );

			// Set metadata and value
			e.onMetaUpdate( metadata );
			e.onUpdate( undefined );

			return e;

		}


		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		////                          MAIN HOOK HANDLERS                           ////
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////

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
		RunningScreen.prototype.onStartRun = function( values, referenceHistograms ) {
			// Reset run
			this.machines = [];
			this.rateAvgBuffer = [];
			this.rateLastTime = 0;
			this.rateLastNevts = 0;

			this.infoWorkers.text("0");
			this.infoEventRate.text("0");

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

			////////////////////////////////////////
				progress = _tmpFakeProgress_;
			////////////////////////////////////////

			// Update progress on the status widget
			this.statusWidget.onUpdate( progress );
			this.infoPercent.text( Math.round( progress * 100 ) + "%" )

			// Show first-time percent widget
			if (progress > 0.25)
				UI.showFirstTimeAid( "running.label.percent" );


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
			for (var i=0; i<this.obsElms.length; i++) {
				//this.obsElms[i].setPivotConfig(this.pivotX, this.pivotY);
				this.obsElms[i].onResize(this.width, this.height);
			}

		}

		// Register home screen
		R.registerComponent( "screen.running", RunningScreen, 1 );

	}

);