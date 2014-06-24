

define(["jquery", "core/config", "core/registry", "core/components", "core/db", "jquery-knob"], 

	/**
	 * Basic version of the home screen
	 *
	 * @exports basic/components/tuning_screen
	 */
	function($, config, R, C, DB, Knob) {

		/**
		 * Tuning dashboard screen
		 */
		var TuningScreen = function(hostDOM) {
			C.TuningScreen.call(this, hostDOM);

			// Initialize host
			var self = this;
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
					mouseY = 0;
				}

				// Convert to logarithmic scale
				mouseX = Math.pow(Math.abs(mouseX),2) * (Math.abs(mouseX)/mouseX);
				mouseY = Math.pow(Math.abs(mouseY),2) * (Math.abs(mouseY)/mouseY);

				self.hostTuning.css({
					'left': -mouseX * self.obsMaxDistance*2/3,
					'top' : -mouseY * self.obsMaxDistance*2/3
				});
			});

			// Prepare status widget
			this.statusWidget = this.createStatusWidget( this.hostTuning );

			// Prepare main screen
			this.obsAngleSpan = Math.PI;
			this.obsWideSpan = 0;
			this.obsMinDistance = 400;
			this.obsMaxDistance = 800;

			this.tunAngleSpan = Math.PI*3/2;
			this.tunWideSpan = 0;
			this.tunMinDistance = 200;
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
		 * Prepare progress widget
		 */
		TuningScreen.prototype.createStatusWidget = function() {
			var StatusWidget = function(host) {

				// Tunable parameters
				var diameter = this.diameter = 160;

				// Prepare host
				this.element = $('<div class="progress-widget"></div>');
				host.append(this.element);

				// Prepare progress knob
				this.progressKnob = $('<input type="text" value="25" />');
				this.element.append(this.progressKnob);
				this.progressKnob.knob({
					min:0, max:100,
					width 		: diameter - 12,
					heigth 		: diameter - 12,
					thickness	: 0.35,
					angleArc 	: 270,
					angleOffset : -135,
					readOnly  	: true,
					className 	: 'knob',
					fgColor 	: "#16a085",
					bgColor 	: "#bdc3c7",
				});

				// Prepare tunable icon
				this.startIcon = $('<a href="do:begin" class="button">Begin</a>');
				this.element.append(this.startIcon);

				// Prepare label & sublabel
				this.titleElm = $('<div class="title">Good</div>');
				this.subtitleElm = $('<div class="subtitle">match</div>');
				this.element.append(this.titleElm);
				this.element.append(this.subtitleElm);

				// Helper function
				var self = this;
				this.setPosition = function(x,y) {
					self.element.css({
						'left': x - diameter/2,
						'top': y - diameter/2
					});
				}

				// Update value
				this.setValue = function(v) {

				}

			};

			return new StatusWidget(this.hostTuning);
		}

		/**
		 * Prepare tunable widget
		 */
		TuningScreen.prototype.createTunableWidget = function(container) {
			var TunableWidget = function(hostDOM) {

				// Tunable parameters
				this.diameter = 74;

				// Prepare host element
				this.element = $('<div class="tunable"></div>');
				hostDOM.append(this.element);

				// Prepare & nest UI elements
				this.leftWing = $('<a class="wing left">-</a>');
				this.rightWing = $('<a class="wing right"+></a>');
				this.centerDial = $('<div class="dial"></div>');
				this.element.append(this.leftWing);
				this.element.append(this.rightWing);
				this.element.append(this.centerDial);

				// Expose functions
				var self = this;
				this.setPosition = function(x,y) {
					self.element.css({
						'left': x - self.diameter/2,
						'top' : y - self.diameter/2
					});
				}

				this.setMetadata = function(meta) {
				}

			};

			return new TunableWidget(container);
		}

		/**
		 * Prepare observable widget
		 */
		TuningScreen.prototype.createObservableWidget = function(container) {
			var ObservableWidget = function(hostDOM) {

				// Keep position for updating
				this.x = 0;
				this.y = 0;
				this.value = 0;
				this.diameter = 64;

				// Prepare host element
				this.element = $('<div></div>');
				hostDOM.append(this.element);

				// Prepare an indicator when the element goes offscreen
				this.indicator = $('<div class="indicator"></div>');
				hostDOM.append(this.indicator);

				// Prepare classes
				this.element.addClass("observable");
				this.element.addClass("sz-big");

				// Expose functions
				var self = this;
				this.setPosition = function(x,y) {
					self.x = x; self.y = y;
					self.update();
				}

				this.setMetadata = function(meta) {
					self.element.text(meta['short']);
				}

				this.update = function() {
					self.element.css({
						'left': self.x - self.diameter/2,
						'top' : self.y - self.diameter/2
					});
					this.indicator.css({
						'left': self.x - self.diameter/2,
						'bottom': 2
					});
				}

				this.setValue = function(v) {

					// Pick classes
					var obsValBounds = [0.33, 0.66];
					self.value = v;

					// Remove previous classes
					self.element.removeClass("val-bd");
					self.element.removeClass("val-md");
					self.element.removeClass("val-gd");

					// Append classes
					if (v < obsValBounds[0]) {
						self.element.addClass("val-bd");
						self.diameter = 64;
					} else if (v < obsValBounds[1]) {
						self.element.addClass("val-md");
						self.diameter = 32;
					} else {
						self.element.addClass("val-gd");
						self.diameter = 24;
					}

					// Update position
					self.update();

				}

			};

			return new ObservableWidget(container);
		}

		/**
		 * Design the main user interface
		 */
		TuningScreen.prototype.prepareMainScreen = function() {

			// Create arbitrary observables
			this.obsElms = [];
			var aNum = 1,
				aStep = this.obsAngleSpan / (aNum+1),
				aVal = 0;

			// Create observables
			for (var i=0; i<aNum; i++) {
				var e = this.createObservableWidget( this.hostTuning );
				e.angle = (aVal += aStep);
				e.setMetadata({ 'short': i });
				e.setValue( Math.random() );
				this.obsElms.push( e );
			}

			// Realign observables
			this.realignObservables();

			//////////////////////////////////////////////////////

			// Prepare tunable parameters
			this.tunElms = [];
			var aNum = 2,
				aStep = this.tunAngleSpan / (aNum+1);
				aVal = 0;

			// Create tunables
			for (var i=0; i<aNum; i++) {
				var e = this.createTunableWidget( this.hostTuning );
				e.angle = (aVal += aStep);
				this.tunElms.push( e );
			}

			// Realign observables
			this.realignTunables();

		}

		/**
		 * Realign observables
		 */
		TuningScreen.prototype.realignObservables = function() {
			var cX = this.width / 2, cY = 150,
				aOfs  = this.obsAngleSpan/2,
				xStep = this.obsWideSpan/this.obsElms.length,
				xPos  = -this.obsWideSpan/2;

			this.statusWidget.setPosition( cX, cY );

			for (var i=0; i<this.obsElms.length; i++) {
				var o = this.obsElms[i],
					r = o.value * (this.obsMaxDistance - this.obsMinDistance);

				// Get dimentions
				o.setPosition(
						cX + Math.sin(o.angle-aOfs) * (r+this.obsMinDistance) + xPos,
						cY + Math.cos(o.angle-aOfs) * (r+this.obsMinDistance)
					);

				xPos += xStep;
			}

		}

		/**
		 * Realign tunables
		 */
		TuningScreen.prototype.realignTunables = function() {
			var cX = this.width / 2, cY = 150,
				aOfs  = this.tunAngleSpan/2,
				xStep = this.tunWideSpan/this.tunElms.length,
				xPos  = -this.tunWideSpan/2;

			for (var i=0; i<this.tunElms.length; i++) {
				var o = this.tunElms[i],
					r = (this.tunMaxDistance - this.tunMinDistance) * 0;

				// Get dimentions
				o.setPosition(
						cX + Math.sin(o.angle-aOfs) * (r+this.tunMinDistance) + xPos,
						cY + Math.cos(o.angle-aOfs) * (r+this.tunMinDistance)
					);

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
			this.height = heigth;

			this.realignObservables();
			this.realignTunables();
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