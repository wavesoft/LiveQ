
/**
 * [core/main] - Core initialization module
 */
define(["jquery", "core/config"], function($, config) {
	var VAS = { };

	/**
	 * Initialize VAS with the given game configuration and run
	 */
	VAS.run = function(game) {

		// Store the game instance
		VAS.game = game;

		// Initialize VAS UI
		require(["core/ui"], function(UI) {
			VAS.UI = UI;

			// Run main game
			VAS.UI.selectScreen( "explain_screen" );

		});

	}

	return VAS;
});