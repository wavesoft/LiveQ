
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
		var ProgressBackdrop = function( hostDOM ) {
			C.Backdrop.call(this, hostDOM);

			// The screen backdrop is just black
			hostDOM.css({
				'background-color'  : '#FFF',
				/*
				'background-image'  : 'url(static/img/particles.jpg)',
				'background-size'   : 'cover',
				'background-repeat' : 'no-repeat',
				*/
			});

		}
		ProgressBackdrop.prototype = Object.create( C.Backdrop.prototype );

		// Register home screen
		R.registerComponent( "backdrop.progress", ProgressBackdrop, 1 );

	}

);