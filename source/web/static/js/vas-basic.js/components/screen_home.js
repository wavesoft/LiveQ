
define(

	// Requirements
	["core/config", "core/registry", "core/components"],

	/**
	 * Basic version of the home screen
	 *
	 * @exports basic/components/home_screen
	 */
	function(config,R,C) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var HomeScreen = function( hostDOM ) {
			C.HomeScreen.call(this, hostDOM);

			// Create a slpash backdrop
			this.backdropDOM = $('<div class="'+config.css['backdrop']+'"></div>');
			hostDOM.append(this.backdropDOM);
			this.backdrop = R.instanceComponent("backdrop.home", this.backdropDOM);

			// Create foreground DOM
			this.foregroundDOM = $('<div class="'+config.css['foreground']+'"></div>');
			hostDOM.append(this.foregroundDOM);

		}
		HomeScreen.prototype = Object.create( C.HomeScreen.prototype );

		// Register home screen
		R.registerComponent( "screen.home", HomeScreen, 1 );

	}

);