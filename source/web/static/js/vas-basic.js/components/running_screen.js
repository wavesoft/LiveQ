
define(

	// Requirements
	["core/registry", "core/components"],

	/**
	 * Basic version of the home screen
	 *
	 * @exports basic/components/running_screen
	 */
	function(R,C) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var RunningScreen = function( hostDOM ) {
			C.RunningScreen.call(this, hostDOM);

		}
		RunningScreen.prototype = Object.create( C.RunningScreen.prototype );

		// Register home screen
		R.registerComponent( "running_screen", RunningScreen, 1 );

	}

);