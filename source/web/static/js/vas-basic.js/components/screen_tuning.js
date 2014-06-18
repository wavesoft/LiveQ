

define(["jquery", "core/registry", "core/components", "core/db"], 

	/**
	 * Basic version of the home screen
	 *
	 * @exports basic/components/tuning_screen
	 */
	function($, R, C, DB) {

		/**
		 * Tuning dashboard screen
		 */
		var TuningScreen = function(hostDOM) {
			C.TuningScreen.call(this, hostDOM);

			// Prepare host elements
			this.host = hostDOM;
			this.hostControls = $('<div class="tune-controls"></div>');
			this.hostLevels = $('<div class="tune-levels"></div>');
			this.host.append(this.hostControls);
			this.host.append(this.hostLevels);
			this.host.addClass("tuning");

			// Prepare fields
			this.tunables = {};
			this.observables = {};
			this.parameters = {};

			// Indexing for the UI widgets
			this.tuneWidgets = {};
			this.observeWidgets = {};

			// Fetch configuration from database
			var self = this;
			DB.openDatabase("tunables").all(function(tunables) {
				if (!tunables) return;
				self.defineTunables(tunables);
			});
			DB.openDatabase("observables").all(function(observables) {
				if (!observables) return;
				self.defineObservables(observables);
			});
			DB.openDatabase("observables").all(function(observables) {
				if (!observables) return;
				self.defineObservables(observables);
			});

		}
		TuningScreen.prototype = Object.create( C.TuningScreen.prototype );

		/**
		 * Define the tunable configuration
		 *
		 * @param {array} tunables - A list of Tunable classes, one for each tunable.
		 */
		TuningScreen.prototype.defineTunables = function(tunables) {
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
		TuningScreen.prototype.defineObservables = function(observables) {
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
		TuningScreen.prototype.defineLevel = function(levelInfo) {
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
		TuningScreen.prototype.setLevel = function( targetLevel ) {

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