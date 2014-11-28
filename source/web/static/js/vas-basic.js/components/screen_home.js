
define(

	// Requirements
	["jquery", "d3", "core/db", "core/ui", "core/config", "core/registry", "core/base/components"],

	/**
	 * Basic version of the home screen
	 *
	 * @exports basic/components/explain_screen
	 */
	function($, d3, DB, UI, config, R,C) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var HomeScreen = function( hostDOM ) {
			C.HomeScreen.call(this, hostDOM);

			// Prepare host
			hostDOM.addClass("home");

			// ---------------------------------
			// Create status sidescreen
			// ---------------------------------
			this.sideScreenDOM = $('<div class="side-screen"></div>').appendTo(hostDOM);
			this.bgSlice = $('<div class="bg-slice"></div>').appendTo(this.sideScreenDOM);

			// ---------------------------------
			// Create the globe backdrop
			// ---------------------------------
			this.statusScreenDOM = $('<div class="observable-short"></div>').appendTo(this.sideScreenDOM);
			this.statusScreen = R.instanceComponent("screen.observable.short", this.statusScreenDOM);
			this.forwardVisualEvents(this.statusScreen);

			// ---------------------------------
			// Prepare status fields and buttons
			// ---------------------------------

			// Setup inputs
			this.statusMachines = $('<div class="status-label p-machines"></div>').appendTo(this.sideScreenDOM);
			$('<div class="panel-label">Connected machines</div>').appendTo(this.statusMachines);
			this.statusMachinesValue = $('<div class="panel-value">0</div>').appendTo(this.statusMachines);

			this.statusEvents = $('<div class="status-label p-events"></div>').appendTo(this.sideScreenDOM);
			$('<div class="panel-label">Live event rate</div>').appendTo(this.statusEvents);
			this.statusEventsValue = $('<div class="panel-value">0</div>').appendTo(this.statusEvents);

			this.statusProgress = $('<div class="status-label p-progress"></div>').appendTo(this.sideScreenDOM);
			$('<div class="panel-label">Progress</div>').appendTo(this.statusProgress);
			this.statusProgressValue = $('<div class="panel-value">0</div>').appendTo(this.statusProgress);

			this.btnAbort = $('<button class="p-abort btn-shaded btn-red btn-striped btn-with-icon"><span class="glyphicon glyphicon-remove-circle"></span><br />Abort</button>').appendTo(this.sideScreenDOM);
			this.btnView = $('<button class="p-view btn-shaded btn-darkblue btn-with-icon"><span class="glyphicon glyphicon-dashboard"></span><br />View</button>').appendTo(this.sideScreenDOM);

			// ---------------------------------
			// Main menu links
			// ---------------------------------

			// Main buttons
			this.btnMachine = $('<button class="p-go-machine btn-shaded btn-teal btn-with-icon"><span class="glyphicon glyphicon-cog"></span><br />Machine</button>').appendTo(hostDOM);
			this.btnCourse = $('<button class="p-go-course btn-shaded btn-teal btn-with-icon"><span class="glyphicon glyphicon-book"></span><br />Course</button>').appendTo(hostDOM);
			this.btnCafe = $('<button class="p-go-cafe btn-shaded btn-teal btn-with-icon"><span class="glyphicon glyphicon-user"></span><br />Team</button>').appendTo(hostDOM);
			this.btnMachine.click((function() {
				this.trigger("changeScreen", "screen.tuning");
			}).bind(this))
			this.btnCourse.click((function() {
				this.trigger("showCourses");
			}).bind(this))
			this.btnCafe.click((function() {
				this.trigger("changeScreen", "screen.team.people");
			}).bind(this))

			// ---------------------------------
			// Prepare jobs list
			// ---------------------------------

			// Prepare list
			this.eListHost = $('<div class="table-list table-scroll table-lg"></div>').appendTo(hostDOM);
			this.eListTable = $('<table></table>').appendTo(this.eListHost);
			this.eListHeader = $('<thead><tr><th class="col-6">Alias</th><th class="col-3">Score</th><th class="col-3">Actions</th></tr></thead>').appendTo(this.eListTable);
			this.eListBody = $('<tbody></tbody>').appendTo(this.eListTable);

			// Job legend
			$('<div class="legend">Past, current and scheduled attemts</div>').appendTo(hostDOM);

			// Submit
			this.btnSubmit = $('<button class="p-submit btn-shaded btn-teal btn-with-icon"><span class="glyphicon glyphicon-send"></span><br />Submit selected results</button>').appendTo(hostDOM);

			for (var i=0; i<10; i++) {
				this.addJob({
					'name'   : 'random-user-'+i,
					'score'  : '4.3120'
				});
			}

			// ---------------------------------
			// Jobs list
			// ---------------------------------

			// List
			this.listJobs = $('<div class="list-jobs"></div>').appendTo(this.hostDOM);

		}
		HomeScreen.prototype = Object.create( C.HomeScreen.prototype );


		/**
		 * Add a job in the status screen
		 */
		HomeScreen.prototype.addJob = function( job ) {
			var row = $('<tr></tr>'),
				c1 = $('<td class="col-6"><span class="glyphicon glyphicon-edit"></span> ' + job['name'] + '</td>').appendTo(row),
				c2 = $('<td class="col-3">' + job['score'] + '</td>').appendTo(row),
				c3 = $('<td class="col-3 text-right"></td>').appendTo(row),
				b1 = $('<button class="btn-shaded btn-yellow"><span class="glyphicon glyphicon-trash"></span> Abort</button>').appendTo(c3);

			// Select on click
			row.click((function() {
				this.eListBody.children("tr").removeClass("selected");
				row.addClass("selected");
			}).bind(this));

			// Populate fields
			this.eListBody.append(row);
		}

		/**
		 * Resize window
		 */
		HomeScreen.prototype.onResize = function( width, height ) {
			this.width = width;
			this.height = height;

			// Calculate inner radius size
			var inPad = 45,
				inW = this.width * 0.6,
				inH = this.height - inPad*2;

			// Resize status screen
			this.statusScreen.onMove( 0, inPad );
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

		// Register home screen
		R.registerComponent( "screen.home", HomeScreen, 1 );

	}

);
