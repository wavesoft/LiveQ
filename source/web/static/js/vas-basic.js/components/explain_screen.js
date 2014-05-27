
define(

	// Requirements
	["core/registry", "core/components"],

	/**
	 * Basic version of the home screen
	 *
	 * @exports basic/components/explain_screen
	 */
	function(R,C) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var ExplainScreen = function( hostDOM ) {
			C.ExplainScreen.call(this, hostDOM);

		}
		ExplainScreen.prototype = Object.create( C.ExplainScreen.prototype );

		// Register home screen
		R.registerComponent( "explain_screen", ExplainScreen, 1 );

	}

);