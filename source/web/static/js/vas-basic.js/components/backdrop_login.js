
define(

	// Requirements
	["core/registry", "core/base/components"],

	/**
	 * Basic version of the login backdrop
	 *
	 * @exports basic/components/backdrop_login
	 */
	function(R,C) {

		/**
		 * @class
		 * @classdesc The basic login backdrop
		 */
		var LoginBackdrop = function( hostDOM ) {
			C.Backdrop.call(this, hostDOM);

			// The screen backdrop is just black
			//hostDOM.css({ 'background-color': '#FFF' });

		}
		LoginBackdrop.prototype = Object.create( C.Backdrop.prototype );

		// Register login backdrop
		R.registerComponent( "backdrop.login", LoginBackdrop, 1 );

	}

);