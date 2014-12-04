
/**
 * [core/main] - Core initialization module
 */
define(

	["jquery", "core/config",  "core/registry", "core/ui", "core/db", "core/user", "core/apisocket", "core/base/components", "core/util/progress_aggregator", "liveq/core", "liveq/Calculate" ], 

	function($, config, R, UI, DB, User, APISocket, Components, ProgressAggregator, LiveQCore, LiveQCalc) {
		var VAS = { };

		/**
		 * Helper dummy progress updater
		 */
		var _DummyRunner_ = function() {
			this.onUpdate = null;
			this.onCompleted = null;
			this.progress = 0;
			this.started = false;
			this.data = null;

			// Progress step
			this.step = function() {
				this.progress += 0.01;
				if (this.progress>=1) {
					this.progress = 1;
					if (this.onCompleted) this.onCompleted();
				} else {
					setTimeout(this.step.bind(this), 100);
				}
				if (this.onUpdate) this.onUpdate( this.data, this.progress );
			}

			// Progress start
			this.start = function() {
				if (this.started) return;
				this.started = true;
				this.step();
			}

		};

		/**
		 * Override error logging from UI
		 */
		UI.logError = function( message, critical ) {

			if (critical) {
				console.error(message);

				// Display BSOD if critical
				var bsod = UI.selectScreen("screen.bsod");
				if (bsod) bsod.onBSODDefined(message, '<span class="glyphicon glyphicon-off"></span>');

				// Hide overlay
				UI.hideOverlay();

				// Enter UI Lockdown
				UI.lockdown = true;

				// Don't alert on unload
				VAS.alertUnload = false;

			} else {
				console.warn(message);

				// Otherwise display a growl
				UI.growl(message, "alert");
			}

		}

		/**
		 * Initialize VAS to the given DOM element
		 */
		VAS.initialize = function( readyCallback ) {

			// Absolutely minimum UI initializations
			UI.initialize();

			window.vas = this;

			// Prepare properties
			VAS.alertUnload = false;
			VAS.referenceHistograms = null;
			VAS.activeTask = "";
			VAS.activeTopic = "";
			VAS.runningTask = "";
			VAS.runningTopic = "";

			// Prepare core screens
			var scrProgress = UI.initAndPlaceScreen("screen.progress", Components.ProgressScreen);
			if (!scrProgress) {
				UI.logError("Core: Unable to initialize progress screen!");
				return;
			}
			var scrBSOD = UI.initAndPlaceScreen("screen.bsod", Components.BSODScreen);
			if (!scrBSOD) {
				UI.logError("Core: Unable to initialize BSOD screen!");
				return;
			}

			// Prepare progress aggregator
			var progressAggregator = new ProgressAggregator();
			progressAggregator.on('progress', function(progress, message){ scrProgress.onProgress(progress, message); });
			progressAggregator.on('error', function(message){ scrProgress.onProgressError(message); UI.logError(message); });
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
					if (to == "screen.home") {
						VAS.displayHome(true);
					} else {
						UI.selectScreen(to, UI.Transitions.ZOOM_OUT);
					}
				});
				// Bind events
				UI.mininav.on("displayKnowledge", function(to) {
					VAS.displayKnowledge();
				});
				UI.mininav.on("displayTuningScreen", function(to) {
					VAS.displayTuningScreen();
				});

			}

			// Add CernVM WebAPI script to the main page
			$('head').append('<script type="text/javascript" src="http://cernvm.cern.ch/releases/webapi/js/cvmwebapi-latest.js"></script>');

			// Listen to global user events
			User.on('notification', function(message, type) {
				UI.growl(message, 5000, type || "success")
			});
			User.on('flash', function(title,body,icon) {
				UI.showFlash(title, body, icon);
			});


			// Break down initialization process in individual chainable functions
			var prog_db = progressAggregator.begin(7),
				init_db = function(cb) {
					var sequence = [

							// It's not a good idea to saturate the bandwidth of CouchDB, therefore
							// we are executing our fetches in sequence.

							function(cb) {

								// Fetch & cache tunables
								DB.getAll("tunables", "object", function(tunables) {
									prog_db.ok("Fetched tunable configuration");
									cb();
								});

							},
							function(cb) {

								// Fetch & cache observables
								DB.getAll("observables", "object", function(tunables) {
									prog_db.ok("Fetched observable configuration");
									cb();
								});

							},
							function(cb) {

								var dScenes = DB.openDatabase("topic_map").all(function(topic_map) {
									prog_db.ok("Fetched topic map");

									// Prepare topics
									DB.cache['topics'] = topic_map;
									DB.cache['topic_root'] = null;

									// Prepare index
									DB.cache['topic_index'] = { };
									for (var i=0; i<topic_map.length; i++) {
										var o = topic_map[i];

										// Prepare children array
										o.children = [];

										// Store on lookup index
										DB.cache['topic_index'][ o['_id'] ] = o;

										// Lookup root
										if (!o['parent']) DB.cache['topic_root'] = o;
									}

									// Traverse again the topics map and populate
									// children array for forward tree tranversal
									for (var i=0; i<topic_map.length; i++) {
										var o = topic_map[i];
										if (o['parent'])
											DB.cache['topic_index'][o['parent']].children.push( o );
									}

									cb();
								});


							},
							function(cb) {

								DB.getAll("knowlege_grid", "tree", function(grid) {
									prog_db.ok("Fetched knowledge grid");
									cb();
								});

							},
							function(cb) {

								var dScenes = DB.openDatabase("tasks").all(function(tasks) {
									prog_db.ok("Fetched tasks");

									DB.cache['tasks'] = { };
									for (var i=0; i<tasks.length; i++) {
										DB.cache['tasks'][tasks[i]['_id']] = tasks[i];
									}
									cb();
								});


							},
							function(cb) {

								var dDefinitions = DB.openDatabase("first_time").all(function(definitions) {
									prog_db.ok("Fetched first-time definitions");

									// Convert definitions to key-based index
									var def = {};
									for (var i=0; i<definitions.length; i++) {
										def[definitions[i]._id] = definitions[i];
									}

									// Update definitions
									DB.cache['first_time'] = def;
									cb();
								});

							},
							function(cb) {

								var dDefinitions = DB.openDatabase("definitions").all(function(definitions) {
									prog_db.ok("Fetched definitions");

									// Convert definitions to key-based index
									var def = {};
									for (var i=0; i<definitions.length; i++) {
										def[definitions[i]._id] = definitions[i];
									}

									// Update definitions
									DB.cache['definitions'] = def;
									cb();
								});

							}
						],
						seq_index = 0,
						seq_next = function() {
							if (seq_index >= sequence.length) {
								cb();
							} else {
								sequence[seq_index]( seq_next );
								seq_index += 1;
							}
						};

					// Start sequence
					seq_next();

				};

			var prog_api = progressAggregator.begin(1),
				init_api = function(cb) {

					// Register core handlers
					APISocket.on('ready', function() {
						// API socket ready
						prog_api.ok("Core I/O socket initialized");
						cb();
					});
					APISocket.on('error', function(message) {
						// Generic error message from the socket
						UI.logError('I/O Error: '+message);
					});

					// Critical socket error
					APISocket.on('critical', function(message) {
						// API socket error
						UI.logError(message, true);
						prog_api.fail("Could not initialize core I/O socket!" + message, true);
					});

					// Growl notificataions
					APISocket.on('notification', function(message, type) {
						UI.growl(message, type)
					});

					// Connect to core socket
					APISocket.connect( config.core.socket_url );

				};

			var prog_login = progressAggregator.begin(1),
				init_login = function(cb) {

					var scrLogin = UI.initAndPlaceScreen("screen.login");
					if (!scrLogin) {						
						UI.logError("Core: Unable to initialize login screen!");
						return;
					}

					// Bind events
					scrLogin.on('login', function(user, password) {
						User.login({
							'username' : user,
							'password' : password
						}, function(status, errorMsg) {
							if (!status) {
								UI.growl("Could not log-in! "+errorMsg, "alert")
							} else {

								// Alert on unload
								VAS.alertUnload = true;

								// User is logged-in, check if he has sheen the introduction
								// sequence
								if (!User.isFirstTimeSeen("intro")) {
										// Display the intro sequence
										UI.displaySequence( DB.cache['definitions']['intro-sequence']['sequence'] , function() {
											// Mark introduction sequence as shown
											User.markFirstTimeAsSeen("intro");
											// Display home page
											VAS.displayTuningScreen();
										});
								} else {
									VAS.displayTuningScreen();
								}

							}
						});
					});
					scrLogin.on('register', function(user, password) {
						UI.showOverlay("screen.register", function(scrRegister) {

							// On cancel just hide
							scrRegister.on('cancel', function() {
								UI.hideOverlay();
							});

							// Handle register event
							scrRegister.on('register', function(profile) {

								// Try registering the user
								User.register(profile, function(status, errorMsg) {
									if (!status) {
										scrRegister.onRegistrationError(errorMsg);
									} else {

										/////////////
										// The user is registered and logged in
										/////////////

										// Hide overlay
										UI.hideOverlay();

										// Display the intro sequence
										UI.displaySequence( DB.cache['definitions']['intro-sequence']['sequence'] , function() {
											// Mark introduction sequence as shown
											User.markFirstTimeAsSeen("intro");
											// Display home page
											VAS.displayTuningScreen();
										});
									}
								});

							});

						});
					});
					// Complete login
					prog_login.ok("Home screen ready");
					cb();
				};

			var prog_tutorials = progressAggregator.begin(1),
				init_tutorials = function(cb) {

					// Tutorial screens
					var tutScreens = [
						'screen.tutorial.stats'
					];

					// Iterate over tutorial screens
					for (var i=0; i<tutScreens.length; i++) {

						// Init and place tutorial screen
						var scrTutorial = UI.initAndPlaceScreen(tutScreens[i]);
						if (!scrTutorial) {						
							UI.logError("Core: Unable to initialize tutorial screen '"+tutScreens[i]+"'!");
							return;
						}

						// Check tutorial feedback
						scrTutorial.on('submit', function(value) {
							if (value >= 0.5) {
								VAS.displayHome();
							} else {
								VAS.displayCinematic( function() {
									
								});
							}
						});

					}

					// Tutorial screens are ready
					prog_tutorials.ok("Tutorial screens ready");
					cb();
				};

			var prog_results = progressAggregator.begin(1),
				init_results = function(cb) {
					var scrResults = VAS.scrResults = UI.initAndPlaceScreen("screen.results");
					if (!scrResults) {
						UI.logError("Core: Unable to initialize results screen!");
						return;
					}

					// Bind events
					scrResults.on('hideResults', function() {
						UI.selectPreviousScreen()
					});

					// Complete login
					prog_results.ok("Results screen ready");
					cb();
				};	

			var prog_team = progressAggregator.begin(1),
				init_team = function(cb) {

					// Prepare team screens
					var teamScreens = [
						"screen.team.people", "screen.team.machines", "screen.team.notebook",
						"screen.team.messages"
					];

					for (var i=0; i<teamScreens.length; i++) {
						var scr = UI.initAndPlaceScreen(teamScreens[i]);
						if (!scr) {
							UI.logError("Core: Unable to initialize screen "+teamScreens[i]+"!");
							return;
						}

						scr.on("changeScreen", function(scr, transition) {
							UI.selectScreen(scr, transition);
						});
					}

					// Complete login
					prog_team.ok("Team screens ready");
					cb();
				};				

			var prog_home = progressAggregator.begin(1),
				init_home = function(cb) {
					var scrHome = VAS.scrHome = UI.initAndPlaceScreen("screen.home");
					if (!scrHome) {
						UI.logError("Core: Unable to initialize home screen!");
						return;
					}

					// Bind events
					scrHome.on('changeScreen', function(name) {
						UI.selectScreen(name);
					});
					scrHome.on('explainTopic', function(topic_id) {
						VAS.displayExplainTopic(topic_id);
					});
					scrHome.on('showKnowledge', function() {
						VAS.displayKnowledge();
					});
					scrHome.on('showMachine', function(name) {
						VAS.displayTuningScreen();
					});
					scrHome.on('flash', function(title,body,icon) {
						UI.showFlash(title, body, icon);
					});

					// Fire the basic state change events
					scrHome.onStateChanged( 'simulating', false );

					// Complete home
					prog_home.ok("Home screen ready");
					cb();
				};

			var prog_cinematic = progressAggregator.begin(1),
				init_cinematic = function(cb) {
					var scrCinematic = VAS.scrCinematic = UI.initAndPlaceScreen("screen.cinematic");
					if (!scrCinematic) {
						UI.logError("Core: Unable to initialize cinematic screen!");
						return;
					}

					// Complete login
					prog_cinematic.ok("Cinematic screen ready");
					cb();
				};				

			var prog_courseroom = progressAggregator.begin(1),
				init_courseroom = function(cb) {
					var scrCourseroom = VAS.scrCourseroom = UI.initAndPlaceScreen("screen.courseroom");
					if (!scrCourseroom) {
						UI.logError("Core: Unable to initialize courseroom screen!");
						return;
					}

					// Complete login
					prog_courseroom.ok("Courseroom screen ready");
					cb();
				};				

			var prog_courses = progressAggregator.begin(1),
				init_courses = function(cb) {
					var scrKnowledge = VAS.scrKnowledge = UI.initAndPlaceScreen("screen.knowledge");
					if (!scrKnowledge) {
						UI.logError("Core: Unable to initialize knowledge screen!");
						return;
					}

					// Handle buy action
					scrKnowledge.on('unlock', function(knowledge_id) {
						User.unlockKnowledge(knowledge_id, function() {
							// Unlock successful, display alert

							// Get topic details
							var knowlegeDetails = DB.cache['knowlege_grid_index'][knowledge_id];
							if (knowlegeDetails) {

								// Show flash banner
								UI.showFlash(
									'Knowledge expanded',
									'You have just expanded your knowlege and unlocked the topic <em>'+knowlegeDetails['info']['title']+'</em>',
									config['images_url']+'/flash-icons/books.png'
								);

							}

							// Switch to tuning screen
							VAS.displayTuningScreen();

						});
					});
					scrKnowledge.on('flash', function(title,body,icon) {
						UI.showFlash(title, body, icon);
					});

					// Complete login
					prog_courses.ok("knowledge screen ready");
					cb();
				};				

			var prog_run = progressAggregator.begin(1),
				init_run = function(cb) {
					var scrRunning = VAS.scrRunning = UI.initAndPlaceScreen("screen.running");
					if (!scrRunning) {
						UI.logError("Core: Unable to initialize run screen!");
						return;
					}

					// Initialize running screen
					scrRunning.onTunablesDefined( DB.cache['tunables'] );
					scrRunning.onObservablesDefined( DB.cache['observables'] );

					// Bind events
					scrRunning.on('abortRun', function() {

						// Abort run
						LiveQCore.abortRun();

						// Display tuning screen
						UI.selectScreen("screen.tuning")

					});

					// Complete run
					prog_run.ok("Run screen ready");
					cb();
				};

			var prog_explain = progressAggregator.begin(1),
				init_explain = function(cb) {

					// Create explain screen
					var scrExplain = VAS.scrExplain = UI.initAndPlaceScreen("screen.explain", Components.ExplainScreen);
					if (!scrExplain) {
						UI.logError("Core: Unable to initialize explaination screen!");
						return;
					}

					// Initialize explain screen
					scrExplain.onTunablesDefined( DB.cache['tunables'] );
					scrExplain.onObservablesDefined( DB.cache['observables'] );

					// Check for machine layout
					var diagram = DB.cache['definitions']['machine-diagram'] || { layout: [] };
					scrExplain.onMachineLayoutDefined( diagram.layout );

					// Handle events
					scrExplain.on('hideExplain', function() {
						VAS.displayHome(true);
					});
					scrExplain.on('startTask', function(task_id) {
						VAS.displayTuningScreen(task_id);
					});

					// Complete explain
					prog_explain.ok("Explaination screen ready");
					cb();
				};

			var prog_tune = progressAggregator.begin(1),
				init_tune = function(cb) {

					// Create tuning screen
					var scrTuning = VAS.scrTuning = UI.initAndPlaceScreen("screen.tuning", Components.TuningScreen);
					if (!scrTuning) {
						UI.logError("Core: Unable to initialize explaination screen!");
						return;
					}

					// Initialize tuning screen
					scrTuning.onTunablesDefined( DB.cache['tunables'] );
					scrTuning.onObservablesDefined( DB.cache['observables'] );

					// Bind events
					scrTuning.on('explainParameter', function(parameter) {
						UI.selectScreen("screen.explain")
							.onParameterFocus(parameter);
					});
					scrTuning.on('showBook', function(bookID) {
						VAS.displayBook(bookID);
					});
					scrTuning.on('submitParameters', function(values, taskData) {
						VAS.displayRunningScreen( values, VAS.referenceHistograms, taskData );
					});
					scrTuning.on('interpolateParameters', function(values) {
						LiveQCore.requestInterpolation( values, 
							function(histograms) {
								scrTuning.onUpdate(histograms);
								VAS.referenceHistograms = histograms;
							},
							function(error) {
								UI.growl("Could not request interpolation! "+error, "alert", 5000);
							}
						);

					});
					scrTuning.on('course', function(name) {
						UI.screens["screen.courseroom"].onCourseDefined(name);
						UI.selectScreen("screen.courseroom");
					});
					scrTuning.on('flash', function(title,body,icon) {
						UI.showFlash(title, body, icon);
					});

					// Complete tuning
					prog_tune.ok("Tuning screen ready");
					cb();

				};

			// Wait some time for the background resources to load
			setTimeout(function() {

				var chainRun = [
						init_db, init_api, init_home, init_cinematic, init_courseroom, init_courses, 
						init_tutorials, init_login, init_team, init_explain, init_tune, init_run, init_results
					],
					runChain = function(cb, index) {
						var i = index || 0;

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
						if (VAS.alertUnload) {
							return "Navigating away will stop your current game session.";
						}
					});

				});

			}, 500)


		}

		/**
		 * Display the cinematic screen
		 */
		VAS.displayCinematic = function( video, callback ) {

			// Initialize cinematic screen
			VAS.scrCinematic.onCallbackDefined(callback);
			VAS.scrCinematic.onCinematicDefined(video, (function() {

				// Show cinematic screen
				UI.selectScreen("screen.cinematic");

			}).bind(this));

		}

		/**
		 * Check user's record and show the appropriate home screen
		 * configuration.
		 */
		VAS.displayHome = function( animateBackwards ) {

			// Select home screen
			UI.selectScreen("screen.home", animateBackwards ? UI.Transitions.ZOOM_OUT : UI.Transitions.ZOOM_IN);

		}

		/**
		 * Check user's record and show the appropriate courses screen
		 * configuration.
		 */
		VAS.displayKnowledge = function( animateBackwards ) {

			// Setup home screen
			VAS.scrKnowledge.onTopicTreeUpdated( User.getKnowledgeTree(true) );

			// Select home screen
			UI.selectScreen("screen.knowledge", animateBackwards ? UI.Transitions.ZOOM_OUT : UI.Transitions.ZOOM_IN);

		}

		/**
		 * Check user's configuration and display the appropriate topic screen
		 */
		VAS.displayExplainTopic = function( topic_id ) {
			if (!topic_id) return;

			// Setup explain screen
			VAS.scrExplain.onTopicUpdated( User.getTopicDetails(topic_id) );
			VAS.activeTopic = topic_id;

			// Switch screen
			UI.selectScreen("screen.explain");

		}

		/**
		 * Check user's configuration and display the appropriate tuning screen
		 */
		VAS.displayTuningScreen = function() {

			// Start task
			VAS.scrTuning.onTuningConfigUpdated( User.getTuningConfiguration() );

			// Display tuning screen
			UI.selectScreen("screen.tuning")

		}

		/**
		 * Check user's configuration and display the appropriate tuning screen
		 */
		VAS.displayRunningScreen = function( values, referenceHistograms, taskData ) {

			//var _dummyRunner_ = new _DummyRunner_();
			//_dummyRunner_.onUpdate = VAS.scrRunning.onUpdate.bind( VAS.scrRunning );

			// Keep the task and the topic for reference
			VAS.runningTask = VAS.activeTask;
			VAS.runningTopic = VAS.activeTopic;

			// Let running screen know that simulation has started
			VAS.scrRunning.onStartRun( values, taskData.obs, referenceHistograms );

			// Let home screen know that we started the simulation
			VAS.scrHome.onStateChanged( 'simulating', true );

			// Start Lab Socket
			LiveQCore.requestRun(values,
				function(histograms) { // Data Arrived
					//_dummyRunner_.data = histograms;
					//_dummyRunner_.start();
					VAS.scrRunning.onUpdate( histograms );
				},
				function(histograms) { // Completed
					
					// Update running screen
					VAS.scrRunning.onUpdate( histograms );

					// Handle simulation completion
					VAS.handleSimulationCompletion( histograms );

					// Update state variables
					VAS.scrHome.onStateChanged( 'simulating', false );

				},
				function(errorMsg) { // Error

					// Update state variables
					VAS.scrHome.onStateChanged( 'simulating', false );

					// "Aborted" is not an error ;)
					if (errorMsg.trim().toLowerCase() == "aborted") return;
					UI.growl("Simulation Error: "+errorMsg, "alert");

					// Go to the home screen					
					VAS.displayHome();
				},
				function(logLine, telemtryData) { // Log/Telemetry
					if (telemtryData['agent_added']) {
						VAS.scrRunning.onWorkerAdded(telemtryData['agent_added'],
						{
							'lat' : Math.random() * 180 - 90,
							'lng' : Math.random() * 180
						});
					} else if (telemtryData['agent_removed']) {
						VAS.scrRunning.onWorkerRemoved(telemtryData['agent_removed']);
					}
					console.log(">>> ",logLine,telemtryData);
				});

			// Display tuning screen
			UI.selectScreen("screen.running")

		}

		/**
		 * Display the results screen
		 */
		VAS.displayResultsScreen = function( values ) {

			VAS.scrResults.onUpdate( values );

			UI.selectScreen("screen.results");

			var score = 0;
			if (values <= Config['validate']['good']) {
				score = 5;
			} else if (values <= Config['validate']['average']) {

			} else {

			}


		}

		/**
		 * Display the results screen
		 */
		VAS.displayBook = function( bookID ) {

			// Display book
			var comBook = UI.showOverlay("overlay.book");

			// Update metadata
			comBook.onMetaUpdate({ 'info': { 'book': bookID } });

		}

		/**
		 * Check the completed results and continue as required
		 */
		VAS.handleSimulationCompletion = function(histograms) {

			// Calcualte chi-squared average
			var chiAvg = 0;
			for (var i=0; i<histograms.length; i++) {
				// Calculate chi-squared between the data and the reference histogram
				chiAvg += LiveQCalc.chi2WithError( histograms[i].data, histograms[i].ref.data );
			}
			chiAvg /= histograms.length;

			// Get task details & validation minimum
			var taskDetails = DB.cache['tasks'][VAS.runningTask],
				minChi = 1;
				if (taskDetails && taskDetails['validate'] && taskDetails['validate']['accept'])
					minChi = taskDetails['validate']['accept'];

			// Show results screen
			UI.displayResultsScreen( chiAvg, taskDetails['validate'] );

			// Check if we accept this value
			if (chiAvg <= minChi) {
				// Activate next tasks/topics
				User.markTaskCompleted( VAS.runningTask, VAS.runningTopic );
			}

		}

		window.markCompleted = function() {
				User.markTaskCompleted( VAS.runningTask, VAS.runningTopic );
		}

		/**
		 * Initialize VAS with the given game configuration and run
		 */
		VAS.run = function() {

			// Run main game
			UI.selectScreen( "screen.login" );
			//UI.selectScreen( "screen.home" );

		}

		return VAS;
	}

);