
define(

	// Requirements
	["core/registry", "core/base/components"],

	/**
	 * Basic version of the results backdrop
	 *
	 * @exports basic/components/backdrop_tuning
	 */
	function(R,C) {

		/**
		 * @class
		 * @classdesc The basic results screen backdrop
		 */
		var ResultsBackdrop = function( hostDOM ) {
			C.Backdrop.call(this, hostDOM);

			// The screen backdrop is just black
			/*
			hostDOM.css({
				'background-color': '#FFF',
				'background-image': 'url(static/img/white_abstract.jpg)'
			});
			*/

		}
		ResultsBackdrop.prototype = Object.create( C.Backdrop.prototype );

		// Register results screen backdrop
		R.registerComponent( "backdrop.results", ResultsBackdrop, 1 );

	}

);