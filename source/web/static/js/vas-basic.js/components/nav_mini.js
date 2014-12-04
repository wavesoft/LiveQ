
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
			this.btnHome = $('<button class="btn-shaded btn-teal"><span class="glyphicon glyphicon-home"></span></button>').appendTo(this.hostDOM);
			this.btnNotes = $('<button class="btn-shaded btn-orange"><span class="glyphicon glyphicon-envelope"></span></button>').appendTo(this.hostDOM);
			this.elmNotebook = $('<textarea class="notepad"></textarea>').appendTo(this.hostDOM);

			// Setup navigation buttons
			this.btnHome.click((function(e) {
				this.trigger("changeScreen", "screen.home");
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
				"screen.knowledge"
			];

			// Show/hide appropriate screens
			if (to == "screen.tuning") {
				this.btnTuning.hide();
				this.btnHome.show();
				this.btnKnowlege.show();
			} else if (to == "screen.knowledge") {
				this.btnKnowlege.hide();
				this.btnTuning.show();
				this.btnHome.show();
			} else {
				this.btnHome.hide();
				this.btnTuning.show();
				this.btnKnowlege.show();
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