
define(

	// Requirements
	["core/registry", "core/base/components"],

	/**
	 * Basic version of the home backdrop
	 *
	 * @exports basic/components/backdrop_explain
	 */
	function(R,C) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var ExplainBackdrop = function( hostDOM ) {
			C.Backdrop.call(this, hostDOM);

		}
		ExplainBackdrop.prototype = Object.create( C.Backdrop.prototype );

		// Register home screen
		R.registerComponent( "backdrop.explain", ExplainBackdrop, 1 );

	}

);