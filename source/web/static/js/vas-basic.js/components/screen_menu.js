
define(

	// Requirements
	["jquery", "core/db", "core/ui", "core/config", "core/registry", "core/base/component", "core/apisocket"],

	/**
	 * Basic version of the menu screen
	 *
	 * @exports basic/components/screem_menu
	 */
	function($, DB, UI, config, R, Component, API) {

		/**
		 * @class
		 * @classdesc The basic menu screen
		 */
		var MenuScreen = function( hostDOM ) {
			Component.call(this, hostDOM);

			// Prepare host
			hostDOM.addClass("menu");

			// Team header
			this.eHeader = $('<h1><span class="highlight">Game</span> Menu</h1><div class="subtitle">From here you can select miscelaneous actions.</div>').appendTo(hostDOM);

			// Create a random color
			var random_color = function(a) {
				return "rgba("
					+ Math.round(Math.random() * 255) + ","
					+ Math.round(Math.random() * 255) + ","
					+ Math.round(Math.random() * 255) + ","
					+ a + ")";
			};

			// Create a set of bubbles
			this.bubbles = [];
			for (var i=0; i<20; i++) {
				var bubble = $('<div class="bubble"></div>').appendTo(this.hostDOM);
				bubble.css({
					'left': (Math.random() * 100) + "%",
					 'top': (Math.random() * 100) + "%",
				   'color': random_color(0.1 + Math.random() * 0.2)
				});
			}

		}
		MenuScreen.prototype = Object.create( Component.prototype );


		// Register home screen
		R.registerComponent( "screen.menu", MenuScreen, 1 );

	}

);
