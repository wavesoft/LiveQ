
define(

	// Requirements
	["jquery", "d3", "core/db", "core/ui", "core/config", "core/registry", "core/base/components", "core/user", "core/apisocket", "liveq/Calculate"],

	/**
	 * Basic version of the home screen
	 *
	 * @exports basic/components/explain_screen
	 */
	function($, d3, DB, UI, config, R,C, User, APISocket, Calculate ) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var TuningScreen = function( hostDOM ) {
			C.TuningScreen.call(this, hostDOM);

			// Prepare host
			hostDOM.addClass("tuning2");

			// Setup local variables
			this.machineConfigurationsEnabled = {};
			this.machinePartsEnabled = {};
			this.machinePartTunables = {};
			this.observables = [];
			this.values = {};
			this.markers = {};

			// Team header
			$('<h1><span class="highlight">Tuning</span> The Quantum Machine</h1><div class="subtitle">Fiddle with the quantum machine and find the best values</div>').appendTo(hostDOM);

			// ---------------------------------
			// Create machine backdrop
			// ---------------------------------

			// Create a machine
			this.machineDOM = $('<div class="fullscreen fx-animated"></div>').appendTo(hostDOM);
			this.machine = R.instanceComponent("backdrop.machine", this.machineDOM);
			this.forwardVisualEvents( this.machine, { 'left':0, 'top': 0, 'width': '100%', 'height': '100%' } );
			
			// Setup machine
			this.machine.onMachinePartsEnabled({});

			this.machine.on('click', (function(eid, pos) {
				this.showPopover(pos, eid);
			}).bind(this));

			// ---------------------------------
			// Create help message panel
			// ---------------------------------

			// Create a description vrame
			var descFrame = this.descFrame = $('<div class="description-frame"></div>').appendTo(hostDOM);
			this.descTitle = $('<h1>This is a header</h1>').appendTo(descFrame);
			this.descBody = $('<div>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent ornare eu ex consectetur feugiat. Pellentesque quis dolor sed lacus pellentesque euismod lacinia eget urna. Vestibulum ipsum lorem, posuere in dignissim ac, sollicitudin eu odio. Suspendisse ac porta turpis. Etiam nec consequat mauris, at placerat urna. Nam suscipit nisl eget nisi semper, quis aliquet sem interdum. Proin condimentum nunc vel imperdiet vehicula.</div>').appendTo(descFrame);

			// Bind listeners
			this.machine.on('hover', (function(id) {
				var details = DB.cache['definitions']['machine-parts'][id];
				if (details == undefined) {
					this.descTitle.text("Quantum Machine");
					this.descBody.html("Move your mouse over a component in order to see more details.");
				} else {
					if (!this.machinePartsEnabled[id]) {
						this.descTitle.html('<span class="glyphicon glyphicon-lock"></span> Part Locked');
						this.descBody.html("You don't have enough experience in order to tune this component. Go back to the <em>Knowlege Tree</em> and unlock new topics.");
					} else {
						this.descTitle.text(details['description']['title']);
						this.descBody.html(details['description']['body']);
					}
				}
			}).bind(this));

			// Create course button
			this.btnCourse = $('<button class="btn-course btn-shaded btn-teal btn-with-icon"><span class="glyphicon glyphicon-book"></span><br />Course</button>').appendTo(descFrame);
			this.btnCourse.click((function(e) {
				this.trigger("course", "level-1-1");
			}).bind(this));

			// ---------------------------------
			// Create tuning panel
			// ---------------------------------

			// Prepare tuning panel DOM
			this.tuningMask = $('<div class="fullscreen mask"></div>').hide().appendTo(hostDOM);
			this.tunableGroup = $('<div class="parameter-group"></div>').appendTo(this.tuningMask);
			this.tuningMask.click((function() {
				this.hidePopover((function() {
				}).bind(this));
			}).bind(this));

			// Prepare tuning panel with it's blocking frame
			this.tuningPanel = R.instanceComponent("widget.tunable.tuningpanel", this.tunableGroup);
			this.tunableGroup.click(function(e) {
				e.stopPropagation();
				e.preventDefault();
			});

			// Bind events
			this.tuningPanel.on('change', (function(e) {


			}).bind(this));

			// ---------------------------------
			// Create machine types
			// ---------------------------------

			// Machine modes
			this.machineConfigModes = [
				"ee", "ppbar"
			];
			this.machineConfigBtns = [
				$('<button class="btn-config-1 btn-shaded btn-darkblue btn-with-icon"><span class="glyphicon glyphicon-cog"></span><br />Electrons</button>').appendTo(hostDOM),
				$('<button class="btn-config-2 btn-shaded btn-darkblue btn-with-icon"><span class="glyphicon glyphicon-cog"></span><br />Protons</button>').appendTo(hostDOM)
			];
			for (var i=0; i<this.machineConfigBtns.length; i++) {
				this.machineConfigBtns[i].click( (function(configMode) {
					return function() {
						this.setMachineConfiguration(configMode);
					}
				})(this.machineConfigModes[i]).bind(this));
			}
			
			// ---------------------------------
			// Create a control board
			// ---------------------------------

			var boardHost = $('<div class="control-board"></div>').appendTo(hostDOM),
				descBoard = $('<div></div>').appendTo(boardHost);

			this.btnEstimate = $('<button class="btn-shaded btn-with-icon btn-red"><span class="glyphicon glyphicon-unchecked"></span><br />Estimate</button>').appendTo(descBoard);
			this.btnSubmit = $('<button class="btn-shaded btn-with-icon btn-red btn-striped "><span class="glyphicon glyphicon-expand"></span><br />Submit</button>').appendTo(descBoard);
			this.panelStatus = $('<div class="panel-shaded">---</div>').appendTo(descBoard);
			this.btnView = $('<button class="btn-shaded btn-with-icon btn-darkblue"><span class="glyphicon glyphicon-dashboard"></span><br />View</button>').appendTo(descBoard);

			// Bind events
			this.btnEstimate.click((function() {
				this.estimateResults();
			}).bind(this));

			// View histograms
			this.btnView.click((function() {

			}).bind(this));

			// Create help button
			this.btnHelp = $('<button class="btn-help btn-shaded btn-teal btn-with-icon"><span class="glyphicon glyphicon-bookmark"></span><br />Help</button>').appendTo(hostDOM);
			this.btnHelp.click((function() {
				this.descFrame.toggleClass("visible");
			}).bind(this));


		}
		TuningScreen.prototype = Object.create( C.TuningScreen.prototype );

		/**
		 * Setup popover with the configuration given
		 */
		TuningScreen.prototype.setupPopover = function(config) {

		}

		/** 
		 * Hide pop-up
		 */
		TuningScreen.prototype.hidePopover = function(callback) {

			// Remove back-blur fx on the machine DOM
			this.machineDOM.removeClass("fx-backblur");

			// Hide element
			this.tunableGroup.addClass("hidden");
			this.tunableGroup.css(this.popoverPos).css({
				'transform': '',
				'oTransform': '',
				'msTransform': '',
				'webkitTransform': '',
				'mozTransform': '',
			})

			// Cleanup upon animation completion
			setTimeout((function() {
				this.tunableGroup.removeClass("animating");
				this.tuningMask.hide();
				if (callback) callback();
			}).bind(this), 200);
		}


		/** 
		 * Show popover over the given coordinates
		 */
		TuningScreen.prototype.showPopover = function( pos, machinePartID ) {

			// Find out what tunables are in this machine part
			var details = DB.cache['definitions']['machine-parts'][machinePartID];
			this.tuningPanel.onTuningPanelDefined( details.description.title, this.machinePartTunables[machinePartID] );
			this.tuningPanel.onTuningValuesDefined( this.values );
			this.tuningPanel.onTuningMarkersDefined( this.markers );

			// Add back-blur fx on the machine DOM
			this.machineDOM.addClass("fx-backblur");

			// Calculate centered coordinates
			var sz_w = this.tuningPanel.width, 
				sz_h = this.tuningPanel.height,
				x = pos.left, y = pos.top;

			// Wrap inside screen coordinates
			if (x - sz_w/2 < 0) x = sz_w/2;
			if (y - sz_h/2 < 0) y = sz_h/2;
			if (x + sz_w/2 > this.width) x = this.width - sz_w/2;
			if (y + sz_h/2 > this.height) y = this.height - sz_h/2;

			// Apply position
			this.tunableGroup.css(this.popoverPos = pos);

			// Prepare show sequence
			this.tuningMask.show();
			this.tunableGroup.addClass("animating");
			setTimeout((function() {
				this.tuningPanel.onResize(sz_w, sz_h);
				this.tuningPanel.onWillShow((function() {
					// Make element animated
					this.tunableGroup.removeClass("hidden");
					// Add css
					this.tunableGroup.css({
						'left': x,
						'top': y
					});				
					// Shown
					this.tuningPanel.onShown();
				}).bind(this));

			}).bind(this), 10);

		}

		/** 
		 * Configure machine for either ee or ppbar
		 */
		TuningScreen.prototype.setMachineConfiguration = function( configMode ) {
			var index = this.machineConfigModes.indexOf( configMode );
			if (index < 0) return;

			// Reset all buttons
			for (var i=0; i<this.machineConfigBtns.length; i++) {
				this.machineConfigBtns[i].removeClass("btn-striped");
			}
			this.machineConfigBtns[index].addClass("btn-striped");

			// Update backdrop machine configuration
			this.machine.onMachineConfigChanged({
				'beam': configMode
			});

			// Pick the appropriate labSocket
			this.lab = APISocket.openLabsocket("3e63661c13854de7a9bdeed71be16bb9");
			this.lab.on('histogramAdded', (function(data, ref) {

			}).bind(this));
			this.lab.on('histogramsUpdated', (function(histos) {

				// Calculate the Chi2 over all histograms
				var chi2 = 0;
				for (var i=0; i<histos.length; i++) {
					var v = Calculate.chi2(histos[i].data, histos[i].ref.data);
					chi2 += v;
				}
				chi2 /= histos.length;

				// Classify and display
				var msg = "Bad";
				if (chi2 < 1) {
					msg = "Perfect";
				} else if (chi2 < 2) {
					msg = "Good";
				} else if (chi2 < 4) {
					msg = "Fair";
				}
				msg += "(" + chi2.toFixed(2) + ")";

				// Print result
				this.panelStatus.text(msg);

			}).bind(this));

		}

		/** 
		 * Submit results for estimation
		 */
		TuningScreen.prototype.estimateResults = function() {

			// Submit for interpolation
			this.lab.beginSimulation( this.values, true );

			// Enable view option
			this.btnView.removeClass("disabled");

			// Save user values
			User.saveSlotValues("L", this.values);

			// Update 'L' markers
			for (k in this.values) {
				if (typeof(this.values[k]) != 'number') continue;
				this.markers[k]['L'] = this.values[k];
			}

		}

		/** 
		 * Define the parameters of the machine
		 */
		TuningScreen.prototype.onTuningConfigUpdated = function( tuningConfig ) {

			// ============================
			// Machine configurations
			// ============================

			// First update enabled machine configurations
			this.machineConfigurationsEnabled = {};
			for (var i=0; i<tuningConfig.configurations.length; i++) {
				var cfgName = tuningConfig.configurations[i];
				this.machineConfigurationsEnabled[cfgName] = true;
			}

			// Then update UI to reflect the configurations
			if (!this.machineConfigurationsEnabled['sim-interpolate']) {
				this.btnEstimate.addClass("disabled");
			} else {
				this.btnEstimate.removeClass("disabled");
			}
			if (!this.machineConfigurationsEnabled['sim-run']) {
				this.btnSubmit.addClass("disabled");
			} else {
				this.btnSubmit.removeClass("disabled");
			}

			// Update machine modes
			for (var i=0; i<this.machineConfigBtns.length; i++) {
				this.machineConfigBtns[i].addClass("disabled");
				this.machineConfigBtns[i].removeClass("btn-striped");
			}

			// Enable mode buttons
			var lastMode = "";
			if (this.machineConfigurationsEnabled['beam-ee']) {
				this.machineConfigBtns[0].removeClass("disabled");
				lastMode = "beam-ee";
			}
			if (this.machineConfigurationsEnabled['beam-ppbar']) {
				this.machineConfigBtns[1].removeClass("disabled");
				lastMode = "beam-ppbar";
			}
			this.setMachineConfiguration(lastMode.substr(5));

			// ============================
			// Machine parts & Tunables
			// ============================

			// Reset tunable values
			this.values = {};
			this.markers = {};

			// First update enabled machine parts
			this.machinePartsEnabled = {};
			for (var i=0; i<tuningConfig.machineParts.length; i++) {
				var partName = tuningConfig.machineParts[i].part,
					tunables = tuningConfig.machineParts[i].tunables;
				this.machinePartsEnabled[partName] = true;
				this.machinePartTunables[partName] = tunables;

				// Place tunable values on map
				for (var i=0; i<tunables.length; i++) {
					this.values[tunables[i]['_id']] = tunables[i]['def'] || tunables[i]['value']['min'] || 0.0;
				}
			}

			// Then update interface
			this.machine.onMachinePartsEnabled( this.machinePartsEnabled );

			// Reset btnView, because we don't have any data yet
			this.btnView.addClass("disabled");

			// ============================
			// Initialize values
			// ============================

			// Get save slot values
			User.getSlotValues("L", (function(values) {
				
				// Prepare markers
				var markers = {};

				// Update local values
				for (k in values) {
					this.values[k] = values[k];
					markers[k] = {
						'L': values[k]
					};
				}

				// Update markers
				this.markers = markers;


			}).bind(this));


		}


		// Register home screen
		R.registerComponent( "screen.tuning", TuningScreen, 1 );

	}

);
