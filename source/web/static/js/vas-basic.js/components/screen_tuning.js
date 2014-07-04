

define(

	/**
	 * Dependencies
	 */
	["jquery", "core/config", "core/registry", "core/base/components", "core/db", "core/ui",

	 // Self-registering dependencies
	 "jquery-knob"], 

	/**
	 * Basic version of the home screen
	 *
	 * @exports vas-basic/components/tuning_screen
	 */
	function($, config, R, C, DB, UI) {

		/**
		 * Tuning dashboard screen
		 */
		var TuningScreen = function(hostDOM) {
			C.TuningScreen.call(this, hostDOM);

			// Prepare properties
			var self = this;
			this.host = hostDOM;
			this.width = 0;
			this.height = 0;
			window.ts = this;

			// Configuration parameters
			this.obsAngleSpan = Math.PI;
			this.obsWideSpan = 0;
			this.obsMinDistance = 400;
			this.obsMaxDistance = 600;

			this.tunAngleSpan = Math.PI*4/3;
			this.tunWideSpan = 0;
			this.tunMinDistance = 150;
			this.tunMaxDistance = 350;

			// Data fields
			this.tunables = {};
			this.observables = {};
			this.parameters = {};

			// Indexing for the UI widgets
			this.tuneWidgets = {};
			this.observeWidgets = {};

			// Prepare observable parameters
			this.obsElms = [];
			this.tunElms = [];
			this.observablesLevelRings = [];
			this.tunablesLevelRings = [];

			// Initialize host DOM
			hostDOM.addClass("tuning");

			// Create a slpash backdrop
			this.backdropDOM = $('<div class="'+config.css['backdrop']+'"></div>');
			hostDOM.append(this.backdropDOM);
			this.backdrop = R.instanceComponent("backdrop.tuning", this.backdropDOM);
			this.forwardVisualEvents( this.backdrop );

			// Create foreground
			this.foregroundDOM = $('<div class="'+config.css['foreground']+'"></div>');
			hostDOM.append(this.foregroundDOM);

			// Create the pagepart
			this.ppTL = $('<div class="pagepart tune-tl"></div>');
			this.foregroundDOM.append( this.ppTL );

			// Fill-in pagepart fields
			this.infoTitle = $('<h1>Level 1</h1>');
			this.ppTL.append(this.infoTitle);
			this.infoSubtitle = $('<p>A short description of this level</p>');
			this.ppTL.append(this.infoSubtitle);

			// Prepare pagepart buttons
			var btnTutorial = $('<div class="btn-taglike"><span class="uicon uicon-explain"></span><br />Tutorial</div>');
			btnTutorial.click(function(e) {
				e.preventDefault();
				e.stopPropagation();
				UI.showTutorial("ui.tuning");
			});
			this.ppTL.append( btnTutorial );

			// Prepare host elements
			this.hostTuning = $('<div class="tuning-host"></div>');
			this.foregroundDOM.append(this.hostTuning);

			// Prepare mouse events
			this.mouse = { x:0 , y:0 };
			this.foregroundDOM.mousemove(function(e) {
				var yPosition = 300,
					mouseX = 0,
					mouseY = 0;

				// Calculate mouse offset
				mouseX = (e.clientX - self.width/2) / (self.width/2);
				if (e.clientY > yPosition) {
					mouseY = (e.clientY - yPosition) / (self.height - yPosition - self.detailsViewHeight);
				} else {
					mouseY = 0.01;
				}

				// Convert to exp^4 scale in order to limit
				// the moving frequency in the center
				mouseX = Math.pow(Math.abs(mouseX),4) * (Math.abs(mouseX)/mouseX);
				mouseY = Math.pow(Math.abs(mouseY),4) * (Math.abs(mouseY)/mouseY);

				// Calculate how much distance the mouse should pan
				// the screen around for
				var overPan = 50,
					panX = (overPan+self.obsMaxDistance*2) - self.width,
					panY = (overPan+self.obsMaxDistance+self.pivotY) - self.height;
				if (panX < 0) panX = 0;
				if (panY < 0) panY = 0;

				// Aply cursor panning
				self.hostTuning.css({
					'left': -mouseX * panX,
					'top' : -mouseY * panY
				});

				// Update horizon
				self.forwardHorizon();

			});

			// Prepare status widget
			this.statusWidget = R.instanceComponent( "widget.tuning_status", this.hostTuning );
			if (!this.statusWidget)
				console.warn("Unable to instantiate tuning status widget!");
			else
				this.forwardVisualEvents( this.statusWidget );

			// Bind widget events
			this.statusWidget.onUpdate();
			this.statusWidget.on('begin', (function() {
				this.trigger('submitParameters', this.getValueMap());
			}).bind(this));

			// Prepare pop-up drawer
			this.popupOnScreen = R.instanceComponent( "widget.onscreen", this.hostTuning );
			if (!this.popupOnScreen)
				console.warn("Unable to instantiate onscreen description element");
			else
				this.forwardVisualEvents( this.popupOnScreen );

			// Prepare expanded view
			this.prepareExpandedView();



			// Define main screen
			var levels=[], obs=[], tun=[], ltid=0, loid=0;
			for (var i=0; i< 10; i++) {
				var l = {
					'tun': [],
					'obs': [],
					'feats': [],
					'train': []
				};
				for (var j=0; j<5; j++) {
					var oid = "o"+(loid++);
					obs[oid] = {
						'info': {
							'short': 'O'+oid,
							'name' : 'Observable #'+oid,
							'book' : 'book-'+oid
						}
					};
					l.obs.push(oid);
				}
				for (var j=0; j<5; j++) {
					var tid = "t"+(ltid++);
					tun[tid] = {
						'value': {
							'min'  : 0,
							'max'  : 10,
							'dec'  : 2,
						},
						'info': {
							'short': 'T'+tid,
							'name' : 'Tunable #'+tid,
							'book' : 'book-'+tid
						}
					};
					l.tun.push(tid);
				}
				levels.push(l);
			}
			//this.defineMainScreen( levels, obs, tun );

		}
		TuningScreen.prototype = Object.create( C.TuningScreen.prototype );

		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		////                      INTERFACE DESIGN FUNCTIONS                       ////
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////

		/**
		 * Create expanded view screen
		 */
		TuningScreen.prototype.prepareExpandedView = function() {

			// Prepare detailed observation screen
			this.detailsViewHeight = 0;
			this.detailsView = $('<div class="details-view"></div>');
			this.foregroundDOM.append( this.detailsView );

			// Prepare tuning component
			this.pinViewComponent = R.instanceComponent("screen.tuning.pin", this.detailsView);

			// Prepare details view expand buttion
			var detailsExpandButton = $('<div class="btn-taglike"><span class="uicon uicon-pin"></span><br />Pinned</div>');
			this.detailsView.append( detailsExpandButton );
			detailsExpandButton.click( (function() {
				var expanded = this.detailsView.hasClass("expanded");
				if (expanded) {
					this.detailsViewHeight = 0;
					this.detailsView.removeClass("expanded");
					this.onResize( this.width, this.height );
					this.pinViewComponent.hide();
				} else {
					this.detailsViewHeight = 150;
					this.detailsView.addClass("expanded");
					this.onResize( this.width, this.height );
					this.pinViewComponent.show();
				}
			}).bind(this));


			// Prohibit mouse events
			this.detailsView.mousemove(function(e) {
				e.stopPropagation();
			});

		}


		/**
		 * Create an tunable widget
		 */
		TuningScreen.prototype.createTunable = function( angle, level, metadata ) {

			// Try to instantiate the observable component
			var e = R.instanceComponent("widget.tunable.tuning", this.hostTuning );
			if (!e) {
				console.warn("Unable to instantiate a tuning widget!");
				return undefined;
			}

			// Forward visual events
			this.forwardVisualEvents( e );

			// Set pivot configuration for doing this nice
			// circular distribution
			e.setPivotConfig( 
				this.pivotX, 			// Pivot X
				this.pivotY, 			// Pivot Y
				angle,					// Angle around pivot
				level 					// Track position
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
					var comBody = R.instanceComponent("infoblock.tunable", comBodyHost);
					if (comBody) {
						comBody.setWidget( e );
					} else {
						console.warn("Could not instantiate tunable infoblock!");
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
			e.on('valueChanged', (function(value) {
				this.statusWidget.onUpdate( Math.random() );
				for (var i=0; i<this.obsElms.length; i++) {
					this.obsElms[i].onUpdate(Math.random());
				}
			}).bind(this));

			// Set default values
			e.onMetaUpdate( metadata );
			e.onUpdate(0.000);

			return e;

		}

		/**
		 * Create an observable widget
		 */
		TuningScreen.prototype.createObservable = function( angle, metadata ) {

			// Try to instantiate the observable component
			var e = R.instanceComponent("widget.observable.tuning", this.hostTuning );
			if (!e) {
				console.warn("Unable to instantiate an observable widget!");
				return undefined;
			}

			// Forward visual events
			this.forwardVisualEvents( e );

			// Set pivot configuration for doing this nice
			// circular distribution
			e.setPivotConfig( 
				this.pivotX, 			// Pivot X
				this.pivotY, 			// Pivot Y
				angle,					// Angle around pivot
				this.obsMinDistance, 	// Min distance
				this.obsMaxDistance		// Max distance
			);

			// Bind pop-up events
			e.on('showDetails', (function(elm) {
				return function(metadata) {

					// Prepare popup
					var comBodyHost = $('<div></div>');
					this.popupOnScreen.setAnchor( elm.x, elm.y, 80, (elm.x > this.pivotX) ? 0 : 1 );
					this.popupOnScreen.setBody(comBodyHost);
					this.popupOnScreen.setTitle("Details for " + metadata['info']['name']);

					// Prepare a 'Pin this' button
					var pinThisBtn = $('<a href="do:pin-this"><span class="uicon uicon-pin"></span> Pin this ...</a>');
					pinThisBtn.click((function(e) {
						e.stopPropagation();
						e.preventDefault();
						
					}).bind(this));

					// Prepare the body component
					var comBody = R.instanceComponent("infoblock.observable", comBodyHost);
					if (comBody) {
						comBody.setWidget( e, [ pinThisBtn ] );
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
			e.onMetaUpdate( metadata );
			e.onUpdate( undefined );

			return e;

		}

		/**
		 * Define the main screen
		 */
		TuningScreen.prototype.defineMainScreen = function( levels, observables, tunables ) {
			var self = this,
				firstTunable = true,
				firstObservable = true;

			// Calculate pivot point
			this.pivotX = this.width / 2;
			this.pivotY = 150;

			// Reset observable parameters
			this.obsElms = [];
			this.tunElms = [];
			this.observablesLevelRings = [];
			this.tunablesLevelRings = [];

			// Tunable ring positions
			var tRingRadius = this.tunMinDistance, 
				tRingStep = (this.tunMaxDistance - this.tunMinDistance) / levels.length;

			// Calculate total number of observables
			var oNum = 0;
			for (var j=0; j<levels.length; j++)
				oNum += levels[j].obs.length;
			var oStep = this.obsAngleSpan / (oNum+1),
				oVal = -this.obsAngleSpan / 2;

			// Process level definitions
			for (var j=0; j<levels.length; j++) {
				var level = levels[j],
					tunRing = [], obsRing = [];

				// Build observable rings
				for (var i=0; i<oNum; i++) {
					var o = this.createObservable( 
							(oVal += oStep),
							observables[ level['obs'][i] ]
						);

					// Store on observable elements
					if (!o) {
						console.warn("TuningScreen: Could not create observable!");
						continue;
					}
					this.obsElms.push( o );

					// First observable goes to visual helper
					if (firstObservable) {
						R.registerVisualAid( 'observable', o, {'screen': 'screen.tuning' } );
						firstObservable = false;
					}

					// Bind click to focus
					o.on('click', (function(ring) {
						return function() {
							this.focusTunableRing( ring );
						}
					})(j).bind(this));

					// Activate zero level
					o.setActive( j == 0 );
					obsRing.push( o );

				}

				// Update observables level ring
				this.observablesLevelRings.push(obsRing);

				/////////////////////////////////////////////

				// Prepare tunable rings
				var tNum = level['tun'].length,
					tStep = this.tunAngleSpan / (tNum+1);
					tVal = -this.tunAngleSpan / 2;

				// Build tunable rings
				for (var i=0; i<tNum; i++) {
					var o = this.createTunable(
							(tVal += tStep),
							tRingRadius,
							tunables[ level['tun'][i] ]
						);

					// Store on tunable elements
					if (!o) {
						console.warn("TuningScreen: Could not create tunable!");
						continue;
					}
					this.tunElms.push( o );

					// First tunable goes to visual helper
					if (firstTunable) {
						R.registerVisualAid( 'tunable', o, {'screen': 'screen.tuning'} );
						firstTunable = false;
					}

					// Bind on tune rings
					o.on('click', (function(ring) {
						return function() {
							this.focusTunableRing( ring );
						}
					})(j).bind(this));

					// Activate the first level
					o.setActive( j == 0 );
					tunRing.push(o);

				}

				// Update tunables level ring
				this.tunablesLevelRings.push(tunRing);
				tRingRadius += tRingStep;

			}

		}

		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		////                          MAIN HOOK HANDLERS                           ////
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////

		/**
		 * Define the tunable configuration
		 *
		 * @param {array} tunables - A list of Tunable classes, one for each tunable.
		 */
		TuningScreen.prototype.onTunablesDefined = function(tunables) {
			this.tunables = {};

			// Build the tunables-by ID lookup table
			for (var i=0; i<tunables.length; i++) {
				this.tunables[tunables[i]._id] = tunables[i];
			}

		}

		/**
		 * Define the observable configuration
		 *
		 * @param {array} observables - A list of Observable classes, one for each observable.
		 */
		TuningScreen.prototype.onObservablesDefined = function(observables) {
			this.observables = {};

			// Build the observables-by ID lookup table
			for (var i=0; i<observables.length; i++) {
				this.observables[observables[i]._id] = observables[i];
			}
		}

		/**
		 * Define the level structure information
		 * (MUST be called after the setTunables/setObservables) function calls.
		 */
		TuningScreen.prototype.onLevelsDefined = function(levelInfo) {
			this.levels = levelInfo;

			// Prepare level records
			/*
			for (var i=0; i<levelInfo.length; i++) {
				var level = {
					'obs': (levelInfo[i]['obs'] || []).slice(0),
					'tun': (levelInfo[i]['tun'] || []).slice(0)
				};

				// Replace tunable IDs with their references
				var tunables = [];
				for (var j=0; j<level.tun.length; j++) {

					// Locate tunable structure
					var tun = this.tunables[level.tun[j]];
					if (tun == undefined) {
						console.warn("Undefined tunable '"+level.tun[j]+"' for level #"+i);
						continue;
					}

					// Update tunables record
					tunables.push( tun );

				}
				level.tun = tunables;

				// Pick observables
				var observables = [];
				for (var j=0; j<level.obs.length; j++) {

					// Locate observable structure
					var obs = this.observables[level.obs[j]];
					if (obs == undefined) {
						console.warn("Undefined observable '"+level.obs[j]+"' for level #"+i);
						continue;
					}

					// Update observables record
					observables.push( obs );

				}
				level.obs = observables;

				// Store level record on registry
				this.levels.push(level);

			}
			*/

		}


		/**
		 * Select an enable interface controls for the specified level
		 */
		TuningScreen.prototype.onSelectLevel = function( targetLevel ) {

			// Get the levels to activate
			var activeLevels = [];
			for (var i=0; i<=targetLevel; i++)
				activeLevels.push(this.levels[i]);

			// Redefine main screen
			this.defineMainScreen( activeLevels, this.observables, this.tunables );

		}

		/**
		 * Handle window resize
		 */
		TuningScreen.prototype.onResize = function(width, height) {
			this.width = width;
			this.height = height;

			// Calculate new pivot position
			this.pivotX = this.width / 2;
			this.pivotY = 150;

			// Place status widget on pivot
			this.statusWidget.setPosition( this.pivotX, this.pivotY );

			// Fire resize host on all children
			this.statusWidget.onResize(width,height-this.detailsViewHeight);
			for (var i=0; i<this.obsElms.length; i++) {
				this.obsElms[i].setPivotConfig(this.pivotX, this.pivotY);
				this.obsElms[i].onResize(width, height-this.detailsViewHeight);
			}
			for (var i=0; i<this.tunElms.length; i++) {
				this.tunElms[i].setPivotConfig(this.pivotX, this.pivotY);
				this.tunElms[i].onResize(width, height-this.detailsViewHeight);
			}

			// Resize pin view
			this.pinViewComponent.onResize(width, this.detailsViewHeight);

			// Update horizon
			this.forwardHorizon();

		}

		/**
		 * Rebuild level screen before showing
		 */
		TuningScreen.prototype.onWillShow = function(cb) {
			this.onSelectLevel( DB.userRecord.data.level || 0 );
			cb();
		}

		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		////                    FUNCTIONALITY IMPLEMENTATION                       ////
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////

		/**
		 * Build a key/value dictionary with the values of all of my tunables
		 */
		TuningScreen.prototype.getValueMap = function() {
			var ans = {};
			for (var i=0; i<this.tunElms.length; i++) {
				var k = this.tunElms[i].meta['info']['name'],
					v = this.tunElms[i].getValue();
				ans[k] = v;
			}
			return ans;
		}

		/**
		 * Activate a particlar track of tunables
		 */
		TuningScreen.prototype.focusTunableRing = function(id) {
			for (var j=0; j<this.tunablesLevelRings.length; j++) {
				for (var i=0; i<this.tunablesLevelRings[j].length; i++) {
					this.tunablesLevelRings[j][i].setActive( j == id );
				}
				for (var i=0; i<this.observablesLevelRings[j].length; i++) {
					this.observablesLevelRings[j][i].setActive( j == id );
				}
			}
		}

		/**
		 * Forward the horizon update
		 */
		TuningScreen.prototype.forwardHorizon = function() {
			var vOffs = -parseInt( this.hostTuning.css("top") );
			for (var i=0; i<this.obsElms.length; i++) {
				this.obsElms[i].onHorizonTopChanged(vOffs + this.height - this.detailsViewHeight);
			}
			for (var i=0; i<this.tunElms.length; i++) {
				this.tunElms[i].onHorizonTopChanged(vOffs + this.height - this.detailsViewHeight);
			}
		}

		/**
		 * Handle an update on a particular parameter
		 */
		TuningScreen.prototype.handleParameterUpdate = function( parameter, value ) {
			// Update the value of the parameter
			this.parameters[parameter] = value;
			// Notify listeners for a change
			this.trigger("changeParameters", this.parameters);
		}


		// Register screen component on the registry
		R.registerComponent( 'screen.tuning', TuningScreen, 1 );

	}

);