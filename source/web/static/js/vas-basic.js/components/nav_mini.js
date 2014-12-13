
define(

	// Requirements
	["core/registry", "core/base/components", "core/ui", "core/user"],

	/**
	 * Basic version of the home screen
	 *
	 * @exports basic/components/nav_mini
	 */
	function(R,C,UI,User) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var NavMini = function( hostDOM ) {
			C.Nav.call(this, hostDOM);

			// Put the home icon
			this.btnKnowlege = $('<button class="btn-shaded btn-teal"><span class="glyphicon glyphicon-book"></span></button>').appendTo(this.hostDOM);
			this.btnTuning = $('<button class="btn-shaded btn-teal"><span class="glyphicon glyphicon-dashboard"></span></button>').appendTo(this.hostDOM);
			this.btnHome = $('<button class="btn-shaded btn-blue"><span class="glyphicon glyphicon-home"></span></button>').appendTo(this.hostDOM);
			this.btnJobs = $('<button class="btn-shaded btn-teal"><span class="glyphicon glyphicon-expand"></span></button>').appendTo(this.hostDOM);
			this.btnNotes = $('<button class="btn-shaded btn-orange"><span class="glyphicon glyphicon-envelope"></span></button>').appendTo(this.hostDOM);
			this.elmNotebook = $('<textarea class="notepad"></textarea>').appendTo(this.hostDOM);

			// Setup navigation buttons
			this.btnHome.click((function(e) {
				this.trigger("displayMenu");
			}).bind(this));
			this.btnJobs.click((function(e) {
				this.trigger("displayJobs");
			}).bind(this));
			this.btnKnowlege.click((function(e) {
				this.trigger("displayKnowledge");
			}).bind(this));
			this.btnTuning.click((function(e) {
				this.trigger("displayTuningScreen");
			}).bind(this));
			this.btnNotes.click((function(e) {
				this.hostDOM.toggleClass("expand-notepad");
				if (this.hostDOM.hasClass("expand-notepad")) {
					this.btnNotes.attr("class", "btn-shaded btn-yellow");
				} else {
					this.btnNotes.attr("class", "btn-shaded btn-orange");
				}
			}).bind(this));

			// Register visua aids
			R.registerVisualAid("mininav.knowledge", this.btnKnowlege, {
				onBeforeFocus: function() { hostDOM.addClass("focus"); },
				onBlur: function() { hostDOM.removeClass("focus"); }
			});
			R.registerVisualAid("mininav.tuning", this.btnTuning, {
				onBeforeFocus: function() { hostDOM.addClass("focus"); },
				onBlur: function() { hostDOM.removeClass("focus"); }
			});
			R.registerVisualAid("mininav.home", this.btnHome, {
				onBeforeFocus: function() { hostDOM.addClass("focus"); },
				onBlur: function() { hostDOM.removeClass("focus"); }
			});
			R.registerVisualAid("mininav.jobs", this.btnJobs, {
				onBeforeFocus: function() { hostDOM.addClass("focus"); },
				onBlur: function() { hostDOM.removeClass("focus"); }
			});
			R.registerVisualAid("mininav.notes", this.btnNotes, {
				onBeforeFocus: function() { hostDOM.addClass("focus"); },
				onBlur: function() { hostDOM.removeClass("focus"); }
			});

			// Prepare credit menu
			this.elmCredit = $('<div class="credits"></div>').appendTo(hostDOM);

			// Register on profile updates
			User.on('profile', (function(profile) {
				// Update credits
				this.elmCredit.html( "Credits: <strong>" + profile['credits'].toString() + "</strong>" );
			}).bind(this));

			// Start fade out
			this.hostDOM.hide();
			this.visible = false;

		}
		NavMini.prototype = Object.create( C.Nav.prototype );

		/**
		 * Hide mini-nav when we are on home
		 */
		NavMini.prototype.onPageWillChange = function(from, to) {
			var valid_screens = [
				"screen.tuning", "screen.running",
				"screen.explain", "screen.courseroom",
				"screen.team.people", "screen.team.machines", 
				"screen.team.notebook", "screen.team.messages",
				"screen.knowledge", "screen.jobs", "screen.team"
			];

			var buttons = [
				this.btnHome, this.btnTuning, this.btnKnowlege, this.btnJobs
			];

			// Hide all buttons
			for (var i=0; i<buttons.length; i++) buttons[i].hide();

			// Show/hide appropriate screens
			if (to == "screen.tuning") {
				buttons[0].show();
				buttons[2].show();
			} else if (to == "screen.knowledge") {
				buttons[0].show();
				buttons[1].show();
			} else {
				buttons[0].show();
			}

			// This works on valid screen
			if (valid_screens.indexOf(to) >= 0) {
				this.hostDOM.fadeIn();
				this.visible = true;
			} else {
				this.hostDOM.fadeOut();
				this.visible = false;
			}
		}

		// Register home screen
		R.registerComponent( "nav.mini", NavMini, 1 );

	}

);