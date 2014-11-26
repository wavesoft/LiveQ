
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
		var TuningScreen = function( hostDOM ) {
			C.TuningScreen.call(this, hostDOM);

			// Prepare host
			hostDOM.addClass("tuning2");

			// ---------------------------------
			// Create machine backdrop
			// ---------------------------------

			// Create a machine
			this.machineDOM = $('<div class="fullscreen fx-animated"></div>').appendTo(hostDOM);
			this.machine = R.instanceComponent("backdrop.machine", this.machineDOM);
			this.forwardVisualEvents( this.machine, { 'left':0, 'top': 0, 'width': '100%', 'height': '100%' } );
			
			// Setup machine
			this.machine.onTopicTreeUpdated({
				'issr': true
			});

			this.machine.on('click', (function(eid, pos) {
				this.showPopover(pos);
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
					this.descTitle.text(details['description']['title']);
					this.descBody.html(details['description']['body']);
				}
			}).bind(this));

			// Create course button
			this.btnCourse = $('<button class="btn-course btn-shaded btn-teal btn-with-icon"><span class="glyphicon glyphicon-book"></span><br />Course</button>').appendTo(descFrame);
			this.btnCourse.click((function(e) {
				UI.selectScreen("screen.courseroom");
			}).bind(this));

			// ---------------------------------
			// Create a control board
			// ---------------------------------

			var boardHost = $('<div class="control-board"></div>').appendTo(hostDOM),
				descBoard = $('<div></div>').appendTo(boardHost);

			$('<button class="btn-shaded btn-with-icon btn-red"><span class="glyphicon glyphicon-unchecked"></span><br />Estimate</button>').appendTo(descBoard);
			$('<button class="btn-shaded btn-with-icon btn-red btn-striped "><span class="glyphicon glyphicon-expand"></span><br />Submit</button>').appendTo(descBoard);
			$('<div class="panel-shaded">Good Fit</div>').appendTo(descBoard);
			$('<button class="btn-shaded btn-with-icon btn-darkblue"><span class="glyphicon glyphicon-dashboard"></span><br />View</button>').appendTo(descBoard);

			// Create help button
			this.btnHelp = $('<button class="btn-help btn-shaded btn-teal btn-with-icon"><span class="glyphicon glyphicon-bookmark"></span><br />Help</button>').appendTo(hostDOM);
			this.btnHelp.click((function() {
				this.descFrame.toggleClass("visible");
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
		TuningScreen.prototype.showPopover = function( pos ) {

			// Define tuning panel
			var elm = [];
			for (var i=0; i<Math.round(Math.random()*50); i++) {
				elm.push(1);
			}
			this.tuningPanel.onTuningPanelDefined("Test Panel", elm);

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


		// Register home screen
		R.registerComponent( "screen.tuning", TuningScreen, 1 );

	}

);
