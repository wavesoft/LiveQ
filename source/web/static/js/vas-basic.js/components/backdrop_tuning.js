
define(

	// Requirements
	["core/registry", "core/components"],

	/**
	 * Basic version of the home backdrop
	 *
	 * @exports basic/components/backdrop_tuning
	 */
	function(R,C) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var TuningBackdrop = function( hostDOM ) {
			C.Backdrop.call(this, hostDOM);

			// The screen backdrop is just black
			hostDOM.css({ 'background-color': '#000' });

		}
		TuningBackdrop.prototype = Object.create( C.Backdrop.prototype );

		// Register home screen
		R.registerComponent( "backdrop_tuning", TuningBackdrop, 1 );

	}

);