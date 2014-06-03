
define(

	// Requirements
	["core/registry", "core/components"],

	/**
	 * Basic version of the home screen
	 *
	 * @exports basic/components/home_screen
	 */
	function(R,C) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var HomeScreen = function( hostDOM ) {
			C.HomeScreen.call(this, hostDOM);

			// Create a slpash backdrop
			this.backdropDOM = $('<div class="backdrop"></div>');
			hostDOM.append(this.backdropDOM);
			this.backdrop = R.instanceComponent("backdrop_home", this.backdropDOM);

		}
		HomeScreen.prototype = Object.create( C.HomeScreen.prototype );

		// Register home screen
		R.registerComponent( "screen_home", HomeScreen, 1 );

	}

);