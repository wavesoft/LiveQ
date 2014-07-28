define(

	["jquery", "fabric", "tweenjs", "core/db"],

	function($, fabric, createjs, DB) {

		/**
		 * Initialize the sprite animation runtime
		 *
		 * @property {fabricjs.Canvas} canvas - The Fabric.js canvas to use for rendering
		 */
		var Timeline = function( canvas ) {
			createjs.Timeline.call( this );
			this.canvas = canvas;
		};

		// Subclass from createjs.Timeline because we are using most of it's
		// properties as-is.
		Timeline.prototype = Object.create( createjs.Timeline.prototype );

		/**
		 * Helper function to build a tween using the given animation definition
		 */
		Timeline.prototype.buildTween = function(object, definition) {
			var lastPos = 0,
				tween = createjs.Tween.get(object);

			for (var i=0; i<definition.length; i++) {
				var d = definition[i],
					at = d['at'];

				// Validate
				if (at == undefined) {
					console.warn('Unexpected tween definition', d);
					continue;
				}
				if (at < lastPos) {
					console.warn("Unexpected position going bacwards on tween definition", d);
					continue;
				}

				// Delete 'at' property
				delete d['at'];

				// The very first entry (if it's away from zero, we will add a delay-property set)
				if ((at > 0) && (lastPos == 0)) {
					tween.wait(at - lastPos);
					tween.set(d);
				} 
				// Otherwise we have a property transition
				else {
					tween.to(d, at - lastPos);
				}

				// Update last position
				lastPos = at;

			}

			return tween;
		}

		/**
		 * Load scene & animation definition from the JSON object specified
		 */
		Timeline.prototype.loadJSON = function() {

		}

		/**
		 * Wrapper object for Fabric.js objects that adds some
		 * additional properties for  
		 */
		Timeline.Element = function( obj ){
			this.__object = obj;

			// Initialize default property names if missing
			if (!this.__propertyNames)
				this.__propertyNames = [ "progression", "visible", "stroke", "strokeWidth", "opacity", "left", "top", "scaleX", "scaleY", "angle" ];

			// Extract/create some additional properties
			this.__object.__pathProgression = 1;
			this.__object.__pathElements = this.__object.path.slice(0);

			// OnUpdate handler
			this.__onUpdate = null;

			// Prepare property config
			var config = { };

			//
			// Dynamic property : 'progression'
			//
			// This property defines the drawing progression of an object. It can take
			// any float value between 0.0 and 1.0, where 0.0 the object is not drawn at all
			// and 1.0 is completed drawn.
			//
			config["progression"] = {
				get: (function() {

					return this.__object.__pathProgression;

				}).bind(this),
				set: (function(v) {
					
					// Wrap V in bounds
					if (v<0) v=0;
					if (v>1) v=1;

					// Calculate the path progression
					var pathLen = this.__object.__pathElements.length,
						pathPos = parseInt( v * (pathLen-1) );

					// Update path according to path progression
					this.__object.path = this.__object.__pathElements.slice(0, pathPos);

					// Keep reference
					this.__object.__pathProgression = v;

					// Fire the __onUpdate handler
					if (this.__onUpdate)
						this.__onUpdate("progression", v);

				}).bind(this)
			};

			//
			// Passthrough properties
			//
			// All the rest properties pass through via getter/setter functions
			// in camel-case (setProp/getProp).
			//
			for (var i=0; i<this.__propertyNames.length; i++) {
				
				// Skip dynamic properties
				if (this.__propertyNames[i] == "progression")
					continue;

				// Convert to camel case
				var ccName = this.__propertyNames[i][0].toUpperCase() +
							 this.__propertyNames[i].substr(1);

				// Pass-through the reset
				config[this.__propertyNames[i]] = {
					get: (function(propName) { 
						return function() {
							return this.__object['get'+propName]();
						}
					})(ccName).bind(this),
					set: (function(propName) { 
						return function(value) {
							this.__object['set'+propName]( value );
							if (this.__onUpdate) this.__onUpdate();
						}
					})(ccName).bind(this)
				};
			}

			// Define properties using the config
			Object.defineProperties(this, config);

		}

		// Return sprite runtime
		return Timeline;

	}

);