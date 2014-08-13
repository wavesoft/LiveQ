
define(["jquery", "core/config", "core/registry", "core/db", "core/base/components", "core/user"], 
	function($, config, R, DB, Components, User) {

		///////////////////////////////////////////////////////////////
		//                     HELPER FUNCTIONS                      //
		///////////////////////////////////////////////////////////////

		/**
		 * Cross-transition between two CSS elements with callback
		 */
		function pageTransition(elmPrev, elmNext, transition, cb) {

			// Find the event name for the 'animation completed' event
			var animEndEventNames = {
					'webkitAnimation' : 'webkitAnimationEnd',
					'oAnimation' : 'oAnimationEnd',
					'msAnimation' : 'MSAnimationEnd',
					'animation' : 'animationend'
				},
				animEndEventName = animEndEventNames[ with_vendor_suffix('animation') ];

			// Add page-transitions for moving out
			elmPrev.addClass( transition[0] );
			elmNext.addClass( transition[1] + " pt-page-ontop pt-current");

			// Local function to finalize animation
			var finalizeAnimation = function() {

				// Remove all the page transition classes from both pages
				elmNext.attr("class", elmNext.data("originalClasses") + " pt-current" );
				elmPrev.attr("class", elmPrev.data("originalClasses") );

				// Fire callback
				cb();

			}

			// Listen for CSS 'animation completed' events
			var vc = 0; 
			elmPrev.on( animEndEventName, function() {
				elmPrev.off( animEndEventName );
				if (++vc == 2) finalizeAnimation();
			} );
			elmNext.on( animEndEventName, function() {
				elmNext.off( animEndEventName );
				if (++vc == 2) finalizeAnimation();
			} );

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
		UI.mininav = "";

		/**
		 * The ID of the previous screen
		 * (Used by the selectPreviousScreen)
		 *
		 * @type {string}
		 */
		UI.previousScreen = "";

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
		 * First-time aids
		 *
		 * @type {Object}
		 */
		UI.popupWidgets = {};

		/**
		 * List of visible first-time aids
		 *
		 * @type {Array}
		 */
		UI.firstTimeAids = [];

		/**
		 * List of pending first-time aids for display
		 *
		 * @type {Array}
		 */
		UI.firstTimeAidsPending = [];

		/**
		 * First-time aids already shown
		 *
		 * @type {Object}
		 */
		UI.firstTimeAidsShown = {};

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
			PULL_RIGHT		: [ 'pt-page-rotatePushLeft', 'pt-page-rotatePullRight pt-page-delay180' ],
			PULL_LEFT		: [ 'pt-page-rotatePushRight', 'pt-page-rotatePullLeft pt-page-delay180' ],
			PULL_BOTTOM		: [ 'pt-page-rotatePushTop', 'pt-page-rotatePullBottom pt-page-delay180' ],
			PULL_TOP		: [ 'pt-page-rotatePushBottom', 'pt-page-rotatePullTop pt-page-delay180' ],
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
			UI.gameFrame = $(config['dom-host']);

			// Prepare host
			UI.host = $('<div></div>').appendTo(UI.gameFrame);
			UI.host.addClass("fullscreen host-main pt-main pt-perspective");

			// Prepare overlay host
			UI.activeOverlayComponent = null;
			UI.hostOverlay = $('<div></div>').appendTo(UI.gameFrame);
			UI.hostOverlay.addClass("fullscreen host-overlay");
			UI.hostOverlay.hide();
			UI.hostOverlay.click(function(e) {
				e.preventDefault();
				e.stopPropagation();
				UI.hideOverlay();
			});

			// Prepare overlay window
			UI.hostOverlayWindow = $('<div class="pt-main pt-perspective"></div>').appendTo(UI.hostOverlay);
			UI.hostOverlayWindow.addClass('overlay-window');
			UI.hostOverlayWindow.click(function(e) {
				e.preventDefault();
				e.stopPropagation();
			});

			// Prepare dummy blank screen for the overlay
			UI.blankOverlayScreen = $('<div class="pt-current pt-page-ontop"></div>').appendTo(UI.hostOverlayWindow);
			UI.blankOverlayScreen.addClass(config.css['screen']);
			UI.blankOverlayScreen.data("originalClasses", config.css['screen']);

			// Place an overlay DOM
			UI.overlayDOM = $('<div class="'+config.css['overlay']+'"></div>');
			UI.overlayDOM.hide();
			UI.host.append(UI.overlayDOM);
			overlaymasks_prepare( UI.overlayDOM );
			overlaymasks_apply( false );

			// Initialize the main visual agent for the tutorials
			UI.visualAgentDOM = $('<div class="visual-agent"></div>');
			UI.visualAgentDOM.hide();
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
		UI.showOverlay = function(name, transition, cb_ready) {

			// Check for missing arguments
			if (typeof(transition) == 'function') {
				cb_ready = transition; transition = null;
			}
			if (!transition) {
				transition = UI.Transitions.ZOOM_IN;
			}

			// Create host DOM for the component
			var comDOM = $('<div class="'+config.css['screen']+'"></div>');
			UI.hostOverlayWindow.append(comDOM);

			// Create screen instance
			var s = R.instanceComponent(name, comDOM), valid = true;
			if (!s) {
				console.error("[Overlay] Unable to load overlay '"+name+"'");
				comDOM.remove();
				return;
			}

			// Perserve the original classes
			comDOM.data("originalClasses", comDOM.attr("class"));

			// Delay-execute showOverlay if required
			var doShowOverlay = function() {

				// Select active overlay
				UI.activeOverlayComponent = s;

				// Blur background & show overlay
				UI.host.addClass("fx-blur");
				UI.hostOverlay.show();

				// Transition between blank screen and current
				setTimeout(function() {
					s.onWillShow(function() {
						pageTransition( UI.blankOverlayScreen, comDOM, transition, function() {
							s.onShown();
							if (cb_ready) cb_ready(s);
						});
					});
				},100);

			}

			// If we have a previous overlay screen, hide it
			UI.hideOverlay(doShowOverlay);

			// Return component instance
			return s;

		}

		/**
		 * Hide the overlay module from screen
		 */
		UI.hideOverlay = function( transition, cb_ready ) {

			// Check for missing arguments
			if (typeof(transition) == 'function') {
				cb_ready = transition; transition = null;
			}
			if (!transition) {
				transition = UI.Transitions.ZOOM_OUT;
			}

			// If we are already hidden don't do anything
			if (!UI.activeOverlayComponent) {
				if (cb_ready) cb_ready();
				return;
			}

			// Unblur background
			UI.host.removeClass("fx-blur");

			// Transition current screen and blank
			UI.activeOverlayComponent.onWillHide(function() {
				pageTransition( UI.activeOverlayComponent.hostDOM, UI.blankOverlayScreen, transition, function() {
					UI.activeOverlayComponent.onHidden();
					
					// Reset overlay
					UI.activeOverlayComponent.hostDOM.remove();
					UI.activeOverlayComponent = null;
					UI.hostOverlay.hide();

					// Fire callback
					if (cb_ready) cb_ready();
				});
			});


		}

		/**
		 * Hide all the first-time aids.
		 */
		UI.hideAllfirstTimeAids = function() {
			for (var i=0; i<UI.firstTimeAids.length; i++) {
				// Fade out & remove element
				UI.firstTimeAids[i].fadeOut((function(aid) {
					return function() { aid.remove(); }
				})(UI.firstTimeAids[i]));
			}

			// Remove non-visible aids
			for (var i=0; i<UI.firstTimeAidsPending.length; i++) {
				UI.firstTimeAidsPending[i].remove();
			}

			// Empty first time aids
			UI.firstTimeAids = [];
			UI.firstTimeAidsPending = [];
		}

		/**
		 * Check colliding first-time aids and display if they are good to be shown.
		 */
		UI.testCollidingFirstTimeAids = function(aid_id) {
			function check_collision(x1,y1,w1,h1,x2,y2,w2,h2) {
				return  ( ((x1 >= x2) && (x1 <= x2+w2)  && (y1 >= y2) && (y1 <= y2+h2)) || 
						  ((x1+w1 >= x2) && (x1+w1 <= x2+w2)  && (y1 >= y2) && (y1 <= y2+h2)) || 
						  ((x1 >= x2) && (x1 <= x2+w2)  && (y1+h1 >= y2) && (y1+h1 <= y2+h2)) || 
						  ((x1+w1 >= x2) && (x1+w1 <= x2+w2)  && (y1+h1 >= y2) && (y1+h1 <= y2+h2)) 
						);
			}

			for (var i=0; i<UI.firstTimeAidsPending.length; i++) {
				var aPending = UI.firstTimeAidsPending[i],
					collides = false;

				for (var j=0; j<UI.firstTimeAids.length; j++) {
					var aVisible = UI.firstTimeAids[j],
						// Get pending rect
						w1 = aPending.width(),
						h1 = aPending.height(),
						x1 = parseInt(aPending.css("left")),
						y1 = parseInt(aPending.css("top")),
						// Get visible rect
						w2 = aVisible.width(),
						h2 = aVisible.height(),
						x2 = parseInt(aVisible.css("left")),
						y2 = parseInt(aVisible.css("top"));

					// Check if we a collision
					if ( check_collision(x1,y1,w1,h1,x2,y2,w2,h2) || check_collision(x2,y2,w2,h2,x1,y1,w1,h1) ) {
						collides = true;
						break;
					}
				}

				// If we don't collide, show
				if (!collides) {

					// Show first time aid
					UI.firstTimeAids.push( aPending );
					setTimeout(function() {
						aPending.fadeIn();
					}, 1000 * Math.random());

					// Mark as shown
					var aid_id = aPending.prop("aid_id");
					UI.firstTimeAidsShown[aid_id] = true;

					// Remove first time aid and rewind
					UI.firstTimeAidsPending.splice(i,1);
					i = 0;

				}

			}
		}

		/**
		 * Show first-time pop-up on a visual aid.
		 *
		 * @param {string} aid_id - The visual aid to pop-up something upon.
		 *
		 */
		UI.showFirstTimeAid = function(aid_id) {
			var popup = $('<div class="newitem-popup"></div>'),
				visualAid = R.getVisualAidMeta(aid_id),
				userAids = User.getFirstTimeDetails();

			// Skip missing visual aid definitions
			if (!visualAid) return;
			if (!userAids[aid_id]) return;
			if (userAids[aid_id].shown) return;
			if ((visualAid.screen != "") && (visualAid.screen != UI.activeScreen)) return;

			// Show first-time aids only once
			if (UI.firstTimeAidsShown[aid_id]) return;

			// We got everything, prepare display
			var popup = $('<div class="newitem-popup"></div>'),
				popupBody = $('<div class="text"></div>').appendTo(popup);
			UI.host.append(popup);

			// Get element coordinates
			var elm = $(visualAid.element),
				pos = elm.offset(), 
				w = parseInt(elm.attr("width")) || elm.width(), 
				h = parseInt(elm.attr("height")) || elm.height(), 
				x = pos.left + w*2/3 + 5,
				y = pos.top + h/2 - popup.height();

			// Check flipping
			if (x + popup.width() > UI.host.width()) {
				x = pos.left + w/3 - popup.width() - 5;
				popup.addClass("flip-x");
			}
			if (y < 0) {
				y = pos.top + h/2;
				popup.addClass("flip-y");
			}

			// Update content
			popupBody.html( userAids[aid_id].text );
			popup.css({
				'left': x,
				'top': y
			});

			// Add click handler
			popup.click(function() {

				// Fadeout and remove aid
				popup.fadeOut(function() {
					popup.remove();
				});

				// Remove from firstTimeAids
				var i = UI.firstTimeAids.indexOf(popup);
				UI.firstTimeAids.splice(i,1);

				// Mark as seen
				User.markFirstTimeAsSeen( aid_id );

				// Update collided aids
				UI.testCollidingFirstTimeAids();

			});

			// Fade-in with a random delay
			popup.hide();

			// Store on pending & show the ones not colliding
			popup.prop("aid_id", aid_id);
			UI.firstTimeAidsPending.push( popup );
			UI.testCollidingFirstTimeAids();

		}

		/**
		 * Display a pop-up widget on the specified point on screen.
		 * 
		 * This function has a multi-call signature.
		 *
		 * @example <caption>Simple pop-up for an element</caption>
		 * var targetElm = $('#hover-me');
		 * targetElm.mouseOver(function() {
		 *
	     *    // Prepare the DOM element first
	     *    var bodyDom = $('<div class="fancy-body">Some fancy text!</div>');
	     *    
	     *    // Pop-up the component 'popup.generic' next to
	     *    // the element with ID 'hover-me'
	     *    UI.showPopup( 'popup.generic', targetElm, bodyDOM );
	     *
		 * });
		 * @example <caption>Pop-up with body function</caption>
		 * var targetElm = $('#hover-me');
		 * targetElm.mouseOver(function() {
		 *
		 *    // Prepare the function to generate the body within
		 *    // the host DOM element specified.
		 *    var prepareBody = function( hostDOM ) {
		 *       hostDOM.append( $('<h1>Header</h1>') );
		 *       hostDOM.append( $('<p>This is a proceduraly generated body.</p>') );
		 *    }
		 *
	     *    // Pop-up the component 'popup.generic' next to
	     *    // the element with ID 'hover-me'. 
	     *    UI.showPopup( 'popup.generic', targetElm, bodyDOM );
	     *
		 * });
		 * @param {string} name - The name of the widget module.
		 * @param {int|DOMElement} x - The left position on screen
		 * @param {int} y - The top position on screen
		 * @param {function|DOMElement|String} body - the element to place in the body.
		 * @params {object} config - The widget configuration
		 *
		 */
		UI.showPopup = function(name, x, y, body, config) {

			// If x was a Dom element, update x/y accordingly
			if ((x instanceof $) || (x instanceof Element)) {

				// Shift parameters left
				config = body;
				body = y;

				// Get element coordinates
				var elm = $(x),
					pos = elm.offset(), 
					w = parseInt(elm.attr("width")) || elm.width(), 
					h = parseInt(elm.attr("height")) || elm.height();

				// Use center of the element as anchor
				x = pos.left + w/2;
				y = pos.top + h/2;

			}

			// If body is not a function, create one now
			var bodyFn = body;
			if ((body instanceof $) || (body instanceof Element)) {
				bodyFn = (function(bodyElm) {
					return function(hostDOM) {
						hostDOM.append($(bodyElm));
					};
				})(body);
			} else if (typeof(body) == 'string') {
				bodyFn = (function(bodyText) {
					return function(hostDOM) {
						hostDOM.append($('<span>'+bodyText+'</span>'));
					};
				})(body);
			}

			// Check if we already have an instance of this widget
			var widget = UI.popupWidgets[name];
			if (!widget) {
				widget = UI.popupWidgets[name] = R.instanceComponent( name, UI.popupDOM, Components.Popup );
				if (!widget) {
					console.error("UI: Unable to instantiate pop-up widget '"+name+"'");
					return;
				}
			}

			var __configAndShow = function() {

				// Adopt parent size
				widget.onResize( UI.host.width(), UI.host.height() );

				// Configure
				var cfg = config || {};
				cfg.left = x; cfg.top = y;
				widget.onPopupConfig(cfg, bodyFn);

				// Update anchor
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
			return widget;

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
					UI.visualAgentDOM.show();
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
						UI.visualAgentDOM.hide();
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
		 * Activate the screen which was previously active before someone called selectScreen()
		 *
		 * @param {function} cb_ready - (Optional) The callback to fire when the screen has changed
		 *
		 */
		UI.selectPreviousScreen = function( cb_ready) {
			if (!UI.previousScreen) return;
			UI.selectScreen( UI.previousScreen, UI.Transitions.ZOOM_OUT, cb_ready )
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

			// Preserve previous screen ID
			UI.previousScreen = UI.activeScreen;

			// Switch screen
			var prevScreen = UI.activeScreen;
			UI.activeScreen = name;

			// Check for missing transition
			if (transition == undefined) {
				transition = UI.Transitions.ZOOM_IN;
			} else if (typeof(transition) == 'function') {
				cb_ready = transition;
				transition = UI.Transitions.ZOOM_IN;
			}

			// Hide all first-time aids previously shown
			UI.hideAllfirstTimeAids();

			// Get prev/next screen
			var ePrev = UI.screens[prevScreen],
				eNext = UI.screens[name];

			console.log(prevScreen," -> ",name);

			// Helper to display a waiting screen untless cancelled
			var loadingTimer = 0,
				loadingShown = false,
				showLoadingAfter = function(waitMs) {
					loadingTimer = setTimeout(function() {
						if (tutorialActive) return;
						loadingShown = true;
						UI.overlayDOM.addClass("loading");
						UI.overlayDOM.fadeIn(250);
					}, waitMs);
				},
				abortShowLoading = function() {
					clearTimeout(loadingTimer);
					if (loadingShown) {
						loadingShown = false;
						UI.overlayDOM.fadeOut(250, function() {
							UI.overlayDOM.removeClass("loading");
						});
					}
				}

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

					// If callback takes too much time to reply, show loading
					showLoadingAfter( 500 );

					// Inform new screen that will be shown
					eNext.onWillShow(cb);

				}
			}

			// Prepare both first
			preparePrev(function() { prepareNext(function() {

				// We got the OK From the screen to be shown, hide 
				// any possible loading screen that came-up while waiting
				// in onWillShow
				abortShowLoading();

				// Inform page transition
				if (UI.mininav)
					UI.mininav.onPageWillChange( prevScreen, name );

				// And cross-fade simultanously
				pageTransition(ePrev.hostDOM, eNext.hostDOM, transition, function() {

					// Fire shown/hidden
					if (ePrev !== undefined) ePrev.onHidden();
					if (eNext !== undefined) eNext.onShown();

					// Change page
					if (UI.mininav)
						UI.mininav.onPageChanged( prevScreen, name );

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