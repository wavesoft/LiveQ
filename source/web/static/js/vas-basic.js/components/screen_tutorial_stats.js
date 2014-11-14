

define(

	// Requirements
	["jquery", "core/registry", "core/base/component", "core/db", "core/ui", "core/user" ],

	/**
	 * Basic version of the introduction to tutorial screen
	 *
	 * @exports basic/components/explain_screen
	 */
	function($, R, C, DB, UI, User) {

		/**
		 * @class
		 * @classdesc The introduction to statistics tutorial
		 */
		var StatsTutorial = function( hostDOM ) {
			C.TutorialScreen.call(this, hostDOM);

			// Mark host screen for cinematic
			this.hostDOM.addClass("tutorial-stats");

		}
		StatsTutorial.prototype = Object.create( C.StatsTutorial.prototype );

		// Register screen component on the registry
		R.registerComponent( 'screen.tutorial.stats', StatsTutorial, 1 );

	}

);