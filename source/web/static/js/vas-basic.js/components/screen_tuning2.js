
define(

	// Requirements
	["jquery", "d3", "core/db", "core/ui", "core/config", "core/registry", "core/base/components"],

	/**
	 * Basic version of the home screen
	 *
	 * @exports basic/components/explain_screen
	 */
	function($, d3, DB, UI, config, R,C) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var TuningScreen = function( hostDOM ) {
			C.TuningScreen.call(this, hostDOM);

			// Prepare host
			hostDOM.addClass("tuning2");

			// Create a machine
			var machineDOM = $('<div class="fullscreen"></div>').appendTo(hostDOM);
			this.machine = R.instanceComponent("backdrop.machine", machineDOM);
			this.forwardVisualEvents( this.machine, { 'left':0, 'top': 0, 'width': '100%', 'height': '100%' } );
			
			// Create a description vrame
			var boardHost = $('<div class="control-board"></div>').appendTo(hostDOM),
				descBoard = $('<div></div>').appendTo(boardHost);



		}
		TuningScreen.prototype = Object.create( C.TuningScreen.prototype );


		// Register home screen
		R.registerComponent( "screen.tuning", TuningScreen, 1 );

	}

);
