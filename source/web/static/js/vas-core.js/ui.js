
define(["jquery", "core/config", "core/registry"], 
	function($, config, R) {

		/**
		 * This module provides the basic user interface functionality 
		 * to the Virtual Atom Smasher.
		 *
		 * @exports core/ui
		 */
		var UI = {};

		/**
		 * The name of the currently active screen
		 *
		 * @type {string}
		 */
		UI.activeScreen = "";

		/**
		 * The mini-nav component
		 *
		 * @type {MiniNavComponent}
		 */
		UI.activeScreen = "";

		/**
		 * The 
		 */

		/**
		 * Initialize the user interface for the game
		 *
		 * This function **MUST** be called in order to initialize the game layout.
		 */
		UI.initialize = function() {

			// Initialize Virtual Atom Smasher Interface
			UI.host = $(config['dom-host']);

			// Place an overlay DOM
			UI.overlayDOM = $('<div class="'+config.css['overlay']+'"></div>');
			UI.overlayDOM.hide();
			UI.host.append(UI.overlayDOM);

			// Initialize screens
			var screenNames = [ 'screen.home', 'screen.explain', 'screen.tuning', 'screen.running' ];
			UI.screens = {};
			for (var i=0; i<screenNames.length; i++) {

				// Create host DOM for the component
				var comDOM = $('<div class="'+config.css['screen']+'"></div>');
				UI.host.append(comDOM);

				// Create screen instance
				var s = R.instanceComponent(screenNames[i], comDOM);
				if (s !== undefined) {

					// Fire reisze right after it's placed on DOM
					s.onResize(comDOM.width(), comDOM.height());

					// Store it on screens if it's valid
					UI.screens[screenNames[i]] = s;

				} else {

					// Otherwise mark it as an invalid screen
					comDOM.addClass(config.css['error-screen']);

				}

				// Hide DOM
				comDOM.hide();

			}

			// Create the mini-nav menu
			var mininavDOM = $('<div class="'+config.css['nav-mini']+'"></div>');
			UI.host.append(mininavDOM);
			
			// Try to create mini-nav
			UI.mininav = R.instanceComponent("nav.mini", mininavDOM);
			if (UI.mininav !== undefined) {

				// Check for preferred dimentions
				var dim = UI.mininav.getPreferredSize();
				if (dim != undefined) {
					mininavDOM,css({
						'width': dim[0],
						'height': dim[1]
					});
					UI.mininav.onResize( dim[0], dim[1] );
				} else {
					UI.mininav.onResize( mininavDOM.width(), mininavDOM.height() );
				}

				// Bind events
				UI.mininav.on("changeScreen", function(to) {
					UI.selectScreen(to);
				});

			}

			// Bind on window events
			$(window).resize(function() {

				// Get active screen
				var scr = UI.screens[UI.activeScreen];
				if (scr == undefined)
					return;

				// Resize it
				scr.onResize( scr.hostElement.width(), scr.hostElement.height() );

			});

		}

		/**
		 * Slide an overlay module as screen.
		 *
		 * @param {string} name - The name of the module to focus.
		 * @param {function} cb_ready - The callback to fire when the screen has changed
		 *
		 */
		UI.showOverlay = function(name, cb_ready) {

			// Get preferred dimentions of the overlay

		}


		/**
		 * Activate a screen module with the given name.
		 *
		 * @param {string} name - The name of the module to focus.
		 * @param {function} cb_ready - The callback to fire when the screen has changed
		 *
		 */
		UI.selectScreen = function(name, cb_ready) {

			// Get prev/next screen
			var ePrev = UI.screens[UI.activeScreen],
				eNext = UI.screens[name];

			console.log(UI.activeScreen," -> ",name);

			// Concurrent cross-fade
			var crossFade = function(cb) {
				var v = 0;
				
				// Fade out old
				if (ePrev !== undefined) {
					ePrev.hostElement.fadeOut(500, function() {
						if (++v == 2) { cb(); }
					});
				} else {
					v++;
				}
				
				// Fade in new
				if (eNext !== undefined) {
					eNext.hostElement.fadeIn(500, function() {
						if (++v == 2) { cb(); }
					});
				} else {
					v++;
				}

				// Check if nothing could fade
				if (v==2) cb();

			};

			// Prepare previous hide
			var preparePrev = function(cb) {
				if (ePrev == undefined) { cb(); } else {

					// Inform old screen that will be hidden
					ePrev.onWillHide(cb);

				}
			}

			// Prepare next show
			var prepareNext = function(cb) {
				if (eNext == undefined) { cb(); } else {

					// Call onResize function just to make sure
					// the component will have the appropriate dimentions
					eNext.onResize( eNext.hostElement.width(), eNext.hostElement.height() );

					// Inform new screen that will be shown
					eNext.onWillShow(cb);

				}
			}

			// Prepare both first
			preparePrev(function() { prepareNext(function() {

				// Inform page transition
				if (UI.mininav)
					UI.mininav.onPageWillChange( UI.activeScreen, name );

				// And cross-fade simultanously
				crossFade(function() {

					// Fire shown/hidden
					if (ePrev !== undefined) ePrev.onHidden();
					if (eNext !== undefined) eNext.onShown();

					// Change page
					if (UI.mininav)
						UI.mininav.onPageChanged( UI.activeScreen, name );

					// Update
					UI.activeScreen = name;

					// Fire ready callback
					if (cb_ready)
						cb_ready();

				});

			}); });

		}

		// Return UI
		return UI;

	}

);