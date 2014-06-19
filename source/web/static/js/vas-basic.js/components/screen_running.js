
define(

	// Requirements
	["core/config", "core/registry", "core/components"],

	/**
	 * Basic version of the home screen
	 *
	 * @exports basic/components/running_screen
	 */
	function(config,R,C) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var RunningScreen = function( hostDOM ) {
			C.RunningScreen.call(this, hostDOM);

			// Create a slpash backdrop
			this.backdropDOM = $('<div class="'+config.css['backdrop']+'"></div>');
			hostDOM.append(this.backdropDOM);
			this.backdrop = R.instanceComponent("backdrop.running", this.backdropDOM);

			// Create foreground DOM
			this.foregroundDOM = $('<div class="'+config.css['foreground']+'"></div>');
			hostDOM.append(this.foregroundDOM);

		}
		RunningScreen.prototype = Object.create( C.RunningScreen.prototype );

		// Register home screen
		R.registerComponent( "screen.running", RunningScreen, 1 );

	}

);