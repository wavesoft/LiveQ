

define(

	/**
	 * Dependencies
	 */
	["jquery", "core/config", "core/registry", "core/base/components", "core/db", "core/ui", "core/user", "liveq/core",

	 // Self-registering dependencies
	 "jquery-knob"], 

	/**
	 * Basic version of the home screen
	 *
	 * @exports vas-basic/components/tuning_screen
	 */
	function($, config, R, C, DB, UI, User, LiveQCore) {

		/**
		 * Tuning dashboard screen
		 */
		var TuningScreen = function(hostDOM) {
			C.TuningScreen.call(this, hostDOM);

			// Prepare properties
			this.host = hostDOM;
			this.width = 0;
			this.height = 0;

			// Configuration parameters
			this.obsAngleSpan = Math.PI*2;
			this.obsAngleShift = 0;
			this.obsWideSpan = 0;
			this.obsMinDistance = 400;
			this.obsMaxDistance = 600;

			this.tunAngleSpan = Math.PI*2;
			this.tunAngleShift = 0;
			this.tunWideSpan = 0;
			this.tunMinDistance = 150;
			this.tunMaxDistance = 350;

			// Save slots
			this.saveButtons = [];
			this.activeSaveSlot = 0;

			// Task info
			this.taskData = null;

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
			this.observableByID = {};

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

			// Prepare host elements
			this.hostTuning = $('<div class="tuning-host fullscreen"></div>');
			this.foregroundDOM.append(this.hostTuning);

			// Prepare Sub-components
			this.preparePageParts();
			this.preparePinView();
			this.prepareTuningStatus();
			this.prepareObservingStatus();
			//this.prepareEvents();

			// Define main screen
			var levels=[], obs=[], tun=[], ltid=0, loid=0;
			for (var i=0; i< 5; i++) {
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
							'dec'  : 3,
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
		////                            HOOK HANDLERS                              ////
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////

		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		////                      INTERFACE DESIGN FUNCTIONS                       ////
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////

		/**
		 * Display a book
		 */
		TuningScreen.prototype.showBook = function(book) {
			alert('You will be presented with book #'+book); 
		}

		/**
		 * Prepare the tuning status widget and anchor
		 */
		TuningScreen.prototype.prepareTuningStatus = function() {

			// Create left and right side bar

			// Prepare status widget
			/*
			this.tuningWidget = R.instanceComponent( "widget.tuning.status-tune", this.hostTuning );
			if (!this.tuningWidget)
				console.warn("Unable to instantiate tuning status widget!");
			else
				this.forwardVisualEvents( this.tuningWidget );

			// Bind widget events
			this.tuningWidget.onUpdate();
			this.tuningWidget.on('slotSave', (function(slot) {

			}).bind(this));
			this.tuningWidget.on('slotLoad', (function(slot) {

			}).bind(this));
			this.tuningWidget.on('slotDisplay', (function(slot) {

			}).bind(this));
			*/

			// Reset the tuning groups
			this.tuningGroups = {};

			// Prepare the tuning sidebars
			this.tuningSB0 = $('<div class="sidebar sb0"></div>');
			this.tuningSB1 = $('<div class="sidebar sb1"></div>');
			this.foregroundDOM.append( this.tuningSB0 );
			this.foregroundDOM.append( this.tuningSB1 );

			// Place buttons on the tuning sidebars
			this.sidebarButtonsDOM = $('<div class="sidebar-buttons"></div>').appendTo(this.tuningSB0);

			// Prepare bodies
			this.tuningBodySB0 = $('<div></div>').appendTo( this.tuningSB0 );
			this.tuningBodySB1 = $('<div></div>').appendTo( this.tuningSB1 );

			// Add tutorial button
			var btnTutorial = $('<div class="btn-tutorial"><span class="uicon uicon-explain"></span><br />Tutorial</div>').appendTo( this.sidebarButtonsDOM );
			btnTutorial.click(function(e) {
				e.preventDefault();
				e.stopPropagation();
				UI.showTutorial("ui.tuning");
			});

			// Populate save buttons (in reverse order because they are float:right)
			for (var i=3; i>=0; i--) {
				var btnSave = $('<div class="btn-save"><div class="led"></div><div class="text">'+(i+1)+'</div></div></div>')
								.appendTo(this.sidebarButtonsDOM);

				btnSave.click((function(slot) {
					return function(e) {
						e.preventDefault();
						e.stopPropagation();
						this.activateSave(slot);
					}
				})(i).bind(this));

				this.saveButtons.unshift(btnSave);
				if (this.activeSaveSlot == i)
					btnSave.addClass("active");
			}

		};

		/**
		 * Prepare the observing status widget and anchor
		 */
		TuningScreen.prototype.prepareObservingStatus = function() {

			// Prepare status widget
			this.observingWidget = R.instanceComponent( "widget.tuning.status-observe", this.hostTuning );
			if (!this.observingWidget)
				console.warn("Unable to instantiate observing status widget!");
			else
				this.forwardVisualEvents( this.observingWidget );

			// Bind widget events
			this.observingWidget.onUpdate();
			this.observingWidget.on('begin', (function() {
				this.trigger('submitParameters', this.getValueMap());
			}).bind(this));

		}

		/**
		 * Update tuning pivot position
		 */
		TuningScreen.prototype.updateTuningStatus = function() {

			// Realign all the tunables
			for (var i=0; i<this.tunElms.length; i++) {
				var hd = this.tunElms[i].hostDOM;
				this.tunElms[i].onResize( hd.width(), hd.height() );
			}
		}

		/**
		 * Update observing pivot position
		 */
		TuningScreen.prototype.updateObservingStatus = function() {

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

			// Update tuning widget position
			this.observingWidget.onMove( l, t );
			this.observingWidget.onResize( w, h );
			if (this.observingWidget.setRadialConfig)
				this.observingWidget.setRadialConfig( 104, r - 24 );

			// Realign all the tunables
			var a = this.obsAngleShift, aStep = this.obsAngleSpan / this.obsElms.length;
			for (var i=0; i<this.obsElms.length; i++) {
				if (this.obsElms[i].setRadialConfig)
					this.obsElms[i].setRadialConfig( 104, r - 24, a += aStep );
				this.obsElms[i].onMove( l, t );
				this.obsElms[i].onResize( w, h );
			}


		}

		/**
		 * Bind to various event handlers
		 */
		TuningScreen.prototype.prepareEvents = function() {

			// Prepare mouse events
			this.mouse = { x:0 , y:0 };
			this.foregroundDOM.mousemove((function(e) {
				var yPosition = 300,
					mouseX = 0,
					mouseY = 0;

				// Calculate mouse offset
				mouseX = (e.clientX - this.width/2) / (this.width/2);
				if (e.clientY > yPosition) {
					mouseY = (e.clientY - yPosition) / (this.height - yPosition - this.detailsViewHeight);
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
					panX = (overPan+this.obsMaxDistance*2) - this.width,
					panY = (overPan+this.obsMaxDistance+this.pivotY) - this.height;
				if (panX < 0) panX = 0;
				if (panY < 0) panY = 0;

				// Aply cursor panning
				this.hostTuning.css({
					'left': -mouseX * panX,
					'top' : -mouseY * panY
				});

				// Update horizon
				this.forwardHorizon();

			}).bind(this));

		}

		/**
		 * Create expanded view screen
		 */
		TuningScreen.prototype.preparePageParts = function() {

			// Create the top-left pagepart
			this.ppTL = $('<div class="floater f-header"></div>');
			this.foregroundDOM.append( this.ppTL );

			// Fill-in pagepart fields
			this.infoTitle = $('<h1>Level 1</h1>');
			this.ppTL.append(this.infoTitle);
			this.infoSubtitle = $('<p>A short description of this level</p>');
			this.ppTL.append(this.infoSubtitle);

		}

		/**
		 * Create expanded view screen
		 */
		TuningScreen.prototype.preparePinView = function() {

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


			// Prohibit mouse events on the expanded view
			this.detailsView.mousemove(function(e) {
				e.stopPropagation();
			});


		}


		/**
		 * Create an tunable widget
		 */
		TuningScreen.prototype.createTunable = function( angle, level, metadata ) {

			// Prepare tunable group if required
			var groupName = (metadata['info'] && metadata['info']['group']) ? metadata['info']['group'] : "general";

			// Pick/Create group DOM
			var groupDOM = this.tuningGroups[groupName];
			if (!groupDOM) {

				// Get group info
				var groupInfo = { 'title': groupName, 'book': '' },
					groupDict = (DB.cache['definitions'] && DB.cache['definitions']['tunable-groups'] && DB.cache['definitions']['tunable-groups']['groups']) ?
							DB.cache['definitions']['tunable-groups']['groups'] : {};

				// Override group information
				if (groupDict[groupName])
					groupInfo = groupDict[groupName];

				// Create title + help icon
				var elmTitle = $('<h1>' + groupInfo['title'] + '</h1>');
				if (groupInfo['book']) {
					var elmInfo = $('<span class="help">?</span>');
					elmTitle.append( elmInfo );
					elmInfo.click((function(book) {
						return function(e) {
							e.preventDefault();
							e.stopPropagation();
							// Show book
							this.showBook( book );
						}
					})(groupInfo['book']).bind(this))
				}

				// Create title
				this.tuningBodySB0.append(elmTitle);
				this.tuningBodySB0.append(groupDOM = $('<div class="group"></div>'));
				this.tuningGroups[groupName] = groupDOM;

			}

			// Create DOM element for the tuanble
			var tunDOM = $('<div class="tunable"></div>');
			groupDOM.append(tunDOM);

			// Try to instantiate the observable component
			var e = R.instanceComponent("widget.tunable.tuning", tunDOM );
			if (!e) {
				console.warn("Unable to instantiate a tuning widget!");
				return undefined;
			}

			// Forward visual events
			this.forwardVisualEvents( e );

			// Event: Request for explanation
			e.on('explain', (function(book) {
				this.showBook( book );
			}).bind(this));
			// Event: Notify value updated
			e.on('valueChanged', (function(value) {
				this.requestInterpolation();
				this.commitSaveChanges();
			}).bind(this));

			// Set default values
			e.onMetaUpdate( metadata );
			e.onUpdate( parseFloat(metadata['def']) || 0 );

			// Get save slot information
			if (this.taskData) {
				var saveData = this.taskData['save'];
				for (var i=0; i<saveData.length; i++) {
					if (!saveData[i]) {
						e.onSaveSlotUpdate( i, null );
					} else {
						e.onSaveSlotUpdate( i, saveData[i][metadata['_id']] || null );
					}
				}
			}

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
			e.setRadialConfig( undefined, undefined, angle );

			// Event: Request for explanation
			e.on('explain', (function(book) {
				this.showBook( book );
			}).bind(this));
			// Event: Pin the observable on screen
			e.on('pin', (function(elm) {
				return function() {
					alert("Will pin element"+elm);
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
			var firstTunable = true,
				firstObservable = true;

			// Cleanup previous components
			this.tuningBodySB0.empty();
			this.tuningBodySB1.empty();
			this.hostTuning.find(".observable").remove();

			// Calculate pivot point
			this.pivotX = this.width / 2;
			this.pivotY = 150;

			// Reset observable parameters
			this.obsElms = [];
			this.tunElms = [];
			this.observablesLevelRings = [];
			this.tunablesLevelRings = [];
			this.tuningGroups = {};

			// Tunable ring positions
			var tRingRadius = this.tunMinDistance, 
				tRingStep = (this.tunMaxDistance - this.tunMinDistance) / levels.length;

			// Calculate total number of observables
			var oNum = 0;
			for (var j=0; j<levels.length; j++)
				oNum += levels[j].obs.length;
			var oStep = this.obsAngleSpan / (oNum+1),
				oVal = this.obsAngleShift; //-this.obsAngleSpan / 2;

			// Calculate total number of tunables
			var tNum = 0;
			for (var j=0; j<levels.length; j++)
				tNum += levels[j].tun.length;
			var tStep = this.tunAngleSpan / (tNum+1),
				tVal = this.tunAngleShift; //-this.tunAngleSpan / 2;

			// Process level definitions
			for (var j=0; j<levels.length; j++) {
				var level = levels[j],
					tunRing = [], obsRing = [];

				// Build observable rings
				for (var i=0; i<level.obs.length; i++) {
					var obsData = observables[ level['obs'][i] ];
					if (!obsData) {
						console.warn("TuningScreen: Unable to find observable", level['obs'][i] );
						continue;
					}

					// Create observable
					var o = this.createObservable( 
							(oVal += oStep),
							obsData
						);

					// Store on observable elements
					if (!o) {
						console.warn("TuningScreen: Could not create observable!");
						continue;
					}
					this.obsElms.push( o );
					this.observableByID[ obsData['_id'] ] = o;

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
					//o.setActive( j == 0 );
					obsRing.push( o );

				}

				// Update observables level ring
				this.observablesLevelRings.push(obsRing);

				/////////////////////////////////////////////

				// Build tunable rings
				for (var i=0; i<level.tun.length; i++) {
					var tunData = tunables[ level['tun'][i] ];
					if (!tunData) {
						console.warn("TuningScreen: Unable to find tunable", level['tun'][i] );
						continue;
					}

					// Create tunable
					var o = this.createTunable(
							(tVal += tStep),
							tRingRadius,
							tunData
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

					// Activate the first level
					//o.setActive( j == 0 );
					tunRing.push(o);

				}

				// Update tunables level ring
				this.tunablesLevelRings.push(tunRing);
				//tRingRadius += tRingStep;

			}

			// Realign tunables and observables
			this.updateTuningStatus();
			this.updateObservingStatus();

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
		TuningScreen.prototype.onStartTask = function( taskData ) {

			/*
			// Get the levels to activate
			var activeLevels = [];
			for (var i=0; i<=targetLevel; i++)
				activeLevels.push(this.levels[i]);

			// Redefine main screen
			*/

			// Fetch task data from user record
			this.taskData = taskData;

			// Update titles
			this.infoTitle.text(this.taskData['info']['title'] || "Untitled Task");
			this.infoSubtitle.text(this.taskData['info']['subtitle'] || "");

			// Define main screen
			this.defineMainScreen( [this.taskData], this.observables, this.tunables );

		}

		/**
		 * Connect to lab before showing
		 */
		TuningScreen.prototype.onWillShow = function(cb) {

			// Connect to LabSocket
			LiveQCore.openSocket(
				this.taskData['lab'], 
				function(){
					cb();
				},
				function(message) {
					alert('Could not connect to LiveQ! '+message);
				}
			);

		}

		/**
		 * Handle window resize
		 */
		TuningScreen.prototype.onResize = function(width, height) {
			this.width = width;
			this.height = height;

			this.updateTuningStatus();
			this.updateObservingStatus();

			/*
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

			// Update horizon
			this.forwardHorizon();
			*/

			// Resize pin view
			this.pinViewComponent.onResize(width, this.detailsViewHeight);


		}

		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		////                    FUNCTIONALITY IMPLEMENTATION                       ////
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////

		/**
		 * Activate save group
		 */
		TuningScreen.prototype.activateSave = function(index) {
			this.saveButtons[this.activeSaveSlot].removeClass("active");
			this.activeSaveSlot = index;
			this.saveButtons[this.activeSaveSlot].addClass("active");

			// Load save states
			var saveData = this.taskData['save'][this.activeSaveSlot];
			if (saveData) {
				for (var i=0; i<this.tunElms.length; i++) {
					var k = this.tunElms[i].meta['_id'];

					// Update from saved slot value
					if (saveData[k] != undefined) {
						this.tunElms[i].onUpdate( saveData[k] );
					}
				}
			}

		}

		/**
		 * Commit changes to the current save slot
		 */
		TuningScreen.prototype.commitSaveChanges = function() {

			// Update save slots on each tunable & prepare tunables data map
			var vals = {};
			for (var i=0; i<this.tunElms.length; i++) {
				var k = this.tunElms[i].meta['_id'],
					v = this.tunElms[i].getValue();

				// Update save slot value
				this.tunElms[i].onSaveSlotUpdate( this.activeSaveSlot, v );

				// Save 
				vals[k] = v;

			}

			// Save active save data
			this.taskData['save'][this.activeSaveSlot] = vals;
			User.setTaskSaveSlot( this.taskData['_id'], this.activeSaveSlot, vals );

		}

		/**
		 * Submit values and request interpolation
		 */
		TuningScreen.prototype.requestInterpolation = function(values) {

			var values = this.getValueMap();
			LiveQCore.requestInterpolation( values, 
				(function(histograms) {

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

					// Update observing widget with the average chi square
					if (chiCount > 0) {
						this.observingWidget.onUpdate( chiSum / chiCount );
					} else {
						this.observingWidget.onUpdate( 1000 );
					}

				}).bind(this),
				(function(error) {


				}).bind(this)
			);

		}

		/**
		 * Build a key/value dictionary with the values of all of my tunables
		 */
		TuningScreen.prototype.getValueMap = function() {
			var ans = {};
			for (var i=0; i<this.tunElms.length; i++) {
				var k = this.tunElms[i].meta['_id'],
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
					//this.tunablesLevelRings[j][i].setActive( j == id );
				}
				for (var i=0; i<this.observablesLevelRings[j].length; i++) {
					//this.observablesLevelRings[j][i].setActive( j == id );
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