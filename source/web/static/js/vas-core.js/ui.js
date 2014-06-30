
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

		/**
		 * Find vendor suffix
		 */
		function get_vendor_suffix() {
			var styles = window.getComputedStyle(document.documentElement, ''),
				pre = (Array.prototype.slice
				.call(styles)
				.join('') 
				.match(/-(moz|webkit|ms)-/) || (styles.OLink === '' && ['', 'o'])
				)[1]
			return pre;				
		}

		/**
		 * Append vendor suffix on the given string
		 */
		function with_vendor_suffix(txt) {
			var suff = get_vendor_suffix();
			if (!suff) return txt;
			return suff + txt[0].toUpperCase() + txt.substr(1);
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
		 * Vendor suffix, for calculating events & CSS properties
		 *
		 * @type {string}
		 */
		UI.vendorSuffix = get_vendor_suffix();

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
		 * Screen transitions
		 *
		 */
		UI.Transitions = {
			ZOOM_IN  		: [ 'pt-page-scaleDown', 	'pt-page-scaleUpDown pt-page-delay300' ],
			ZOOM_OUT 		: [ 'pt-page-scaleDownUp', 'pt-page-scaleUp pt-page-delay300' ],
			DIFF_RIGHT 		: [ 'pt-page-moveToLeftEasing pt-page-ontop', 'pt-page-moveFromRight' ],
			DIFF_LEFT 		: [ 'pt-page-moveToRightEasing pt-page-ontop', 'pt-page-moveFromLeft' ],
			DIFF_BOTTOM		: [ 'pt-page-moveToTopEasing pt-page-ontop', 'pt-page-moveFromBottom' ],
			DIFF_TOP		: [ 'pt-page-moveToBottomEasing pt-page-ontop', 'pt-page-moveFromTop' ],
			FLIP_RIGHT		: [ 'pt-page-flipOutRight', 'pt-page-flipInLeft pt-page-delay500' ],
			FLIP_LEFT		: [ 'pt-page-flipOutLeft', 'pt-page-flipInRight pt-page-delay500' ],
			FLIP_TOP		: [ 'pt-page-flipOutTop', 'pt-page-flipInBottom pt-page-delay500' ],
			FLIP_BOTTOM		: [ 'pt-page-flipOutBottom', 'pt-page-flipInTop pt-page-delay500' ],
		};

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

			// Perserve the original classes
			comDOM.data("originalClasses", comDOM.attr("class"));

			// Activate first screen
			if (!UI.activeScreen) {
				UI.activeScreen = name;
				// Fire the onShown event
				s.onShown();
				// Make it current
				comDOM.addClass("pt-current");
				comDOM.addClass("pt-page-ontop");
			} else {
				// Otherwise hide it
				//comDOM.hide();
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
			UI.overlayDOM = $('<div class="'+config.css['overlay']+' pt-main pt-perspective"></div>');
			UI.overlayDOM.hide();
			UI.host.append(UI.overlayDOM);

			// Bind on window events
			$(window).resize(function() {

				// Get active screen
				var scr = UI.screens[UI.activeScreen];
				if (scr == undefined)
					return;

				// Resize it
				scr.onResize( scr.hostDOM.width(), scr.hostDOM.height() );

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
		 * @param {transition} array - (Optional) The transition to choose (from UI.Transitions)
		 * @param {function} cb_ready - (Optional) The callback to fire when the screen has changed
		 *
		 */
		UI.selectScreen = function(name, transition, cb_ready) {

			// Check for missing transition
			if (transition == undefined) {
				transition = UI.Transitions.ZOOM_IN;
			} else if (typeof(transition) == 'function') {
				cb_ready = transition;
				transition = UI.Transitions.ZOOM_IN;
			}

			// Get prev/next screen
			var ePrev = UI.screens[UI.activeScreen],
				eNext = UI.screens[name];

			console.log(UI.activeScreen," -> ",name);

			// Concurrent cross-fade
			var pageTransition = function(cb) {

				// Find the event name for the 'animation completed' event
				var animEndEventNames = {
						'webkitAnimation' : 'webkitAnimationEnd',
						'oAnimation' : 'oAnimationEnd',
						'msAnimation' : 'MSAnimationEnd',
						'animation' : 'animationend'
					},
					animEndEventName = animEndEventNames[ with_vendor_suffix('animation') ];

				// Add page-transitions for moving out
				ePrev.hostDOM.addClass( transition[0] );
				eNext.hostDOM.addClass( transition[1] + " pt-page-ontop pt-current");

				// Local function to finalize animation
				var finalizeAnimation = function() {

					// Remove all the page transition classes from both pages
					eNext.hostDOM.attr("class", eNext.hostDOM.data("originalClasses") + " pt-current" );
					ePrev.hostDOM.attr("class", ePrev.hostDOM.data("originalClasses") );

					// Fire callback
					cb();

				}

				// Listen for CSS 'animation completed' events
				var vc = 0; 
				ePrev.hostDOM.on( animEndEventName, function() {
					ePrev.hostDOM.off( animEndEventName );
					if (++vc == 2) finalizeAnimation();
				} );
				eNext.hostDOM.on( animEndEventName, function() {
					eNext.hostDOM.off( animEndEventName );
					if (++vc == 2) finalizeAnimation();
				} );

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
					eNext.onResize( eNext.hostDOM.width(), eNext.hostDOM.height() );

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
				pageTransition(function() {

					// Fire shown/hidden
					if (ePrev !== undefined) ePrev.onHidden();
					if (eNext !== undefined) eNext.onShown();

					// Change page
					if (UI.mininav)
						UI.mininav.onPageChanged( UI.activeScreen, name );

					// Update
					UI.activeScreen = name;

					// Fire ready callback
					if (cb_ready) cb_ready();

				});

			}); });

			// Return the screen we are focusing into
			return eNext;

		}

		// Return UI
		return UI;

	}

);