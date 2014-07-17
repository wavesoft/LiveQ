
define(["jquery", "core/config", "core/registry", "core/db"], 
	function($, config, R, DB) {

		///////////////////////////////////////////////////////////////
		//                     HELPER FUNCTIONS                      //
		///////////////////////////////////////////////////////////////

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

		/**
		 * Functions to makage a 4-segment black masks that can be used to hide/show
		 * any arbitrary object on the UI, just by it's coorinates
		 */
		var overlayMasks = [];

		// Prepare the 4 masks
		function overlaymasks_prepare( host ) {
			
			// Put 4 masks
			for (var i=0; i<4; i++) {
				var elm = $('<div class="mask-part">');
				host.append(elm);
				overlayMasks.push(elm);
			}

			// And the mask ring
			var elm = $('<div class="mask-ring"></div>');
			host.append(elm);
			overlayMasks.push(elm);

		}

		// Reposition masks to keep the specified rect clean
		function overlaymasks_apply( x,y,w,h ) {
			var rhb = 3; // Ring half-border
			if ((x === false) || (x === undefined)) {
				overlayMasks[0].addClass("fullscreen").attr('style', '');
				overlayMasks[1].hide();
				overlayMasks[2].hide();
				overlayMasks[3].hide();
				overlayMasks[4].hide();
			} else {
				overlayMasks[0].removeClass("fullscreen").css({
					'left': 0, 'top': 0,
					'width': x, 'bottom': 0
				});
				overlayMasks[1].show().css({
					'left': x+w, 'top': 0,
					'right': 0, 'bottom': 0
				});
				overlayMasks[2].show().css({
					'left': x, 'top': 0,
					'width': w, 'height': y
				});
				overlayMasks[3].show().css({
					'left': x, 'top': y+h,
					'width': w, 'bottom': 0
				});
				overlayMasks[4].show().css({
					'left': x-rhb, 'top': y-rhb,
					'width': w-rhb, 'height': h-rhb
				});
			}
		}

		// The same as above but accepts an element as first argument
		function overlaymasks_apply_element(e) {
			if (!e) {
				overlaymasks_apply( false );
			} else {
				var offset = $(e).offset(),
					w = $(e).width(), h = $(e).height();
				overlaymasks_apply( offset.left, offset.top, w, h );
			}
		}

		/**
		 * Local properties for visual aids
		 */
		var visualAidCurrent = false,
			visualAidTimer = 0,
			visualAidWasVisible = false,
			visualAidClasses = "",
			tutorialOriginalScreen = "",
			tutorialCompleteListener = false,
			tutorialActive = false,
			popupWidget = false;

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
		 * The currently registered popup widgets
		 *
		 * @type {Object}
		 */
		UI.popupWidgets = {};

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
			UI.host.addClass("pt-main pt-perspective");

			// Place an overlay DOM
			UI.overlayDOM = $('<div class="'+config.css['overlay']+'"></div>');
			UI.overlayDOM.hide();
			UI.host.append(UI.overlayDOM);
			overlaymasks_prepare( UI.overlayDOM );
			overlaymasks_apply( false );

			// Initialize the main visual agent for the tutorials
			UI.visualAgentDOM = $('<div class="visual-agent"></div>');
			UI.overlayDOM.append(UI.visualAgentDOM);
			UI.visualAgent = R.instanceComponent( 'tutorial.agent', UI.visualAgentDOM );
			if (!UI.visualAgent)
				console.warn("UI: Could not initialize tutorial agent!");

			// Create a DOM Element for on-screen popups
			UI.popupDOM = $('<div class="fullscreen popups"></div>');
			UI.host.append(UI.popupDOM);

			// Initialize visual agent
			UI.visualAgent.onResize( UI.host.width(), UI.host.height() );

			// Bind visual agent events
			UI.visualAgent.on('focusVisualAid', function(target, duration, classes) {
				UI.focusVisualAid(target, duration, classes);
			});
			UI.visualAgent.on('blurVisualAid', function() {
				UI.blurVisualAid();
			});
			UI.visualAgent.on('completed', function() {
				UI.hideTutorial();
				if (tutorialCompleteListener)
					tutorialCompleteListener();
			});

			// Bind on window events
			$(window).resize(function() {

				// Update body classes
				$("body").removeClass("layout-compact layout-wide layout-vertical layout-mobile");
				var w = $(window).width(), h = $(window).height();
				if (w > h) {
					if (w <= 1024) {
						$("body").addClass("layout-compact");
					} else {
						$("body").addClass("layout-wide");
					}
				} else {
					$("body").addClass("layout-vertical");
				}

				// Get active screen
				var scr = UI.screens[UI.activeScreen];
				if (scr == undefined)
					return;

				// Resize it
				var w = scr.hostDOM.width(),
					h = scr.hostDOM.height();
				scr.onResize( w, h );

				// Resize a possible active popup
				if (popupWidget)
					popupWidget.onResize(w,h);

				// Also resize some helper elements
				UI.visualAgent.onResize( w, h );
				overlaymasks_apply_element(visualAidCurrent);

			});
			$(window).resize();

			// Always listen for ESC key, and if we have an active tutorial, quit it
			$(window).keydown(function(e) {
				if ((e.keyCode == 27) && (tutorialActive)) {
					e.preventDefault();
					e.stopPropagation();

					// Stop tutorial
					UI.hideTutorial();
				}
			});

			window.ui = UI;

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
		 * Display a pop-up widget on the specified point on screen.
		 *
		 * @param {string} name - The name of the widget module.
		 * @param {int|DOMElement} x - The left position on screen
		 * @param {int} y - The top position on screen
		 * @params {object} config - The widget configuration
		 *
		 */
		UI.showPopup = function(name, x, y, config) {

			// If x was a Dom element, update x/y accordingly
			if ((x instanceof $) || (x instanceof Element)) {

				// Replace config with y, whatever config was
				config = y;

				// Get element coordinates
				var elm = $(x),
					pos = elm.offset(), 
					w = elm.width(), h = elm.height();

				// Use center of the element as anchor
				x = pos.left + w/2;
				y = pos.top + h/2;

			}

			// Check if we already have an instance of this widget
			var widget = UI.popupWidgets[name];
			if (!widget) {
				widget = UI.popupWidgets[name] = R.instanceComponent( name, UI.popupDOM );
				if (!widget) {
					console.error("UI: Unable to instantiate pop-up widget '"+name+"'");
					return;
				}
			}

			var __configAndShow = function() {
				// Configure widget
				widget.onResize( UI.host.width(), UI.host.height() );
				if (widget['onPopupConfig']) {
					var cfg = config || {};
					cfg.left = x; cfg.top = y;
					widget.onPopupConfig(cfg)
				}
				widget.onAnchorUpdate( x, y );

				// Show widget
				widget.show();
			}

			// Hide previous widget
			if (popupWidget) {
				popupWidget.hide( __configAndShow );
			} else {
				__configAndShow();
			}

			// Keep new reference
			popupWidget = widget;

		}

		/**
		 * Hide a pop-up previously shown with showPopup()
		 *
		 */
		UI.hidePopup = function() {
			if (popupWidget)
				popupWidget.hide();
			popupWidget = false;
		}

		/**
		 * Focus a particular visual aid.
		 *
		 * This function will add the class 'visualaid-focus' to the specified DOM element for the
		 * specified time or until the blurVisualAid function is called.
		 *
		 * @param {DOMElement|string} element - The element to focus or it's visual aid ID
		 * @param {int} duration - (Optional) The duraton (in seconds) to keep the element focused. Infinite if ommited or 0
		 * @param {string} classes - (Optional) Additional classes to add on the element
		 * @param {function} cb_completed - (Optional) A callback function to fire when completed
		 *
		 */
		UI.focusVisualAid = function( element, duration, classes, cb_completed ) {

			// Check for visual aid ID
			if (typeof(element) != 'string') {
				console.error("UI: Invalid visual aid ID!");
				return;
			}
			var aid = R.getVisualAidMeta( element );
			if (!aid) {
				console.error("UI: Missing visual aid '"+element+"'");
				return;
			}

			// Check for missing parameters
			if (typeof(classes) == 'function') {
				cb_completed = classes;
				classes = "";
			} else if (typeof(duration) == 'function') {
				cb_completed = duration;
				duration = 0;
				classes = "";
			}

			// Wrap on jquery
			var e = $(aid.element);

			// Reset previous entry
			if (visualAidCurrent) blurVisualAid();

			// Merge classes with the metadata from aid
			var classStr = (classes || "") + " " + (aid.classes || "");

			//
			// Asynchronous function for waiting until a possible
			// screen transition is completed.
			//
			var __continueVisualAidPresentation = function() {

				// Keep some state information
				visualAidWasVisible = (e.css("display") != "none");

				visualAidClasses = e.attr("class");
				if (!visualAidWasVisible) e.show();
				if (classStr) e.addClass(classStr)

				// Focus specified element
				visualAidCurrent = e.addClass("visualaid-focus");
				overlaymasks_apply_element(visualAidCurrent);

				// Set duration timeout if we have specified one
				if (duration) {
					visualAidTimer = setTimeout(function() { UI.blurVisualAid(); }, duration*1000);
				}
				
				// Fire callback
				if (cb_completed) cb_completed();

			}

			// Check if we should switch screen
			if (aid['screen'] && (UI.activeScreen != aid['screen'])) {
				UI.selectScreen( aid['screen'], UI.Transitions.ZOOM_OUT, __continueVisualAidPresentation );
			} else {
				__continueVisualAidPresentation();
			}


		}

		/**
		 * Unfocus a previously focused visual aid element.
		 */
		UI.blurVisualAid = function() {

			// Reset previous entry
			clearTimeout(visualAidTimer);
			if (visualAidCurrent) {
				var e = $(visualAidCurrent);

				// Reset previous visual aid
				e.removeClass("visualaid-focus");

				// Reset attributes and configuration
				if (!visualAidWasVisible) e.hide();
				e.attr("class", visualAidClasses);

				// Reset overlay mask
				overlaymasks_apply_element(false);

			}

			// Reset visualAidCurrent
			visualAidCurrent = false;

		}


		/**
		 * Show an agent and start the specified tutorial sequence.
		 *
		 * @example <caption>Sample animation sequence</caption>
		 * UI.showTutorial({
		 *
		 *    // The video source to use for the tutorial
		 *    video : 'http://www.youtube.com/watch?v=ScMzIvxBSi4',
		 *
		 *    // The visual aids to focus on the paricular time locations
		 *    aids : [
		 *		{ at: 5,  duration: 1, focus: 'tune.tunables' },
		 *		{ at: 10, duration: 2, focus: 'tune.begin' },
		 *		{ at: 30, duration: 2, focus: 'tune.observables' },
		 *    ]
		 *
		 * });
		 * @param {objects|string} sequence - The animation sequence to present or the ID of the tutorial to fetch from the database.
		 * @param {function} cb_completed - The callback to fire when the tutorial has started
		 *
		 */
		UI.showTutorial = function( sequence, cb_completed ) {

			// Asynchronouos callback to start the sequence
			var __startTutorial = function() {

				// Remove overlay from loading mode
				UI.overlayDOM.removeClass("loading");

				// Start visual agent animation
				UI.visualAgent.onStart();

				// The tutorial has started
				if (cb_completed) cb_completed();

			}

			// Asynchronous callback for preparing the elements
			var __prepareTutorial = function( sequence ) {

				// We have an active tutorial
				tutorialActive = true;

				// Keep the currently active screen
				tutorialOriginalScreen = UI.activeScreen;

				// Put overlay in loading mode
				UI.overlayDOM.addClass("loading");

				// Show agent
				UI.visualAgent.show(function() {
					var vc = 2;

					// Fade-in & initialize in the same time
					UI.overlayDOM.fadeIn(500, function() { if (--vc==0) __startTutorial(); } );
					UI.visualAgent.onSequenceDefined( sequence, function() { if (--vc==0) __startTutorial(); } );

				});

			}

			// Asynchronous function to stop previous tutorial and start this one
			var __stopPrevStartThis = function(sequence) {
				if (tutorialActive) {
					UI.hideTutorial( __prepareTutorial );
				} else {
					__prepareTutorial(sequence);
				}
			}

			// Asynchronous function to download (if required) the video sequence
			var __downloadTutorial = function( name ) {
				var db = DB.openDatabase("tutorials");
				db.get(name, function(data) {
					if (!name) {
						console.error("UI: Could not find tutorial '"+name+"' in the database!");
					} else {
						if (!data['sequence']) {
							console.error("UI: Invalid database structure for tutorial '"+name+"': Could not find 'sequence' field!");
						} else{
							__stopPrevStartThis(data['sequence']);
						}
					}
				});
			}

			// If we were given a string, load the tutorial from the database
			if (typeof(sequence) == 'string') {
				__downloadTutorial( sequence );
			} else {
				__stopPrevStartThis( sequence );
			}

		}

		/**
		 * Abort a tutorial previously started with showTutorial()
		 *
		 * @param {function} cb_completed - The callback to fire when the previous tutorial is aborted
		 *
		 */
		UI.hideTutorial = function( cb_ready ) {
			if (!tutorialActive) return;

			// Abort previous visual agent
			UI.visualAgent.onStop();

			// Blur previous visual aids
			UI.blurVisualAid();

			// Asynchronous function to wait until a screen transition
			// has completed
			var __continueHideTutorial = function() {

				// Hide visual agent
				UI.visualAgent.hide(function() {

					// Fade-out overlay DOM
					UI.overlayDOM.fadeOut(500, function() {
						if (cb_ready) cb_ready();
						tutorialActive = false;
					});

				});

			}

			// Check if screen has changed since the beginning of the tutorial
			if (UI.activeScreen != tutorialOriginalScreen) {
				UI.selectScreen( tutorialOriginalScreen, UI.Transitions.FLIP_LEFT, __continueHideTutorial );
			} else {
				__continueHideTutorial();
			}

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

			// Check for wrong values
			if (UI.activeScreen == name)
				return;

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

					// Fire resize events on overlay masks & visualAgent
					// (This is a hack to update visual agent's position after 
					// a screen switch in the middle of the tutorial)
					var w = eNext.hostDOM.width(),
						h = eNext.hostDOM.height();
					UI.visualAgent.onResize( w, h );
					overlaymasks_apply_element(visualAidCurrent);

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