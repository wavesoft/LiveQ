
define(

	// Requirements
	["core/registry", "core/components"],

	/**
	 * Basic version of the home backdrop
	 *
	 * @exports basic/components/backdrop_running
	 */
	function(R,C) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var RunningBackdrop = function( hostDOM ) {
			C.Backdrop.call(this, hostDOM);

			// The screen backdrop is just black
			hostDOM.css({ 'background-color': '#000' });

		}
		RunningBackdrop.prototype = Object.create( C.Backdrop.prototype );

		// Register home screen
		R.registerComponent( "backdrop_running", RunningBackdrop, 1 );

	}

);