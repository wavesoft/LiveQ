
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
			var btnHome = $('<button class="btn-shaded btn-teal"><span class="glyphicon glyphicon-home"></span></button>')
			hostDOM.append(btnHome);

			// When clicked, goto home
			hostDOM.click((function(e) {
				e.preventDefault();
				e.stopPropagation();

				// Fire the changeScreen event
				this.trigger("changeScreen", "screen.home");

			}).bind(this));

			// Prepare credit menu
			this.elmCredit = $('<div class="credits"></div>').appendTo(hostDOM);

			// Register on profile updates
			User.on('profile', (function(profile) {
				// Update credits
				this.elmCredit.text( profile['credits'] );
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
				"screen.knowlege"
			];

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