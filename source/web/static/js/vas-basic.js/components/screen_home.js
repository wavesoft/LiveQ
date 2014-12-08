
define(

	// Requirements
	["jquery", "d3", "core/db", "core/ui", "core/apisocket", "core/config", "core/registry", "core/base/components"],

	/**
	 * Basic version of the home screen
	 *
	 * @exports basic/components/explain_screen
	 */
	function($, d3, DB, UI, APISocket, config, R,C) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var HomeScreen = function( hostDOM ) {
			C.HomeScreen.call(this, hostDOM);

			// Prepare host
			hostDOM.addClass("home");

		}
		HomeScreen.prototype = Object.create( C.HomeScreen.prototype );

		/**
		 * Resize window
		 */
		HomeScreen.prototype.onResize = function( width, height ) {
			this.width = width;
			this.height = height;

		}

		HomeScreen.prototype.onWillShow = function(cb) {

			cb();
		}

		// Register home screen
		R.registerComponent( "screen.home", HomeScreen, 1 );

	}

);
