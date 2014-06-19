
/**
 * [core/main] - Core initialization module
 */
define(

	["jquery", "core/config",  "core/registry", "core/UI", "core/db", "core/components", "core/util/progress_aggregator"], 

	function($, config, R, UI, DB, Components, ProgressAggregator) {
		var VAS = { };

		/**
		 * Initialize VAS to the given DOM element
		 */
		VAS.initialize = function( readyCallback ) {

			// Absolutely minimum UI initializations
			UI.initialize();

			// Prepare progress screen
			var scrProgress = UI.initAndPlaceScreen("screen.progress", Components.ProgressScreen);
			if (!scrProgress) {
				console.error("Core: Unable to initialize progress screen!");
				return;
			}

			// Prepare progress aggregator
			var progressAggregator = new ProgressAggregator();
			progressAggregator.on('progress', function(progress, message){ scrProgress.onProgress(progress, message); });
			progressAggregator.on('error', function(message){ scrProgress.onProgressError(message); });
			progressAggregator.on('completed', function(){
				scrProgress.onProgressCompleted(); 
				if (readyCallback) readyCallback();
			});

			// Create the mini-nav menu
			var mininavDOM = $('<div class="'+config.css['nav-mini']+'"></div>');
			UI.host.append(mininavDOM);
			
			// Try to create mini-nav
			UI.mininav = R.instanceComponent("nav.mini", mininavDOM);
			if (UI.mininav !== undefined) {

				// Check for preferred dimentions
				var dim = UI.mininav.getPreferredSize();
				if (dim != undefined) {
					mininavDOM,css({
						'width': dim[0],
						'height': dim[1]
					});
					UI.mininav.onResize( dim[0], dim[1] );
				} else {
					UI.mininav.onResize( mininavDOM.width(), mininavDOM.height() );
				}

				// Bind events
				UI.mininav.on("changeScreen", function(to) {
					UI.selectScreen(to);
				});

			}

			// Create some generic screens
			UI.initAndPlaceScreen("screen.home");
			UI.initAndPlaceScreen("screen.running");

			// Break down initialization process in individual chainable functions
			var prog_db = progressAggregator.begin(5),
				init_db = function(cb) {
					var c = 5;

					DB.openDatabase("tunables").all(function(tunables) {
						prog_db.ok("Fetched tunable configuration");
						DB.cache['tunables'] = tunables;
						if (--c == 0) cb();
					});

					DB.openDatabase("observables").all(function(observables) {
						prog_db.ok("Fetched observable configuration");
						DB.cache['observables'] = observables;
						if (--c == 0) cb();
					});

					DB.openDatabase("levels").all(function(levels) {
						prog_db.ok("Fetched tunable parameters");
						DB.cache['levels'] = levels;
						if (--c == 0) cb();
					});

					DB.openDatabase("scenes").all(function(scenes) {
						prog_db.ok("Fetched scene configuration");
						DB.cache['scenes'] = scenes;
						if (--c == 0) cb();
					});

					DB.openDatabase("definitions").all(function(definitions) {
						prog_db.ok("Fetched definitions");

						// Convert definitions to key-based index
						var def = {};
						for (var i=0; i<definitions.length; i++) {
							def[definitions[i]._id] = definitions[i];
						}

						// Update definitions
						DB.cache['definitions'] = def;
						if (--c == 0) cb();
					});

				};

			var prog_explain = progressAggregator.begin(1),
				init_explain = function() {

					// Create explain screen
					var scrExplain = UI.initAndPlaceScreen("screen.explain", Components.ExplainScreen);
					if (!scrExplain) {
						console.error("Core: Unable to initialize explaination screen!");
						return;
					}

					// Initialize explain screen
					scrExplain.onTunablesDefined( DB.cache['tunables'] );
					scrExplain.onObservablesDefined( DB.cache['observables'] );
					scrExplain.onScenesDefined( DB.cache['scenes'] );

					// Check for machine layout
					var diagram = DB.cache['definitions']['machine-diagram'] || { layout: [] };
					console.log(DB.cache['definitions']);
					scrExplain.onMachineLayoutDefined( diagram.layout );

					// Complete explain
					prog_explain.ok("Initialized explaination screen");

				};

			var prog_tune = progressAggregator.begin(1),
				init_tune = function() {

					// Create tuning screen
					var scrTuning = UI.initAndPlaceScreen("screen.tuning", Components.ExplainScreen);
					if (!scrTuning) {
						console.error("Core: Unable to initialize explaination screen!");
						return;
					}

					// Initialize tuning screen
					scrTuning.onTunablesDefined( DB.cache['tunables'] );
					scrTuning.onObservablesDefined( DB.cache['observables'] );
					scrTuning.onLevelsDefined( DB.cache['levels'] );

					// Complete tuning
					prog_tune.ok("Initialized tuning screen");

				};


			// Start initialization from the database
			init_db(function() {

				// Then initialize explain & tune screens
				init_explain();
				init_tune();

			});


		}

		/**
		 * Initialize VAS with the given game configuration and run
		 */
		VAS.run = function() {

			// Run main game
			UI.selectScreen( "screen.explain" );

		}

		return VAS;
	}

);