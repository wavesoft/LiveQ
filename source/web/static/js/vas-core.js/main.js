
/**
 * [core/main] - Core initialization module
 */
define(

	["jquery", "core/config", "core/UI"], 

	function($, config, UI) {
		var VAS = { };

		/**
		 * Initialize VAS to the given DOM element
		 */
		VAS.initialize = function() {

			// Initialize UI
			UI.initialize();

		}

		/**
		 * Initialize VAS with the given game configuration and run
		 */
		VAS.run = function() {

			// Run main game
			UI.selectScreen( "screen.explain" );

		}

		return VAS;
	}

);