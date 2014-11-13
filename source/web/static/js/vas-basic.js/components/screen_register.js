

define(

	/**
	 * Dependencies
	 */
	["jquery", "core/config", "core/registry", "core/base/component", "core/db", "core/ui", "core/user" ],

	/**
	 * Basic version of the home screen
	 *
	 * @exports vas-basic/components/tuning_screen
	 */
	function($, config, R, Component, DB, UI, User, LiveQCore) {

		/**
		 * Registration scren
		 */
		var RegisterScreen = function(hostDOM) {
			C.Component.call(this, hostDOM);

			// 

		}
		RegisterScreen.prototype = Object.create( C.RegisterScreen.prototype );


		// Register screen component on the registry
		R.registerComponent( 'screen.register', RegisterScreen, 1 );

	}

);