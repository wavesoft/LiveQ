
define(

	// Requirements
	["jquery", "core/registry", "core/base/components"],

	/**
	 * Basic version of the engine description
	 *
	 * @exports basic/components/explain_physics
	 */
	function($,R,C) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var ExplainPhysics = function( hostDOM ) {
			C.ExplainScreen.call(this, hostDOM);

			// 

		}
		ExplainPhysics.prototype = Object.create( C.ExplainScreen.prototype );

		// Register home screen
		R.registerComponent( "explain.physics", ExplainPhysics, 1 );

	}

);