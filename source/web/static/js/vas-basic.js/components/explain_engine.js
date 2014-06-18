
define(

	// Requirements
	["jquery", "core/registry", "core/components"],

	/**
	 * Basic version of the engine description
	 *
	 * @exports basic/components/explain_engine
	 */
	function($,R,C) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var ExplaingEngine = function( hostDOM ) {
			C.ExplainScreen.call(this, hostDOM);

			// 

		}
		ExplaingEngine.prototype = Object.create( C.ExplainScreen.prototype );

		// Register home screen
		R.registerComponent( "explain.engine", ExplaingEngine, 1 );

	}

);