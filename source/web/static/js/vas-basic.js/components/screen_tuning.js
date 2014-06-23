

define(["jquery", "core/config", "core/registry", "core/components", "core/db"], 

	/**
	 * Basic version of the home screen
	 *
	 * @exports basic/components/tuning_screen
	 */
	function($, config, R, C, DB) {

		/**
		 * Tuning dashboard screen
		 */
		var TuningScreen = function(hostDOM) {
			C.TuningScreen.call(this, hostDOM);

			// Initialize host
			hostDOM.addClass("tuning");
			this.host = hostDOM;
			window.ts = this;

			// Create a slpash backdrop
			this.backdropDOM = $('<div class="'+config.css['backdrop']+'"></div>');
			hostDOM.append(this.backdropDOM);
			this.backdrop = R.instanceComponent("backdrop.tuning", this.backdropDOM);

			// Create foreground
			this.foregroundDOM = $('<div class="'+config.css['foreground']+'"></div>');
			hostDOM.append(this.foregroundDOM);

			// Prepare host elements
			this.hostControls = $('<div class="tune-controls"></div>');
			this.hostLevels = $('<div class="tune-levels"></div>');
			this.foregroundDOM.append(this.hostControls);
			this.foregroundDOM.append(this.hostLevels);

			// Prepare main screen
			this.obsAngleSpan = Math.PI*3/4;
			this.obsWideSpan = 400;
			this.obsMinDistance = 200;
			this.obsMaxDistance = 600;
			this.obsValBounds = [0.33, 0.66];
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
		 * Design the main user interface
		 */
		TuningScreen.prototype.prepareMainScreen = function() {

			// Create arbitrary observables
			this.obsElms = [];
			var aStep = this.obsAngleSpan / 20,
				aVal = 0;

			// Create observables
			for (var i=0; i<20; i++) {
				var e = $('<div class="observable sz-big">'+i+'</div>');
				this.foregroundDOM.append(e);
				this.obsElms.push({
					'elm': e,
					'ang': aVal += aStep,
					'val': Math.random()
				});
			}

			// Realign observables
			this.realignObservables();

		}

		/**
		 * Realign observables
		 */
		TuningScreen.prototype.realignObservables = function() {

			var cX = this.width / 2, cY = 150,
				aOfs = this.obsAngleSpan/2,
				xStep = this.obsWideSpan/this.obsElms.length,
				xPos = -this.obsWideSpan/2;

			for (var i=0; i<this.obsElms.length; i++) {
				var o = this.obsElms[i],
					r = o.val * (this.obsMaxDistance - this.obsMinDistance),
					sz = o.elm.width();

				// Pick classes
				o.elm.removeClass(); o.elm.addClass("observable");
				if (o.val < this.obsValBounds[0]) {
					o.elm.addClass("val-bd");
					sz = 64;
				} else if (o.val < this.obsValBounds[1]) {
					o.elm.addClass("val-md");
					sz = 32;
				} else {
					o.elm.addClass("val-gd");
					sz = 24;
				}

				// Get dimentions
				o.elm.css({
					'left': cX + Math.sin(o.ang-aOfs) * (r+this.obsMinDistance) + xPos - sz/2,
					'top':  cY + Math.cos(o.ang-aOfs) * (r+this.obsMinDistance) - sz/2,
				});

				xPos += xStep;
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
					tunWidget.onMetaUpdate( tun.meta );

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
					obsWidget.onMetaUpdate( obs.meta );

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
		TuningScreen.prototype.onResize = function(width, heigth) {
			this.width = width;
			this.heigth = heigth;

			this.realignObservables();
		}

		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		////                    FUNCTIONALITY IMPLEMENTATION                       ////
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////

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