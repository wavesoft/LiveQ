
define(

	// Requirements
	["jquery", "core/registry", "core/components"],

	/**
	 * Basic version of the home screen
	 *
	 * @exports basic/components/explain_screen
	 */
	function($, R,C) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var ExplainScreen = function( hostDOM ) {
			C.ExplainScreen.call(this, hostDOM);

			// Prepare sub-components
			var expTop = $('<div class="explain-top"></div>'),
				expBottom = $('<div class="explain-bottom"></div>');
				hostDOM.append(expTop);
				hostDOM.append(expBottom);

			// Prepare child components
			this.comTop = C.instanceComponent( "explain_physics", expTop );
			this.comBottom = C.instanceComponent( "explain_engine", expBottom );

		}
		ExplainScreen.prototype = Object.create( C.ExplainScreen.prototype );

		// Register home screen
		R.registerComponent( "screen_explain", ExplainScreen, 1 );

	}

);