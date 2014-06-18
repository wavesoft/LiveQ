
define(["core/util/event_base", "core/util/easing"], 

	/**
	 * Utility which takes care of animation sequences
	 * on the interface.
	 *
	 * The animator class is a powerfull system that allows
	 * complex sequencing of events to happen in a timeline.
	 *
	 * @example <caption>Example of use of animator class</caption>
	 * // Define a timeline
	 * var myTimeline = {
	 *    config: {
	 *       'z-heght': 2.0    // <- Configuration parameters used later in
	 *    },                   //    the definition. Look on the 'mapping' secion
	 *    keyframes: [
	 *       {
	 *          p: 0.0,        // <- The position scale is only for local
	 *          v: {           //    definition purposes only. The value will
	 *             'x': 0.0,   //    be normalized. The overall duration will 
	 *             'y': 0.0,   //    be defined on the animator initialization.
	 *             'z': 0.0
	 *          },
	 *          e: {
	 *             'x': 'easeInQuad' // <- The easing functions apply to the
	 *          }                    //    time slice from this keyframe till 
	 *       },                      //    the next.
	 *       {
	 *          p: 1.0,
	 *          v: {
	 *             'x': 1.0,
	 *             'y': 0.0,
	 *             'z': Math.PI
	 *          }
	 *       },
	 *       {
	 *          p: 4.0,
	 *          v: {
	 *             'x': 1.0,
	 *             'y': 1.0,
	 *             'z': 0.0
	 *          }
	 *       }
	 *    ],
	 *    mapping: {                 // <- Mapping functions allow re-mapping of
	 *       'z': function(v, c) {   //    a property value, in this case the 'z'
	 *          return Math.sin(v) * c['z-height'];
	 *       }
	 *    }
	 * };
	 *
	 * // Create animator
	 * var animator = new Animator({
	 *    timeline: myTimeline,
	 *    duration: 1000
	 * });
	 *
	 * // Create a D3 object for this test
	 * // (assuming you already have defined geometry & material)
	 * var myObject = new THREE.Mesh( geometry, material );
	 *
	 * // Bind ojects to the animator
	 * animator.bind(
	 *    'x',                // <- The parameter used in the timeline
	 *    myObject.position,  // <- The object reference
	 *    'x'                 // <- The property in the object to update
	 * );
	 *
	 * // Make sure you are calling the update function with
	 * // a time delta provided. For example, on your render function:
	 *
	 * var lastTime = Date.now();
	 * function updateAnimator() {
	 *    var newTime = Date.now(),
	 *        delta = newTime - lastTime;
	 *
	 *    // Update the animator
	 *    animator.update(delta);
	 *
	 *    lastTime = newTime;
	 * }
	 *
	 * // You are now ready to use the animator:
	 * animator.start( true ); // Start with a loop
	 *
	 * @exports core/util/animator
	 */
	function(EventBase, Easing) {

		/**
		 * This class provides animation basics on arbitrary
		 * javascript objects.
		 *
		 * You can bind an object and a property set and the 
		 * animator class will take care of pushing the appropriate
		 * values to them on the appropriate time sequence.
		 *
		 * You will only have to call the update function
		 * with a time delta.
		 *
		 * @class
		 * @classdesc General purpose animator class
		 */
		var Animator = function( config ) {

			// Initialze base class
			EventBase.call(this);

			// Apply configuration
			var cfg = config || {};
			this.duration = cfg.duration || 1000;
			this.timeline = null;

			// Pick the easing function
			this.easing = Easing['linear'];
			if (cfg.easing) {
				if (typeof(cfg.easing) == 'function') {
					this.easing = cfg.easing;
				} else{
					this.easing = Easing[cfg.easing];
					if (this.easing == undefined) {
						console.warn("Animator: Unknown easing: ",cfg.easing);
						this.easing = Easing['linear'];
					}
				}
			}

			// Pick the property easing function
			this.propEasing = Easing['linear'];
			if (cfg.propEasing) {
				if (typeof(cfg.propEasing) == 'function') {
					this.propEasing = cfg.propEasing;
				} else{
					this.propEasing = Easing[cfg.propEasing];
					if (this.propEasing == undefined) {
						console.warn("Animator: Unknown easing: ",cfg.propEasing);
						this.propEasing = Easing['linear'];
					}
				}
			}

			// Apply timeline if defined
			if (cfg.timeline !== undefined)
				this.setTimeline(cfg.timeline);

			// The property assignment handlers
			this.assignFn = {};

			// Automatic animation information
			this.animating = false;
			this.loop = false;
			this.toPosition = this.duration;
			this.fromPosition = 0;
			this.timeOffset = 0;
			this.completedCallback = null;
			this.chainCallback = null;
			this.__onUpdateCallbacks = [];

		};
		Animator.prototype = Object.create(EventBase.prototype);

		/**
		 * Bind property to an object property
		 *
		 * @param {string} name - The property name to bind to
		 * @param {object} objRef - The object this property belongs to
		 * @param {string} objProperty - The property of the object to update
		 * @param {function} updateFn - The function to call after objects are applied
		 */
		Animator.prototype.bind = function( name, objRef, objProperty, updateFn ) {

			// If objRef is function, use function-based assignment
			if (typeof(objRef) == 'function') {
				this.assignFn[name] = objRef;
			} else {
				var vFn = this.timeline.mapping[name] || function(vv,vc){ return vv; };
				this.assignFn[name] = (function(name, objRef, objProperty, vFn, updateFn) {
					return  function(v,c) { 
						objRef[objProperty] = vFn(v,c); 
						if (updateFn) objRef[updateFn](v,c);
					}
				})(name, objRef, objProperty, vFn, updateFn);
			}

			// Apply defaults as they arrive
			if (this.timeline.defaults[name] != undefined)
				this.assignFn[name]( this.timeline.defaults[name] );

		};

		/**
		 * Load/Update timeline
		 *
		 * The timeline contains all the useful information such as
		 * keyframes, their position and the parameter values in each
		 * one of them.
		 *
		 * @example <caption>Structure of a timeline object</caption>
		 *
		 * var myTimeline = {
		 *    config: {           // Used-defined information for custom
	     *       ...              // mapping functions (see below)
		 *    },
		 *    keyframes: [        // Keyframe group definition
		 *       [                // You can optionally include multiple groups
		 *          {
		 *             p: 0,      // The position in the timeline for this keyframe
		 *             v: { .. }, // The values for each parameter
		 *             e: { .. }  // Optional custom easing, defaults to the 'propEasing' confguration
		 *          }
		 *       ]
		 *    ],
		 *    mapping: {          // Mapping function for each parameter. This functions
	     *                        // allow the user to provide additional translation parameters.
	     *                        // For example, you can easily have sinusoidal animation like this:
	     *
	     *       'mySin': function( value, config ) {
		 *           // value  : The value about to be set on the parameter
		 *           // config : The config object defined above
		 *
		 *           // Return the actual value to be defined
		 *           return Math.sin(value) * config.distance;
	     *       }
	     *
		 *    }
		 * };
		 * @param {timeline} object - The timeline information object
		 */
		Animator.prototype.setTimeline = function( timeline ) {

			// Set timeline
			this.timeline = Object.create( timeline );

			// Validate timeline integrity
			if (this.timeline['keyframes'] == undefined) {
				console.error("Animator: Invalid timeline specified: Keyframes are not defined!");
				return;
			}

			// Set defaults if missing
			if (this.timeline['config'] == undefined)
				this.timeline.config = {};
			if (this.timeline['mapping'] == undefined)
				this.timeline.mapping = {};
			if (this.timeline['tags'] == undefined)
				this.timeline.tags = {};
			if (this.timeline['defaults'] == undefined)
				this.timeline.defaults = {};

			// Create single keyframe array if there are no timeline groups
			if (this.timeline.keyframes['length'] === undefined) {
				this.timeline.keyframes = [this.timeline.keyframes];
			}

			// Optimize timeline keyframes if they are not already
			if (!this.timeline.optimized) {

				// Get min/max
				var min=this.timeline.keyframes[0][0].p, max=min;
				for (var j=0; j<this.timeline.keyframes.length; j++) {
					var kf = this.timeline.keyframes[j];
					for (var i=0; i<kf.length; i++) {
						if (kf[i].p < min)
							min = kf[i].p;
						if (kf[i].p > max)
							max = kf[i].p;
					}
				}

				// Perform optimizations
				var range = max - min;
				for (var j=0; j<this.timeline.keyframes.length; j++) {
					var kf = this.timeline.keyframes[j];
					for (var i=0; i<kf.length; i++) {

						// Rescale all keyframe positions between 0.0 and 1.0
						kf[i].p = (kf[i].p - min) / range;

						// Make sure we have required fields
						kf[i].e = kf[i].e || {};
						kf[i].v = kf[i].v || {};

						// Replace easing strings with functions
						for (k in kf[i].e) {
							if (typeof(kf[i].e[k]) == 'string') {
								var eName = kf[i].e[k];
								kf[i].e[k] = Easing[eName];
								if (kf[i].e[k] == undefined) {
									console.warn("Animator: Unknown easing '"+eName+"' for property '"+k+"' in keyframe #",i);
									kf[i].e[k] = this.propEasing;
								}
							}
						}

					}

					// Update kf
					kf._tFrom = 0;
					kf._tTo = 1;

				}

				// Normalize tags
				for (k in this.timeline.tags) {
					if (typeof(this.timeline.tags[k]) != 'function') {
						this.timeline.tags[k] = (this.timeline.tags[k] - min) / range;
					}
				}

				// Mark timeline as optimized
				this.timeline.optimized = true;

			}

		}

		/**
		 * Set the properties of all objects on the animation on the
		 * position specified by offset.
		 *
		 * This position is normalized between 0.0 and 1.0
		 *
		 * @param {float} offset - The offset in the animation between 0.0 and 1.0
		 */
		Animator.prototype.setAnimationPos = function( offset ) {

			// Validate environment
			if (!this.timeline) {
				console.warn("Animator: Animation requested, but timeline has not been defined");
				return;
			}

			// Iterate over keyframe groups
			for (var j=0; j<this.timeline.keyframes.length; j++) {
				var kf = this.timeline.keyframes[j],
					uFlow=false, oFlow=false;

				// Check some obvious cases
				if (offset <= kf[0].p) {
					nFrom = 0;
					nTo = 1;
					uFlow = true;

				} else if (offset >= kf[kf.length-1].p) {
					nTo = kf.length-1;
					nFrom = nTo-1;
					oFlow = true;

				} else {

					// Validate/update timeline bounds
					var nFrom = kf._tFrom,
						nTo = kf._tTo;

					// Fast frame lookup algorithm, focused on looking-up
					// in relative frame positions.
					if (offset >= kf[nFrom].p) {

						// The offset is located AFTER the
						// current start frame
						while (true) {
							if (nFrom+1 < kf.length) {
								if (kf[nFrom+1].p > offset) {
									nTo = nFrom+1;
									break;
								}
							} else {
								nTo = kf.length-1;
								break;
							}
							nFrom++;
						}

					} else {

						// The offset is located BEFORE the
						// current end frame
						while (true) {
							if (nTo-1 > 0) {
								if (kf[nTo-1].p < offset) {
									nFrom = nTo-1;
									break;
								}
							} else {
								nFrom = 0;
								break;
							}
							nTo--;
						}

					}
				}

				// Update index positions
				kf._tFrom = nFrom;
				kf._tTo = nTo;

				// Calculate interpolation width and index
				var iW = kf[nTo].p - kf[nFrom].p,
					iP = offset - kf[nFrom].p;

				// Get easing functions for from-frame
				var kfEasing = kf[nFrom].e || {},
					kffFrom = kf[nFrom].v, kffTo = kf[nTo].v;

				// Apply values
				//console.log("Animator: @",offset,": ",nFrom,"-",nTo);
				//console.log("Animator: -",nFrom,"-",nTo,"--------------------");
				for (k in kffFrom) {
					if (typeof(kffFrom[k]) != 'function') {
						
						// Get from/to and easing values
						var vFrom = kffFrom[k],
							vTo = kffTo[k],
							easingFn = kfEasing[k] || this.propEasing,
							assignFn = this.assignFn[k] || function(v,c) { console.warn("Animator: Missing assign function for property", k); };

						//console.log("Animator: k["+k+"]=ease(",iP,vFrom,vTo,iW+")");

						// Skip entries with missing 'to'
						if (vTo == undefined)
							continue;

						// On uderflow, use the minor value
						if (uFlow) {
							assignFn( vFrom, this.timeline.config );
						} else if (oFlow) {
							assignFn( vTo, this.timeline.config );
						} else {
							assignFn(
								// Calculate eased value
								easingFn(
										null,
										iP,
										0,
										vTo-vFrom,
										iW
								)+vFrom,
								// Secon argument is the timeline config
								this.timeline.config
							);
						}

					}
				}
			}

		}

		/**
		 * Update the animation frame
		 * @param {int} delta - The time delta in milliseconds
		 */
		Animator.prototype.update = function( delta ) {
			if (!this.animating) return;

			// Update time with the delta specified
			this.timeOffset += delta;
			if (this.timeOffset > this.duration)
				this.timeOffset = this.duration;

			// Apply easing function to calculate current position (in ms)
			var pos = this.easing(null, 
				this.timeOffset, 
				0,
				this.toPosition-this.fromPosition,
				this.duration
			) + this.fromPosition;

			// Normalize position & set step
			var posNorm = pos / this.duration;

			// Fire tick callbacks
			for (var i=0; i<this.__onUpdateCallbacks.length; i++) {
				try {
					this.__onUpdateCallbacks[i]( this.timeOffset );
				} catch(e) {
					console.warn("Animator: onUpdate() callback #"+i+" raised exception",e);
				}
			}

			// Fire callback if completed
			if (this.timeOffset == this.duration) {

				// Fire the completed callback
				if (this.completedCallback) {
					this.completedCallback();
					this.completedCallback = null;
				}

				// Fire the chain callback
				if (this.chainCallback)
					this.chainCallback();

				// Check if we should loop
				if (this.loop) {
					this.timeOffset = 0;
				} else {
					this.animating = false;
				}

			}

			// Apply animation on the end to avoid exceptions
			// that can keep animation in an infinite loop.
			//console.log("Animator: Δ=", delta,", t=",this.timeOffset,"/",this.duration," v=",pos," vNorm=",posNorm);
			this.setAnimationPos( posNorm );

		};

		/**
		 * Start the automatic animation
		 *
		 * @param {bool} loop - If set to yes, the function will loop forever
		 * @param {function} onComplete - A callback to be fired when the animation has completed
		 *
		 */
		Animator.prototype.start = function( loop, onComplete ) {
			
			// Check for missing first argument
			if (typeof(loop) == 'function') {
				onComplete = loop;
				loop = false;
			}

			// Set properties
			this.loop = (loop == undefined) ? false : loop;
			this.completedCallback = onComplete || null;
			this.fromPosition = 0;
			this.toPosition = this.duration;
			this.timeOffset = 0;

			// Set animation flag
			this.animating = true;

			// Return reference
			return this;
		}

		/**
		 * Go to a particular offset in the animation
		 *
		 * @param {int} offset - The offset in the animation to skip through (within 0.0 - duration bounds)
		 * @param {function} onComplete - A callback to be fired when the animation has completed
		 */
		Animator.prototype.goto = function( offset, onComplete ) {

			// Apply easing function to calculate current position (in ms)
			var pos = this.easing(null, 
				this.timeOffset, 
				0,
				this.toPosition-this.fromPosition,
				this.duration
			) + this.fromPosition;

			// Wrap offset in reasonable bounds
			if (offset < 0) offset=0;
			if (offset > this.duration) offset=this.duration;

			// Check if we are already there
			if (offset == pos) {

				// Normalize & set
				var posNorm = pos / this.duration;
				this.setAnimationPos( posNorm );

				// don't continue
				return;
			}

			// Update from/to
			this.fromPosition = pos;
			this.toPosition = offset;

			// Prepare variables
			this.timeOffset = 0;
			this.completedCallback = onComplete;
			this.loop = false;
			this.animating = true;

			// Return reference
			return this;

		}

		/**
		 * Go to a particular tag in the animation
		 *
		 * Tags are defined by in the timeline configuration.
		 *
		 * @param {string} tag - The number of the tag to navigate to
		 * @param {function} onComplete - A callback to be fired when the animation has completed
		 */
		Animator.prototype.gotoTag = function( tag, onComplete ) {

			// Make sure such tag exists
			if (this.timeline.tags[tag] == undefined) {
				console.warn("Animator: Missing tag '"+tag+"' in the timeline");
				return;
			}
			
			// Calculate position in ms of that frame
			var framePos = this.timeline.tags[tag] * this.duration;
			this.goto( framePos, onComplete );

		}

		/**
		 * Register a callback function to be fired on every animation updated.
		 * The first argument is the current time.
		 *
		 * @param {function} func - A callback to be fired on every tick
		 */
		Animator.prototype.onUpdate = function( func ) {
			this.__onUpdateCallbacks.push(func);
		}

		/**
		 * Unregister a callback function previously registered with onUpdate()
		 *
		 * @param {function} func - A callback to be fired on every tick
		 */
		Animator.prototype.offUpdate = function( func ) {
			var i = this.__onUpdateCallbacks.indexOf(func);
			if (i<0) return;
			this.__onUpdateCallbacks.splice(i,1);
		}

		// Return animator
		return Animator;

	}

);