

define(

	/**
	 * Dependencies
	 */
	["jquery", "core/config", "core/registry", "core/base/components", "core/db", 

	 // Self-registering dependencies
	 "jquery-knob"], 

	/**
	 * Basic version of the home screen
	 *
	 * @exports vas-basic/components/tuning_screen
	 */
	function($, config, R, C, DB) {

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

			// Initialize host DOM
			hostDOM.addClass("tuning");

			// Create a slpash backdrop
			this.backdropDOM = $('<div class="'+config.css['backdrop']+'"></div>');
			hostDOM.append(this.backdropDOM);
			this.backdrop = R.instanceComponent("backdrop.tuning", this.backdropDOM);

			// Create foreground
			this.foregroundDOM = $('<div class="'+config.css['foreground']+'"></div>');
			hostDOM.append(this.foregroundDOM);

			// Prepare host elements
			this.hostTuning = $('<div class="tuning-host"></div>');
			this.hostControls = $('<div class="tune-controls"></div>');
			this.hostLevels = $('<div class="tune-levels"></div>');
			this.foregroundDOM.append(this.hostTuning);
			this.foregroundDOM.append(this.hostControls);
			this.foregroundDOM.append(this.hostLevels);

			// Prepare mouse events
			this.mouse = { x:0 , y:0 };
			this.foregroundDOM.mousemove(function(e) {
				var yPosition = 300,
					mouseX = 0,
					mouseY = 0;

				// Calculate mouse offset
				mouseX = (e.clientX - self.width/2) / (self.width/2);
				if (e.clientY > yPosition) {
					mouseY = (e.clientY - yPosition) / (self.height - yPosition);
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

			// Prepare pop-up drawer
			this.popupOnScreen = R.instanceComponent( "widget.onscreen.default", this.hostTuning );
			if (!this.popupOnScreen)
				console.warn("Unable to instantiate onscreen description element");

			// Prepare main screen
			this.obsAngleSpan = Math.PI;
			this.obsWideSpan = 0;
			this.obsMinDistance = 400;
			this.obsMaxDistance = 600;

			this.tunAngleSpan = Math.PI*3/2;
			this.tunWideSpan = 0;
			this.tunMinDistance = 150;
			this.tunMaxDistance = 350;

			this.prepareMainScreen();

			// Prepare fields
			this.tunables = {};
			this.observables = {};
			this.parameters = {};

			// Indexing for the UI widgets
			this.tuneWidgets = {};
			this.observeWidgets = {};

		}
		TuningScreen.prototype = Object.create( C.TuningScreen.prototype );

		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		////                      INTERFACE DESIGN FUNCTIONS                       ////
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////


		/**
		 * Create an tunable widget
		 */
		TuningScreen.prototype.createTunable = function( angle, level, metadata ) {

			// Try to instantiate the observable component
			var e = R.instanceComponent("widget.tunable.default", this.hostTuning );
			if (!e) {
				console.warn("Unable to instantiate a tuning widget!");
				return undefined;
			}

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
				for (var i=0; i<this.obsElms.length; i++) {
					this.obsElms[i].onUpdate(Math.random());
				}
			}).bind(this));

			// Set default values
			e.onMetadataUpdate( metadata );
			e.onUpdate(0.000);

			return e;

		}

		/**
		 * Create an observable widget
		 */
		TuningScreen.prototype.createObservable = function( angle, metadata ) {

			// Try to instantiate the observable component
			var e = R.instanceComponent("widget.observable.default", this.hostTuning );
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

		/**
		 * Design the main user interface
		 */
		TuningScreen.prototype.prepareMainScreen = function() {
			var self = this;

			// Calculate pivot point
			this.pivotX = this.width / 2;
			this.pivotY = 150;

			// Prepare observable parameters
			this.obsElms = [];
			this.observablesLevelRings = [];

			// Create observables for 10 levels
			for (var j=0; j<10; j++) {
				var ring = [];

				var aNum = parseInt(Math.random() * 10),
					aStep = this.obsAngleSpan / (aNum+1),
					aVal = -this.obsAngleSpan / 2;

				for (var i=0; i<aNum; i++) {
					var o = this.createObservable(
							(aVal += aStep),
							{ 
								'info': {
									'short': 'O'+i,
									'name' : 'Observable #'+i,
									'book' : 'book-'+i
								}
							}
						);

					// Store on observable elements
					if (!o) continue;
					this.obsElms.push( o );

					// Bind on tune rings
					o.on('click', (function(ring) {
						return function() {
							this.focusTunableRing( ring );
						}
					})(j).bind(this));

					o.setActive( j == 0 );
					ring.push( o );

				}

				this.observablesLevelRings.push(ring);
			}

			//////////////////////////////////////////////////////

			// Prepare tunable parameters
			this.tunElms = [];
			this.tunablesLevelRings = [];

			// Create tunables
			var tVal = this.tunMinDistance, tStep = (this.tunMaxDistance - this.tunMinDistance) / 10;
			for (var j=0; j<10; j++) {

				var levData = [],
					aNum = parseInt(Math.random() * 10),
					aStep = this.tunAngleSpan / (aNum+1);
					aVal = -this.tunAngleSpan / 2;

				for (var i=0; i<aNum; i++) {
					var o = this.createTunable(
							(aVal += aStep),
							tVal,
							{
								'value': {
									'min'  : 0,
									'max'  : 10,
									'dec'  : 2,
								},
								'info': {
									'short': 'T'+i,
									'name' : 'Tunable #'+i,
									'book' : 'book-'+i
								}
							}
						);
					if (!o) return;

					// Activate the first level
					o.setActive( j == 0 );

					this.tunElms.push( o );

					// Bind on tune rings
					levData.push(o);
					o.on('click', (function(ring) {
						return function() {
							this.focusTunableRing( ring );
						}
					})(j).bind(this));

				}

				// Update tunable level rings
				this.tunablesLevelRings.push(levData);
				tVal += tStep;

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
				this.tunables[tunables[i].id] = tunables[i];
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
				this.observables[observables[i].id] = observables[i];
			}
		}

		/**
		 * Define the level structure information
		 * (MUST be called after the setTunables/setObservables) function calls.
		 */
		TuningScreen.prototype.onLevelsDefined = function(levelInfo) {
			this.levels = [];

			// Prepare level records
			for (var i=0; i<levelInfo.length; i++) {
				var level = Object.create(levelInfo[i]);

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

		}


		/**
		 * Select an enable interface controls for the specified level
		 */
		TuningScreen.prototype.onSelectLevel = function( targetLevel ) {

			// Reset
			this.hostLevels.empty();
			this.parameters = {};
			this.tuneWidgets = {};
			this.observeWidgets = {};

			// Check for valid syntax
			if (targetLevel >= this.levels.length) {
				console.warn("Level #",targetLevel," is not defined! Falling back to",this.levels.length-1);
				targetLevel = this.levels.length-1;
			}

			// Rebuild level objects
			for (var i=targetLevel; i>=0; i--) {
				var levelElm = $('<div class="tune-level"></div>'),
					tunablesElm = $('<div class="tunables"></div>'),
					observablesElm = $('<div class="observables"></div>'),
					level = this.levels[i];

				// Nest elements
				this.hostLevels.append(levelElm);
				levelElm.append(tunablesElm);
				levelElm.append(observablesElm);

				// Build tunable UI
				for (var j=0; j<level.tun.length; j++) {
					var  tun = level.tun[j],
						 tunElm = $('<div class="tunable"></div>');

					// Nest widget on DOM (required for widgets that require a DOM
					// presence before initialization).
					tunablesElm.append(tunElm);

					// Try to create the widget for this tunable
					var tunWidget = R.instanceComponent("widget.tune." + tun.type, tunElm );
					if (tunWidget == undefined) {
						console.warn("Missing widget component 'widget.tune."+tun.type+"'");
						tunElm.remove();
						continue;
					}

					// Update widget metadata
					tunWidget.onMetadataUpdate( tun.meta );

					// Reset to default
					tunWidget.onUpdate( tun.def );

					// Register an event listener to update the parameters as required
					tunWidget.on('valueChanged', 
						(function(self, name) { // Wrap context for inline-function
							return function(value) {
								// Handle parameter update
								self.handleParameterUpdate(name, value);
							};
						})(this, tun.id)
					);

					// Store default parameter value
					this.parameters[ tun.id ] = tun.def;

					// Keep reference
					this.tuneWidgets[ tun.id ] = tunWidget;

				}

				// Build observable UI
				for (var j=0; j<level.obs.length; j++) {
					var  obs = level.obs[j],
						 obsElm = $('<div class="observable"></div>');

					// Nest widget on DOM (required for widgets that require a DOM
					// presence before initialization).
					observablesElm.append(obsElm);

					// Try to create the widget for this tunable
					var obsWidget = R.instanceComponent("widget.observe." + obs.type, obsElm );
					if (obsWidget == undefined) {
						console.warn("Missing widget component 'widget.observe."+obs.type+"'");
						tunElm.remove();
						continue;
					}

					// Update widget metadata
					obsWidget.onMetadataUpdate( obs.meta );

					// Reset to default
					obsWidget.onUpdate( undefined );

					// Keep reference
					this.observeWidgets[ tun.id ] = obsWidget;

				}

			}

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
			this.statusWidget.onResize(width,height);
			for (var i=0; i<this.obsElms.length; i++) {
				this.obsElms[i].setPivotConfig(this.pivotX, this.pivotY);
				this.obsElms[i].onResize(width, height);
			}
			for (var i=0; i<this.tunElms.length; i++) {
				this.tunElms[i].setPivotConfig(this.pivotX, this.pivotY);
				this.tunElms[i].onResize(width, height);
			}

			// Update horizon
			this.forwardHorizon();

		}

		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		////                    FUNCTIONALITY IMPLEMENTATION                       ////
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////

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
				this.obsElms[i].onHorizonTopChanged(vOffs + this.height);
			}
			for (var i=0; i<this.tunElms.length; i++) {
				this.tunElms[i].onHorizonTopChanged(vOffs + this.height);
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