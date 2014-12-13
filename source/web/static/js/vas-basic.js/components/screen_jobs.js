
define(

	// Requirements
	["jquery", "d3", "core/db", "core/ui", "core/apisocket", "core/config", "core/registry", "core/base/components"],

	/**
	 * Basic version of the jobs screen
	 *
	 * @exports basic/components/explain_screen
	 */
	function($, d3, DB, UI, APISocket, config, R,C) {

		/**
		 * @class
		 * @classdesc The basic jobs screen
		 */
		var JobsScreen = function( hostDOM ) {
			C.HomeScreen.call(this, hostDOM);

			// Prepare propertis
			this.__debug__jobTune = null;
			this.histogramLookup = {};
			this.lastHistograms = null;
			this.numConnectedMachines = 0;
			this.lastEvents = 0;
			this.lastEventsTime = 0;
			this.rateRing = [];

			// Prepare host
			hostDOM.addClass("jobs");

			// Setup the registration form
			$('<h1><span class="highlight">Validation</span> Dashboard</h1>').appendTo(hostDOM);
			$('<p>Here you can see the current validation status and your past attempts.</p>').appendTo(hostDOM);

			// ---------------------------------
			// Create status sidescreen
			// ---------------------------------
			this.sideScreenDOM = $('<div class="side-screen"></div>').appendTo(hostDOM);
			this.bgSlice = $('<div class="bg-slice"></div>').appendTo(this.sideScreenDOM);

			// ---------------------------------
			// Create the observable screen
			// ---------------------------------
			this.statusScreenDOM = $('<div class="observable-short"></div>').appendTo(this.sideScreenDOM);
			this.statusScreen = R.instanceComponent("screen.observable.short", this.statusScreenDOM);
			this.forwardVisualEvents(this.statusScreen);

			// ---------------------------------
			// Prepare status fields and buttons
			// ---------------------------------

			// Setup inputs
			this.statusMachines = $('<div class="panel-shaded status-label p-machines"></div>').appendTo(this.sideScreenDOM);
			$('<div class="panel-label">Connected machines</div>').appendTo(this.statusMachines);
			this.statusMachinesValue = $('<div class="panel-value">0</div>').appendTo(this.statusMachines);

			this.statusEvents = $('<div class="panel-shaded status-label p-events"></div>').appendTo(this.sideScreenDOM);
			$('<div class="panel-label">Live event rate</div>').appendTo(this.statusEvents);
			this.statusEventsValue = $('<div class="panel-value">0</div>').appendTo(this.statusEvents);

			this.statusProgress = $('<div class="panel-shaded status-label p-progress"></div>').appendTo(this.sideScreenDOM);
			$('<div class="panel-label">Progress</div>').appendTo(this.statusProgress);
			this.statusProgressValue = $('<div class="panel-value">0 %</div>').appendTo(this.statusProgress);

			// Panel abort and view buttons
			this.btnAbort = $('<button class="p-abort btn-shaded btn-red btn-striped btn-with-icon"><span class="glyphicon glyphicon-remove-circle"></span><br />Abort</button>').appendTo(this.sideScreenDOM);
			this.btnView = $('<button class="p-view btn-shaded btn-darkblue btn-with-icon"><span class="glyphicon glyphicon-dashboard"></span><br />View</button>').appendTo(this.sideScreenDOM);

			// Disable by default
			this.btnAbort.addClass("disabled");
			this.btnView.addClass("disabled");

			// Bind callbacks
			this.btnAbort.click((function() {
				if (this.lab) {
					this.lab.abortSimulation();
					this.interfaceUnbind();
				}
			}).bind(this));
			this.btnView.click((function() {
				if (this.lastHistograms) {
					// Show histograms overlay
					UI.showOverlay("overlay.histograms", (function(com) {
					}).bind(this)).onHistogramsDefined( this.lastHistograms );
				}
			}).bind(this));

			// ---------------------------------
			// Prepare jobs list
			// ---------------------------------

			// Prepare list
			this.eListHost = $('<div class="table-list table-scroll table-lg"></div>').appendTo(hostDOM);
			this.eListTable = $('<table></table>').appendTo(this.eListHost);
			this.eListHeader = $('<thead><tr><th class="col-6">Date</th><th class="col-3">Score</th><th class="col-3">Actions</th></tr></thead>').appendTo(this.eListTable);
			this.eListBody = $('<tbody></tbody>').appendTo(this.eListTable);

			// Prepare the progress status label
			this.eStatusLabel = $('<div class="panel-shaded p-run-status">---</div>').appendTo(hostDOM);

			// Submit
			this.btnSubmit = $('<button class="p-submit btn-shaded btn-red btn-with-icon disabled"><span></span><br />Submit for evaluation</button>').appendTo(hostDOM);

			// ---------------------------------
			// Jobs list
			// ---------------------------------

			// List
			this.listJobs = $('<div class="list-jobs"></div>').appendTo(this.hostDOM);


		}
		JobsScreen.prototype = Object.create( C.HomeScreen.prototype );

		/**
		 * Add a job in the status screen
		 */
		JobsScreen.prototype.addJob = function( job ) {
			var row = $('<tr></tr>'),
				c1 = $('<td class="col-6"><span class="glyphicon glyphicon-edit"></span> ' + job['name'] + '</td>').appendTo(row),
				c2 = $('<td class="col-3">' + job['score'] + '</td>').appendTo(row),
				c3 = $('<td class="col-3 text-right"></td>').appendTo(row)
				b1 = $('<button class="btn-shaded btn-yellow disabled"><span class="glyphicon glyphicon-eye-open"></span></button>').appendTo(c3);

			// Select on click
			row.click((function() {
				this.eListBody.children("tr").removeClass("selected");
				row.addClass("selected");
			}).bind(this));

			// Populate fields
			this.eListBody.append(row);
		}

		/**
		 * Unbind interface from a job feedback
		 */
		JobsScreen.prototype.interfaceUnbind = function() {

			// Disable buttons
			this.btnView.addClass("disabled");
			this.btnAbort.addClass("disabled");

			// Reset status screen
			this.statusScreen.onObservablesReset();

			// Reset status messages
			this.eStatusLabel.text("---");
			this.statusMachinesValue.text("0");
			this.statusEventsValue.text("0");
			this.statusProgressValue.text("0 %");

			// Reset properties
			this.numConnectedMachines = 0;
			this.lastEventsTime = 0;
			this.lastEvents = 0;
			this.rateRing = [];

		}

		/**
		 * Add a job in the status screen
		 */
		JobsScreen.prototype.__debug__setJobDetails = function( details ) {
			this.__debug__jobTune = details;
		}

		/**
		 * Resize window
		 */
		JobsScreen.prototype.onResize = function( width, height ) {
			this.width = width;
			this.height = height;

			// Calculate inner radius size
			var inPad = 45,
				inW = this.width * 0.6,
				inH = this.height - inPad*2;

			// Resize status screen
			this.statusScreen.onMove( 0, inPad + 40 );
			this.statusScreen.onResize( inW, inH );

			// Resize background graphics
			var sz = Math.max(inW, inH) - 100;
			this.bgSlice.css({
				'height': 2*sz,
				'width': 2*sz,
				'left': width*0.6 - sz*2,
				'top': this.height/2 - sz,
				// Border-radius
				'borderRadius': sz,
				'mozBorderRadius': sz,
				'webkitBorderRadius': sz,
				'mzBorderRadius': sz
			});


		}

		/**
		 * Abort simulatio on unload
		 */
		JobsScreen.prototype.onWillHide = function(cb) {
			if (this.lab) {
				this.interfaceUnbind();
				this.lab.abortSimulation();
				this.__debug__jobTune = null;
			}
			cb();
		}

		/**
		 * Initialize lab on load
		 */
		JobsScreen.prototype.onWillShow = function(cb) {

			// Reset observables
			this.statusScreen.onObservablesReset();

			// Open labsocket for testing
			this.lab = APISocket.openLabsocket("3e63661c13854de7a9bdeed71be16bb9");

			// Register histograms
			this.lab.on('histogramAdded', (function(data, ref) {
				this.statusScreen.onObservableAdded(data, ref);
			}).bind(this));
			this.lab.on('histogramUpdated', (function(data, ref) {
				this.statusScreen.onObservableUpdated(data, ref);
			}).bind(this));
			this.lab.on('histogramsUpdated', (function(histos) {
				this.lastHistograms = histos;
				this.btnView.removeClass("disabled");
				this.eStatusLabel.text("RUNNING");
			}).bind(this));
			this.lab.on('metadataUpdated', (function(meta) {
				var currNevts = parseInt(meta['nevts']),
					progValue = currNevts / 40000;
				this.statusProgressValue.text( Math.round(progValue) + " %" );

				// Calculate rate
				var currTime = Date.now();
				if (this.lastEventsTime) {
					var deltaEvts = currNevts - this.lastEvents,
						deltaTime = currTime - this.lastEventsTime,
						rate = deltaEvts * 1000 / deltaTime,
						avgRate = 0;

					// Average with ring buffer
					this.rateRing.push(rate);
					if (this.rateRing.length > 10) this.rateRing.shift();
					for (var i=0; i<this.rateRing.length; i++) 
						avgRate += this.rateRing[i];
					avgRate /= this.rateRing.length;

					// Update average event rate
					this.statusEventsValue.text( Math.round(avgRate) + " /s" );
				}
				this.lastEventsTime = currTime;
				this.lastEvents = currNevts;

			}).bind(this));

			// Show/Hide workers
			this.lab.on('log', (function(logLine, telemetryData) {
				if (telemetryData['agent_added']) {
					this.statusScreen.onWorkerAdded(telemetryData['agent_added'],
					{
						'lat' : Math.random() * 180 - 90,
						'lng' : Math.random() * 180
					});
					this.numConnectedMachines++;
					this.statusMachinesValue.text(this.numConnectedMachines);
				} else if (telemetryData['agent_removed']) {
					this.statusScreen.onWorkerRemoved(telemetryData['agent_removed']);
					this.numConnectedMachines--;
					this.statusMachinesValue.text(this.numConnectedMachines);
				}
				console.log(">>> ",logLine,telemetryData);
			}).bind(this));

			// Check if we should start a job
			this.eListBody.empty();
			if (this.__debug__jobTune) {
				this.lab.beginSimulation( this.__debug__jobTune, false );
				this.eStatusLabel.text("SUBMITTED");
				this.statusScreen.globe.setPaused(false);
				this.btnAbort.removeClass("disabled");

				this.addJob({
					'name'   : new Date().toLocaleString(),
					'score'  : 'running'
				});

			}

			cb();

		}

		// Register jobs screen
		R.registerComponent( "screen.jobs", JobsScreen, 1 );

	}

);
