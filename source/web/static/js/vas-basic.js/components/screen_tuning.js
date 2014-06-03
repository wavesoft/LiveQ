
define(

	// Requirements
	["core/registry", "core/components"],

	/**
	 * Basic version of the home screen
	 *
	 * @exports basic/components/tuning_screen
	 */
	function(R,C) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var TuningScreen = function( hostDOM ) {
			C.TuningScreen.call(this, hostDOM);

		}
		TuningScreen.prototype = Object.create( C.TuningScreen.prototype );

		// Register home screen
		R.registerComponent( "screen_tuning", TuningScreen, 1 );

	}

);