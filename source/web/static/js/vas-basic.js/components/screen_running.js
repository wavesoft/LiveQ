
define(

	// Requirements
	[ "jquery", "core/config", "core/registry", "core/base/components"],

	/**
	 * Basic version of the home screen
	 *
	 * @exports vas-basic/components/running_screen
	 */
	function($, config,R,C) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var RunningScreen = function( hostDOM ) {
			C.RunningScreen.call(this, hostDOM);

			// Prepare configuration
			this.diameter = 200;

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


			// Prepare pop-up drawer
			this.popupOnScreen = R.instanceComponent( "widget.onscreen", this.hostObserving );
			if (!this.popupOnScreen)
				console.warn("Unable to instantiate onscreen description element");

			// Prepare for observable elements
			this.obsElms = [];
			this.dummyBuild();


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
		RunningScreen.prototype.dummyBuild = function() {

			// Reset elements
			this.hostObserving.empty();
			this.obsElms = [];

			// Create dummpy
			var observables = [];
			for (var i=0; i<100; i++) {
				observables.push({
					'info': {
						'name': 'O'+i,
						'short': 'O'+i,
						'book': 'more-'+i
					}
				});
			}

			// RENDER
			var aNum = observables.length,
				aStep = (Math.PI*2) / (aNum+1),
				aVal = -Math.PI;

			for (var i=0; i<aNum; i++) {
				var o = this.createObservable( (aVal += aStep), observables[i] );
				o.onUpdate( Math.random() );
				this.obsElms.push(o);
			}

		}


		/**
		 * Create the status widget
		 */
		RunningScreen.prototype.createStatusWidget = function( hostDOM ) {



		}

		/**
		 * Create an observable widget
		 */
		RunningScreen.prototype.createObservable = function( angle, metadata ) {

			// Try to instantiate the observable component
			var e = R.instanceComponent("widget.observable.tuning", this.hostObserving );
			if (!e) {
				console.warn("Unable to instantiate an observable widget!");
				return undefined;
			}

			console.log(this.pivotX, this.pivotY, angle);

			// Set pivot configuration for doing this nice
			// circular distribution
			e.setPivotConfig( 
				this.pivotX, 			// Pivot X
				this.pivotY, 			// Pivot Y
				angle,					// Angle around pivot
				200, 					// Min distance
				400						// Max distance
			);

			// Bind pop-up events
			e.on('showDetails', (function(elm) {
				return function(metadata) {

					// Prepare popup
					var comBodyHost = $('<div></div>');
					this.popupOnScreen.setAnchor( elm.x, elm.y, 80, (elm.x > this.pivotX) ? 0 : 1 );
					this.popupOnScreen.setBody(comBodyHost);
					this.popupOnScreen.setTitle("Details for " + metadata['info']['name']);

					// Prepare the body component
					var comBody = R.instanceComponent("infoblock.observable", comBodyHost);
					if (comBody) {
						comBody.setWidget( e );
					} else {
						console.warn("Could not instantiate observable infoblock!");
					}

					// Display popup screen
					this.popupOnScreen.setVisible(true);

				}
			})(e).bind(this));
			e.on('hideDetails', (function(elm) {
				return function(metadata) {
					this.popupOnScreen.setVisible(false);
				}
			})(e).bind(this));

			// Set metadata and value
			e.onMetadataUpdate( metadata );
			e.onUpdate( undefined );

			return e;

		}


		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		////                          MAIN HOOK HANDLERS                           ////
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////

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
			this.globe.onResize( globeW, globeH );
			this.globeDOM.css({
				'left': (this.width - globeW) / 2,
				'top' : (this.height - globeH) / 2,
			});

			// Realign background
			this.progressGroup.css({
				'left': (this.width - this.diameter) / 2,
				'top': (this.height - this.diameter) / 2,
			});

			// Update observables
			for (var i=0; i<this.obsElms.length; i++) {
				this.obsElms[i].setPivotConfig(this.pivotX, this.pivotY);
				this.obsElms[i].onResize(this.width, this.height);
				this.obsElms[i].onHorizonTopChanged(this.height);
			}

		}

		/**
		 * Forward onShow event to children
		 */
		RunningScreen.prototype.onShown = function() {
			this.globe.onShown();
		}

		/**
		 * Forward onWillShow event to children
		 */
		RunningScreen.prototype.onWillShow = function(cb) {
			var vc=1;
			this.globe.onWillShow(function() { if (--vc == 0) cb(); });
		}

		/**
		 * Forward onHidden event to children
		 */
		RunningScreen.prototype.onHidden = function() {
			this.globe.onHidden();
		}

		/**
		 * Forward onWillHide event to children
		 */
		RunningScreen.prototype.onWillHide = function(cb) {
			var vc=1;
			this.globe.onWillHide(function() { if (--vc == 0) cb(); });
		}

		// Register home screen
		R.registerComponent( "screen.running", RunningScreen, 1 );

	}

);