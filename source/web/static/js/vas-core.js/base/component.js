
define(["core/util/event_base", "core/config"], 

	/**
	 * This module provides the base component class which is used for derriving all of the
	 * user interface widgets and screens.
	 *
	 * @exports core/base/component
	 */
	function (EventBase, config) {

		/**
		 * Instantiate a new componet
		 *
		 * @class
		 * @classdesc The base Component class. All other components are derrived from this.
		 * @param {DOMElement} hostDOM - The DOM element where the component should be hosted in
		 * @see {@link module:core/util/event_base~EventBase|EventBase} (Parent class)
		 */
		var Component = function( hostDOM ) {

			// Initialize superclass
			EventBase.call(this);

			// Keep reference of the host DOM element
			this.hostDOM = hostDOM;

			// Prepare properties
			this.width = 0;
			this.height = 0;
			this.left = 0;
			this.top = 0;
			this.anchor = { 'left': 0, 'top': 0 };

			// Helper arrays for keeping reference of the
			// objects to forward events to.
			this.__forwardVisualEventsComponents = [];
			this.__forwardEventsMap = {};

		}

		// Subclass from EventBase
		Component.prototype = Object.create( EventBase.prototype );

		/**
		 * This function is called when the component is about to be
		 * hidden. The callback parameter MUST be fired when the component
		 * is ready for hiding.
		 *
		 * @param {function} cb_ready - Callback to be fired when the component is ready for hiding.
		 */
		Component.prototype.onWillHide = function(cb_ready) {
			cb_ready();
		};

		/**
		 * This function is called when the component is about to be
		 * shown. The callback parameter MUST be fired when the component
		 * is ready for hiding.
		 *
		 * @param {function} cb_ready - Callback to be fired when the component is ready for display.
		 */
		Component.prototype.onWillShow = function(cb_ready) {
			cb_ready();
		};

		/**
		 * This function is called when the component is hidden
		 */
		Component.prototype.onHidden = function() {
		};

		/**
		 * This function is called when the component is shown
		 */
		Component.prototype.onShown = function() {
		};

		/**
		 * This function is called when the host DOM element is resized
		 *
		 * @param {integer} width - The new width of the component
		 * @param {integer} height - The new height of the component
		 */
		Component.prototype.onResize = function(width, height) {
			this.width = width;
			this.height = height;
		};

		/**
		 * This function is called when the host DOM element is moved
		 *
		 * @param {integer} left - The new left position of the component
		 * @param {integer} top - The new top position of the component
		 */
		Component.prototype.onMove = function(left, top) {
			this.left = left;
			this.top = top;
		};

		/**
		 * This function is called when
		 */
		Component.prototype.onAnchorUpdate = function(left, top) {
			this.anchor.left = left;
			this.anchor.top = top;
		}

		/**
		 * This function is used to provide a fixed-size dimentions for the
		 * componenet -if it supports such-.
		 *
		 * This function should return either an array with the dimentions as
		 * a [width, height] pair or **undefined** if it does not have any fixed dimentions.
		 *
		 */
		Component.prototype.getPreferredSize = function() {
			return undefined;
		};

		/**
		 * Fire the willshow/show sequence
		 */
		Component.prototype.show = function(cb) {
			this.onWillShow((function() {
				this.onShown();
				if (cb) {
					cb();
					this.trigger('shown');
				}
			}).bind(this));
		}

		/**
		 * Fire the willhide/hidden sequence
		 */
		Component.prototype.hide = function(cb) {
			this.onWillHide((function() {
				this.onHidden();
				if (cb) { 
					cb();
					this.trigger('hidden');
				}
			}).bind(this));
		}

		/**
		 * Receive part or all events of the specified component and adopt them
		 * as our own.
		 *
		 * @param {Component|array} com - The child component to receive events from
		 * @param {string|array} events - (Optional) The names of the events to receive
		 *
		 */
		Component.prototype.adoptEvents = function(com, events) {
			if (events && !(events instanceof Array)) events = [events];
			if (!(com instanceof Array)) com = [com];
			for (var j=0; j<com.length; j++) {
				var ccom = com[j];
				if (!ccom) continue;

				// Forward all events if no events are defined
				if (!events) {
					ccom.forwardAllEventsTo( this );
				} 

				// Otherwise explicitly forward part of the events
				else {
					for (var i=0; i<events.length; i++) {
						ccom.on(events[i], (function(evName) {
							return (function() {
								var args = Array.prototype.slice.call(arguments);
								args.unshift(evName);
								this.trigger.apply( this, args );
							}).bind(this);
						}).bind(this)(events[i]) );
					}
				}

			}
		}

		/**
		 * Forward particular events to the given component.
		 *
		 * This function will forward all the events specified in the events
		 * array, and it will optionally fire the specified helper function in order
		 * to translate the arguments when needed.
		 *
		 * @example <caption>Map function example</caption>
		 * myCom.forwardEvents( childCom, 'onResize', function(com,event,args) {
		 *    // Return half dimentions to all HalfSized components
		 *    if (com instanceof Components.HalfSized) {
		 *       return [ args[0]/2, args[1]/2 ];
		 *    } else {
		 *       return args;
		 *    }
		 * });
		 * @param {Component|array} com - The component to forward events to
		 * @param {string|array} events - The names of the events to forward (ex. onResize)
		 * @param {function} mapFunction - (Optional) The argument translation funtion
		 */
		Component.prototype.forwardEvents = function(com, events, mapFunction) {
			if (!(events instanceof Array)) events = [events];
			if (!(com instanceof Array)) com = [com];
			var defaultMapFunction = function(com, event, args) { return args; };

			for (var j=0; j<com.length; j++) {
				var ccom = com[j];
				if (!ccom) continue;

				for (var i=0; i<events.length; i++) {
					var evName = events[i];

					// Override the default function only once
					if (this.__forwardEventsMap[evName] == undefined) {

						this.__forwardEventsMap[evName] = [[ ccom, mapFunction || defaultMapFunction ]];

						// Keep the original function
						var origFunction = this[evName].bind(this);

						// Context wrapper
						this[evName] = (function(evName,origFunction) {

							// Function to replace with
							return function() {
								var args = Array.prototype.slice.call(arguments),
									fwComs = this.__forwardEventsMap[evName];

								// Loop over forwardable components
								for (var i=0; i<fwComs.length; i++) {
									var com = fwComs[i][0], mapFn = fwComs[i][1];
									if (com[evName])
										com[evName].apply( com, mapFn( fwComs[i], evName, args ) );
								}

								// Fire the origianl function
								origFunction.apply( this, args );

							}

						}).bind(this)(evName, origFunction);

					} else {

						// Every next call, updates the __forwardEventsMap
						this.__forwardEventsMap[evName].push([ ccom, mapFunction || defaultMapFunction ]);

					}
				}
			}
		}

		/**
		 * Forward visual events to the specified component.
		 *
		 * This function will forward and automatically manage the following events:
		 *
		 *  * onShown()
		 *  * onHidden()
		 *  * onWillShow()
		 *  * onWillHide()
		 *
		 * This function can also calculate the dimentions of the child component and
		 * automatically fire the onResize and onMove events accordingly. To do so, it requires
		 * additional information regarding the component position. 
		 *
		 * Format of sizeInfo object:
		 *  {
		 *    'left' : 10,		// Left position in pixels if number is integer
		 *    'top'  : '50%',	// Top position in percent if contains '%' symbol
		 *
		 *    // Either this:
		 *    'right' : 10,
		 *    'bottom': 10,
		 *
		 *    // Or this:
		 *    'width' : '100%',
		 *    'height': '50%',
		 *
		 *  }
		 *
		 *
		 * @param {Component|array} com - The component to forward events to
		 * @param {Object} - sizeInfo - (Optional) Alignment information to use for onResize
		 */
		Component.prototype.forwardVisualEvents = function(com, sizeInfo) {
			if (!(com instanceof Array)) com=[com];
			if (sizeInfo) {
				if (!(sizeInfo instanceof Array)) {
					var si=sizeInfo; sizeInfo=[];
					for (var i=0; i<com.length; i++)
						sizeInfo.push(si);
				} else {
					if (sizeInfo.length != com.length) {
						console.error("Mismatching array dimentions between components and size information!");
						return;
					}
				}
			}

			// Utility function to convert relative scales to numers
			var getValue = function( value, relValue, defValue ) {
				if (!value) return defValue;
				if (value.indexOf('%') < 0) {
					return parseInt(value);
				} else {
					return parseInt(value) * relValue / 100;
				}
			}
			var handleAnchorSizes = function( obj, length, kwA, kwB, kwT ) {
				var vA = ( obj[kwA] == undefined ) ? false : getValue( obj[kwA], length, 0 ), // Left/Top
					vB = ( obj[kwB] == undefined ) ? false : getValue( obj[kwB], length, 0 ), // Right/Bottom
					vT = ( obj[kwT] == undefined ) ? false : getValue( obj[kwT], length, 0 ); // Width/Height

				if ((vA === false) && (vB === false) && (vT === false)) { // Nothing
					return [0, length];
				} else if ((vA !== false) && (vB === false) && (vT === false)) { // Left only
					return [vA, length-vA];
				} else if ((vA === false) && (vB !== false) && (vT === false)) { // Right only
					return [0, length-vB];
				} else if ((vA === false) && (vB === false) && (vT !== false)) { // Width only
					return [0, vT];
				} else if ((vA !== false) && (vB !== false) && (vT === false)) { // Left+Right
					return [vA, length-vA-vB];
				} else if ((vA !== false) && (vB === false) && (vT !== false)) { // Left+Width
					return [vA, vT];
				} else if ((vA === false) && (vB !== false) && (vT !== false)) { // Right+Width
					return [length-vT-vB, vT];
				}
			}

			for (var j=0; j<com.length; j++) {
				if (!com[j]) continue;

				// Stack elements
				if (sizeInfo) {
					this.__forwardVisualEventsComponents.push({ 'com':com[j], 'sz': sizeInfo[j] });
				} else {
					this.__forwardVisualEventsComponents.push({ 'com':com[j], 'sz': null });
				}

				// Override the appropriate onXX functions only once
				if (this.__forwardVisualEventsComponents.length == 1) {
					
					// Keep reference of the originals
					var self = this,
						origOnShown = this.onShown.bind(this),
						origOnHidden = this.onHidden.bind(this),
						origOnWillShow = this.onWillShow.bind(this),
						origOnWillHide = this.onWillHide.bind(this),
						origOnResize = this.onResize.bind(this),
						origOnMove = this.onMove.bind(this);

					// Override
					this.onShown = function() {
						for (var i=0; i<self.__forwardVisualEventsComponents.length; i++) {
							self.__forwardVisualEventsComponents[i].com.onShown();
						}
						origOnShown();
					}
					this.onHidden = function() {
						for (var i=0; i<self.__forwardVisualEventsComponents.length; i++) {
							self.__forwardVisualEventsComponents[i].com.onHidden();
						}
						origOnHidden();
					}
					this.onWillShow = function(cb) {
						var c = self.__forwardVisualEventsComponents.length;
						for (var i=0; i<self.__forwardVisualEventsComponents.length; i++) {
							self.__forwardVisualEventsComponents[i].com.onWillShow(function() {
								if (--c == 0) origOnWillShow(cb);
							});
						}
					}
					this.onWillHide = function(cb) {
						var c = self.__forwardVisualEventsComponents.length;
						for (var i=0; i<self.__forwardVisualEventsComponents.length; i++) {
							self.__forwardVisualEventsComponents[i].com.onWillHide(function() {
								if (--c == 0) origOnWillHide(cb);
							});
						}
					}
					this.onResize = function(w,h) {
						this.width = w;
						this.height = h;
						origOnResize(w,h);
						var c = self.__forwardVisualEventsComponents.length;
						for (var i=0; i<self.__forwardVisualEventsComponents.length; i++) {
							var r = self.__forwardVisualEventsComponents[i];
							if (r.sz) {
								var lw = handleAnchorSizes( r.sz, this.width, 'left', 'right', 'width' ),
									th = handleAnchorSizes( r.sz, this.height, 'top', 'bottom', 'height' );
								r.com.onMove(lw[0],th[0]);
								r.com.onResize(lw[1],th[1]);
							}
						}
					}
					this.onMove = function(x,y) {
						this.left = w;
						this.top = h;
						origOnMove(x,y);
						var c = self.__forwardVisualEventsComponents.length;
						for (var i=0; i<self.__forwardVisualEventsComponents.length; i++) {
							var r = self.__forwardVisualEventsComponents[i];
							if (r.sz) {
								var lw = handleAnchorSizes( r.sz, this.width, 'left', 'right', 'width' ),
									th = handleAnchorSizes( r.sz, this.height, 'top', 'bottom', 'height' );
								r.com.onMove(lw[0],th[0]);
								r.com.onResize(lw[1],th[1]);
							}
						}
					}

				}

			}

		};


		// Return component
		return Component;

	}

);