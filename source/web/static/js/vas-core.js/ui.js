
define(["jquery", "core/config", "core/registry"], 
	function($, config, registry) {

		/**
		 * This module provides the basic user interface functionality 
		 * to the Virtual Atom Smasher.
		 *
		 * @exports core/ui
		 */
		var UI = {};

		// Initialize Virtual Atom Smasher Interface
		UI.host = $(config['dom-host']);

		// Initialize screens
		var screenNames = [ 'home_screen', 'explain_screen', 'tune_screen', 'run_screen' ];
		UI.screens = {};
		for (var i=0; i<screenNames.length; i++) {

			// Create screen instance
			var s = registry.instanceComponent(screenNames[i]),
				dom = $(s.getDOMElement());

			// Place it on DOM
			dom.addClass(config.css['screen']);
			UI.host.append(dom);

			// Hide DOM
			dom.hide();

			// Store it on screens
			UI.screens[screenNames[i]] = s;

		}

		/**
		 * Activate the screen with the given name.
		 *
		 * @param {string} name - The name of the module to focus.
		 */
		UI.selectScreen = function(name) {
			// Fade out every other DOM element
			$.each(UI.screens, function(k,v) {
				console.log(k,v);
				if (k == name) {
					v.getDOMElement().fadeIn();
				} else {
					v.getDOMElement().fadeOut();
				}
			});
		}

		// Return UI
		return UI;

	}

);