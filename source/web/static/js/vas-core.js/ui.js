
define(["jquery", "core/config", "core/registry"], 
	function($, config, R) {

		///////////////////////////////////////////////////////////////
		//                     HELPER FUNCTIONS                      //
		///////////////////////////////////////////////////////////////

		/**
		 * Initialize a tuning screen
		 */
		function init_tuning_screen(screen) {

		}

		///////////////////////////////////////////////////////////////
		//                       IMPLEMENTATION                      //
		///////////////////////////////////////////////////////////////

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
		 * The currently registered screens
		 *
		 * @type {Object}
		 */
		UI.screens = {};

		/**
		 * Initialize & Register the specified screen by it's name
		 */
		UI.initAndPlaceScreen = function(name, validateSubclass) {

			// Create host DOM for the component
			var comDOM = $('<div class="'+config.css['screen']+'"></div>');
			UI.host.append(comDOM);

			// Create screen instance
			var s = R.instanceComponent(name, comDOM), valid = true;
			if (s !== undefined) {

				// Check if we are requested to do a subclass validation
				if (validateSubclass !== undefined) {
					if (!(s instanceof validateSubclass)) {
						// Mark DOM as invalid
						comDOM.empty();
						comDOM.addClass(config.css['error-screen']);
						comDOM.html("Could not validate <strong>"+name+"</strong>");
						valid = false;
					}
				}

				if (valid) {
					// Fire reisze right after it's placed on DOM
					s.onResize(comDOM.width(), comDOM.height());
					// Store it on screens if it's valid
					UI.screens[name] = s;
				}

			} else {

				// Otherwise mark it as an invalid screen
				comDOM.addClass(config.css['error-screen']);
				comDOM.html("Could load <strong>"+name+"</strong>");

			}

			// Activate first screen
			if (!UI.activeScreen) {
				UI.activeScreen = name;
				// Fire the onShown event
				s.onShown();
			} else {
				// Otherwise hide it
				comDOM.hide();
			}


			// Return instance
			return s;
	
		}

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