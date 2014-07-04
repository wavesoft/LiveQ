
/**
 * [core/main] - Core initialization module
 */
define(

	["jquery", "core/config",  "core/registry", "core/ui", "core/db", "core/base/components", "core/util/progress_aggregator"], 

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
					UI.selectScreen(to, UI.Transitions.ZOOM_OUT);
				});

			}

			// Break down initialization process in individual chainable functions
			var prog_db = progressAggregator.begin(5),
				init_db = function(cb) {
					var c = 5;

					var dTunables = DB.openDatabase("tunables").all(function(tunables) {
						prog_db.ok("Fetched tunable configuration");
						DB.cache['tunables'] = tunables;
						if (--c == 0) cb();
					});

					var dObservables = DB.openDatabase("observables").all(function(observables) {
						prog_db.ok("Fetched observable configuration");
						DB.cache['observables'] = observables;
						if (--c == 0) cb();
					});


					var dLevels = DB.openDatabase("levels").all(function(levels) {
						prog_db.ok("Fetched tunable parameters");

						// Build a lookup index
						var keys={}, index=[];
						for (var i=0; i<levels.length; i++) {
							if (levels[i]['_id'] == "index") {
								index = levels[i]['levels'];
							} else {
								keys[levels[i]['_id']] = levels[i];
							}
						}

						// Get levels
						var usableLevels = [];
						for (var i=0; i<index.length; i++) {
							usableLevels.push( keys[index[i]] );
						}

						// Cache levels
						DB.cache['levels'] = usableLevels;
						if (--c == 0) cb();
					});

					var dScenes = DB.openDatabase("scenes").all(function(scenes) {
						prog_db.ok("Fetched scene configuration");
						DB.cache['scenes'] = scenes;
						if (--c == 0) cb();
					});

					var dDefinitions = DB.openDatabase("definitions").all(function(definitions) {
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

			var prog_login = progressAggregator.begin(1),
				init_login = function(cb) {
					var scrLogin = UI.initAndPlaceScreen("screen.login");
					if (!scrLogin) {
						console.error("Core: Unable to initialize login screen!");
						return;
					}

					// Bind events
					scrLogin.on('login', function(user, password) {
						DB.authenticateUser(user, password, function(status, data) {
							if (!status) {
								alert("Could not log-in! " + data);
							} else {
								UI.selectScreen("screen.home");
							}
						});
					});
					scrLogin.on('register', function(user, password) {
						DB.createUser(user, password, function(status, data) {
							if (!status) {
								alert("Could not create account! " + data);
							} else {
								UI.selectScreen("screen.home");
							}
						});
					});

					// Complete login
					prog_login.ok("Home screen ready");
					cb();
				};

			var prog_home = progressAggregator.begin(1),
				init_home = function(cb) {
					var scrHome = UI.initAndPlaceScreen("screen.home");
					if (!scrHome) {
						console.error("Core: Unable to initialize home screen!");
						return;
					}

					// Bind events
					scrHome.on('changeScreen', function(name) {
						UI.selectScreen(name);
					});

					// Complete home
					prog_home.ok("Home screen ready");
					cb();
				};

			var prog_run = progressAggregator.begin(1),
				init_run = function(cb) {
					var scrHome = UI.initAndPlaceScreen("screen.running");
					if (!scrHome) {
						console.error("Core: Unable to initialize run screen!");
						return;
					}

					// Bind events
					scrHome.on('abortRun', function() {
						UI.selectScreen("screen.tuning");
					});

					// Complete run
					prog_run.ok("Run screen ready");
					cb();
				};

			var prog_explain = progressAggregator.begin(1),
				init_explain = function(cb) {

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
					scrExplain.onMachineLayoutDefined( diagram.layout );

					// Complete explain
					prog_explain.ok("Explaination screen ready");
					cb();
				};

			var prog_tune = progressAggregator.begin(1),
				init_tune = function(cb) {

					// Create tuning screen
					var scrTuning = UI.initAndPlaceScreen("screen.tuning", Components.TuningScreen);
					if (!scrTuning) {
						console.error("Core: Unable to initialize explaination screen!");
						return;
					}

					// Initialize tuning screen
					scrTuning.onTunablesDefined( DB.cache['tunables'] );
					scrTuning.onObservablesDefined( DB.cache['observables'] );
					scrTuning.onLevelsDefined( DB.cache['levels'] );

					// Bind events
					scrTuning.on('explainParameter', function(parameter) {
						UI.selectScreen("screen.explain")
							.onParameterFocus(parameter);
					});
					scrTuning.on('submitParameters', function(parameters) {
						UI.selectScreen("screen.running", UI.Transitions.ZOOM_OUT);
					});

					// Complete tuning
					prog_tune.ok("Tuning screen ready");
					cb();

				};

			// Wait some time for the background resources to load
			setTimeout(function() {

				var chainRun = [
						init_db, init_home, init_login, init_explain, init_tune, init_run
					],
					runChain = function(cb, index) {
						var i = index || 0;
						console.log("---",i);

						// If we run out of chain, run callback
						if (i >= chainRun.length) {
							cb();
							return;
						}

						// Run function in chain and call next function when completed
						chainRun[i](function() { runChain(cb, i+1); })
					};

				// Run chained functions
				runChain(function() {

					// We are initialized, register an away alerter
					$(window).bind('beforeunload', function() {
						return "Navigating away will stop your current game session.";
					});

				});

			}, 500)


		}

		/**
		 * Initialize VAS with the given game configuration and run
		 */
		VAS.run = function() {

			// Run main game
			UI.selectScreen( "screen.login" );

		}

		return VAS;
	}

);