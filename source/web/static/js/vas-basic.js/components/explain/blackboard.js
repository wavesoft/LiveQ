
define(

	// Requirements
	["jquery", "core/registry", "core/base/components", "vas-editor/runtime/canvas" ],

	/**
	 * Basic version of the engine description
	 *
	 * @exports basic/components/explain_physics
	 */
	function($,R,C,Canvas) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var ExplainBlackboard = function( hostDOM ) {
			C.ExplainScreen.call(this, hostDOM);

			// Initialize a new canvas
			this.canvas = new Canvas( hostDOM );

		}
		ExplainBlackboard.prototype = Object.create( C.ExplainScreen.prototype );

		/**
		 * This event is fired when animation information has updated
		 */
		ExplainBlackboard.prototype.onAnimationUpdated = function( doc ) {
			this.canvas.loadJSON( doc );
		}

		/**
		 * Start animation when shown
		 */
		ExplainBlackboard.prototype.onShown = function() {
			this.canvas.timeline.gotoAndPlay(0);
		}


		// Register home screen
		R.registerComponent( "explain.blackboard", ExplainBlackboard, 1 );

	}

);