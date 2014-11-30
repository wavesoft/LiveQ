
define(

	// Requirements
	["jquery", "core/db", "core/ui", "core/global", "core/user", "core/config", "core/registry", "core/base/components", "core/apisocket"],

	/**
	 * Basic version of the team screen
	 *
	 * @exports basic/components/screem_team
	 */
	function($, DB, UI, Global, User, config, R,C, API) {

		/**
		 * @class
		 * @classdesc The basic team screen
		 */
		var TeamScreen = function( hostDOM ) {
			C.TeamScreen.call(this, hostDOM);

			// Prepare host
			hostDOM.addClass("team team-machines");

			// Prepare locals
			this.session = null;

			// Team header
			$('<h1><span class="highlight">Team</span> Computing Elements</h1><div class="subtitle">Oversee the computing power of your team and control your resources.</div>').appendTo(hostDOM);

			// Team list
			this.eListHost = $('<div class="table-list table-scroll table-lg"></div>').appendTo(hostDOM);
			this.eListTable = $('<table></table>').appendTo(this.eListHost);
			this.eListHeader = $('<thead><tr><th class="col-3">ID</th><th class="col-3">User</th><th class="col-3">Jobs Handled</th><th class="col-3">Status</th></tr></thead>').appendTo(this.eListTable);
			this.eListBody = $('<tbody></tbody>').appendTo(this.eListTable);

			for (var i=0; i<10; i++) {
				this.addMachine({
					'id'     : 'machine-'+i,
					'user'	 : 'User',
					'status' : 'Inactive',
					'jobs'   : '0',
				});
			}

			// Team switch buttons
			this.btnUsers = $('<button class="p-users btn-shaded btn-darkblue btn-with-icon"><span class="glyphicon glyphicon-user"></span><br />Team</button>').appendTo(hostDOM);
			this.btnMachines = $('<button class="p-machines disabled btn-shaded btn-darkblue btn-with-icon"><span class="glyphicon glyphicon-cog"></span><br />Machines</button>').appendTo(hostDOM);
			this.btnNotebook = $('<button class="p-notebook btn-shaded btn-darkblue btn-with-icon"><span class="glyphicon glyphicon-edit"></span><br />Notebook</button>').appendTo(hostDOM);
			this.btnMessages = $('<button class="p-messages btn-shaded btn-darkblue btn-with-icon"><span class="glyphicon glyphicon-comment"></span><br />Messages</button>').appendTo(hostDOM);
			this.btnUsers.click((function() {
				this.trigger("changeScreen", "screen.team.people", UI.Transitions.MOVE_LEFT);
			}).bind(this))
			this.btnNotebook.click((function() {
				this.trigger("changeScreen", "screen.team.notebook", UI.Transitions.MOVE_RIGHT);
			}).bind(this))
			this.btnMessages.click((function() {
				this.trigger("changeScreen", "screen.team.messages", UI.Transitions.MOVE_RIGHT);
			}).bind(this))

			// Prepare machine panel
			var controlHost = $('<div class="controls"></div>').appendTo(hostDOM);
			this.statusPanel = $('<div class="status-panel p-status">').appendTo(controlHost);
				this.statusIcon = $('<div class="icon"></div>').appendTo(this.statusPanel);
				this.statusTitle = $('<div class="title">Machine disabled</div>').appendTo(this.statusPanel);
				this.statusLabel = $('<div class="label">Your computing instance is disabled.</div>').appendTo(this.statusPanel);
				this.statusProgress = $('<div class="progress"></div>').appendTo(this.statusPanel);
				this.statusBar = $('<div class="bar"></div>').appendTo(this.statusProgress);

			// Control box
			this.controlPanel = $('<div class="control-panel">').appendTo(controlHost);
				this.btnStart = $('<button class="btn-shaded btn-green btn-with-icon"><span class="glyphicon glyphicon-play"></span><br />Start</button>').appendTo(this.controlPanel);
				this.btnPause = $('<button class="btn-shaded btn-green btn-with-icon"><span class="glyphicon glyphicon-pause"></span><br />Pause</button>').appendTo(this.controlPanel);
				this.btnStop = $('<button class="btn-shaded btn-green btn-with-icon"><span class="glyphicon glyphicon-stop"></span><br />Stop</button>').appendTo(this.controlPanel);
				this.btnActivate = $('<button class="pull-right btn-shaded btn-green btn-with-icon"><span class="glyphicon glyphicon-off"></span><br />Activate</button>').appendTo(this.controlPanel);
				this.btnDeactivate = $('<button class="pull-right btn-shaded btn-red btn-with-icon"><span class="glyphicon glyphicon-off"></span><br />Dectivate</button>').appendTo(this.controlPanel);

			// Update local machine status when user is logged in
			this.setMachineStatus(-2);
			Global.events.on('login', (function() {
				this.updateLocalMachineStatus();
			}).bind(this));

			// Activate CernVM WebAPI if requested
			this.btnActivate.click((function() {
				localStorage.setItem("vas-localmachine-autostart", "1");
				this.updateLocalMachineStatus();
			}).bind(this));
			this.btnDeactivate.click((function() {
				localStorage.removeItem("vas-localmachine-autostart");
				this.updateLocalMachineStatus();
			}).bind(this));

			this.btnStart.click((function() {
				if (this.session) this.session.start();
			}).bind(this));
			this.btnPause.click((function() {
				if (this.session) this.session.hibernate();
			}).bind(this));
			this.btnStop.click((function() {
				if (this.session) this.session.stop();
			}).bind(this));


		}
		TeamScreen.prototype = Object.create( C.TeamScreen.prototype );

		/**
		 * Update status panel
		 */
		TeamScreen.prototype.setMachineStatus = function(state, message, value) {
			var buttonsEnabled = true;

			this.statusProgress.hide();

			if (state == -4) {
				// PROGRESS
				this.statusIcon.html('<span class="glyphicon glyphicon-time"></span>');
				this.statusTitle.text("In progress");
				this.statusLabel.text(message);
				this.statusProgress.show();
				this.statusBar.css({ 'width': String(100*value) + '%' });
				buttonsEnabled = false;
			} else if (state == -3) {
				// ERROR
				this.statusIcon.html('<span class="glyphicon glyphicon-time"></span>');
				this.statusTitle.text("Machine Error");
				this.statusLabel.text(message);
			} else if (state == -2) {
				// DISABLED
				this.statusIcon.html('<span class="glyphicon glyphicon-off"></span>');
				this.statusTitle.text("Machine deactivated");
				this.statusLabel.text("You are not running any local computing element. Click activate to start.");
				buttonsEnabled = false;
			} else if (state == -1) {
				// STARTING
				this.statusIcon.html('<span class="glyphicon glyphicon-resize-small"></span>');
				this.statusTitle.text("Contacting CernVM WebAPI");
				this.statusLabel.text("We are trying to contact CernVM WebAPI that controls your local computing element.");
				buttonsEnabled = false;
			} else if (state == 0) {
				// MISSING
				this.statusIcon.html('<span class="glyphicon glyphicon-stop"></span>');
				this.statusTitle.text("Machine not installed");
				this.statusLabel.text("Your local computing element is ready to be configured but not yet installed.");
			} else if (state == 1) {
				// AVAILABLE
				this.statusIcon.html('<span class="glyphicon glyphicon-stop"></span>');
				this.statusTitle.text("Machine installed");
				this.statusLabel.text("Your local computing element is installed but not yet started.");
			} else if (state == 2) {
				// POWEROFF
				this.statusIcon.html('<span class="glyphicon glyphicon-stop"></span>');
				this.statusTitle.text("Machine powered off");
				this.statusLabel.text("Your local computing element is available but not started.");
			} else if (state == 3) {
				// SAVED
				this.statusIcon.html('<span class="glyphicon glyphicon-floppy-disk"></span>');
				this.statusTitle.text("Machine suspended");
				this.statusLabel.text("Your local computing element is suspended to disk");
			} else if (state == 4) {
				// PAUSED
				this.statusIcon.html('<span class="glyphicon glyphicon-floppy-disk"></span>');
				this.statusTitle.text("Machine paused");
				this.statusLabel.text("Your local computing element is paused.");
			} else if (state == 5) {
				// RUNNING
				this.statusIcon.html('<span class="glyphicon glyphicon-play"></span>');
				this.statusTitle.text("Machine running");
				this.statusLabel.text("Your computing element is running");
			}

			// Enable/disable buttons
			if (buttonsEnabled) {
				this.btnStart.removeClass("disabled");
				this.btnPause.removeClass("disabled");
				this.btnStop.removeClass("disabled");
			} else {
				this.btnStart.addClass("disabled");
				this.btnPause.addClass("disabled");
				this.btnStop.addClass("disabled");
			}

		}

		/**
		 * Show try to initialize machine
		 */
		TeamScreen.prototype.updateLocalMachineStatus = function() {

			// Initialize local machine according to the cached version
			if (localStorage.getItem("vas-localmachine-autostart")) {
				this.btnActivate.hide();
				this.btnDeactivate.show();
				this.setMachineStatus(-1);

				// Start CernVM WebAPI
				if (!this.session) {
					this.initWebAPI();
				}

			} else {
				this.btnActivate.show();
				this.btnDeactivate.hide();
				this.setMachineStatus(-2);

				// Destroy session if already running
				if (this.session) {
					this.session.close();
					this.session = null;
				}

			}

		}

		/**
		 * Communicate with CernVM WebAPI
		 */
		TeamScreen.prototype.initWebAPI = function(callback) {

			// Initialize CernVM WebAPI & Callback when ready
			CVM.startCVMWebAPI((function(api) {

				// Handle progress
				api.addEventListener('failed', (function(errorMessage) {
					if (!this.session) return;
					this.setMachineStatus(-3, errorMessage);
				}).bind(this));
				api.addEventListener('progress', (function(progressMessage, progressValue) {
					if (!this.session) return;
					this.setMachineStatus(-4, progressMessage, progressValue);
				}).bind(this));

				// Request a session through our VMC endpoint
				api.requestSession('http://test4theory.cern.ch/vmcp?config=liveq-machine&group=global', (function(session) {

					// Keep session reference
					this.session = session;

					// Handle progress
					session.addEventListener('failed', (function(errorMessage) {
						if (!this.session) return;
						this.setMachineStatus(-3, errorMessage);
					}).bind(this));
					session.addEventListener('progress', (function(progressMessage, progressValue) {
						if (!this.session) return;
						this.setMachineStatus(-4, progressMessage, progressValue);
					}).bind(this));

					// Listen for state changed events
					session.addEventListener('stateChanged', (function(newState) {
						if (!this.session) return;
						// Set machine status
						this.setMachineStatus(newState);
					}).bind(this));

				}).bind(this));
			}).bind(this));

		}

		/**
		 * Add a person in the team screen
		 */
		TeamScreen.prototype.addMachine = function(person) {
			var row = $('<tr></tr>'),
				c1 = $('<td class="col-3"><span class="glyphicon glyphicon-cog"></span> ' + person['id'] + '</td>').appendTo(row),
				c2 = $('<td class="col-3">' + person['user'] + '</td>').appendTo(row),
				c3 = $('<td class="col-3">' + person['jobs'] + '</td>').appendTo(row),
				c3 = $('<td class="col-3">' + person['status'] + '</td>').appendTo(row);

			// Populate fields

			this.eListBody.append(row);
		}

		// Register home screen
		R.registerComponent( "screen.team.machines", TeamScreen, 1 );

	}

);
