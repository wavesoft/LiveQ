
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
		};

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
				if (cb) cb();
			}).bind(this));
		}

		/**
		 * Fire the willhide/hidden sequence
		 */
		Component.prototype.hide = function(cb) {
			this.onWillHide((function() {
				this.onHidden();
				if (cb) cb();
			}).bind(this));
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
		 * @param {Component|array} com - The component to forward events to
		 */
		Component.prototype.forwardVisualEvents = function(com) {
			if (!(com instanceof Array)) com=[com];
			for (var j=0; j<com.length; j++) {

				// Stack elements
				this.__forwardVisualEventsComponents.push(com[j]);

				// Override the appropriate onXX functions only once
				if (this.__forwardVisualEventsComponents.length == 1) {
					
					// Keep reference of the originals
					var self = this,
						origOnShown = this.onShown.bind(this),
						origOnHidden = this.onHidden.bind(this),
						origOnWillShow = this.onWillShow.bind(this),
						origOnWillHide = this.onWillHide.bind(this);

					// Override
					this.onShown = function() {
						for (var i=0; i<self.__forwardVisualEventsComponents.length; i++) {
							self.__forwardVisualEventsComponents[i].onShown();
						}
						origOnShown();
					}
					this.onHidden = function() {
						for (var i=0; i<self.__forwardVisualEventsComponents.length; i++) {
							self.__forwardVisualEventsComponents[i].onHidden();
						}
						origOnHidden();
					}
					this.onWillShow = function(cb) {
						var c = self.__forwardVisualEventsComponents.length;
						for (var i=0; i<self.__forwardVisualEventsComponents.length; i++) {
							self.__forwardVisualEventsComponents[i].onWillShow(function() {
								if (--c == 0) origOnWillShow(cb);
							});
						}
					}
					this.onWillHide = function(cb) {
						var c = self.__forwardVisualEventsComponents.length;
						for (var i=0; i<self.__forwardVisualEventsComponents.length; i++) {
							self.__forwardVisualEventsComponents[i].onWillHide(function() {
								if (--c == 0) origOnWillHide(cb);
							});
						}
					}

				}

			}

		};


		// Return component
		return Component;

	}

);