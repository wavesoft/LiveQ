define(

	["jquery", "fabric", "tweenjs", "core/db", "vas-editor/runtime/timeline"],

	function($, fabric, createjs, DB, Timeline) {

		/**
		 * A visual object that can be placed on timeline
		 *
		 * This definition provides the required metatada for rebuilding the TweenJs
		 * timeline when needed.
		 */
		var EditableElement = function( obj, runtime ) {
			Timeline.Element.call(this, obj);
			this.__keyframes = [ ];
			this.__tweenRef = null;
			this.__runtime = runtime;
			this.__group = null;

			// Properties where we should add group properties
			this.__groupProperties = ['Left','Top'];

			//
			// Redefine passthrough properties in order to include group support
			//
			var config = { };
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
							if (!this.__group) {
								return this.__object['get'+propName]();
							} else {
								var n = this.__object['get'+propName]();
								if (this.__groupProperties.indexOf(propName) > -1)
									n += this.__group['get'+propName]();
								return n;
							}
						}
					})(ccName).bind(this),
					set: (function(propName) { 
						return function(value) {
							if (!this.__group) {
								this.__object['set'+propName]( value );
							} else {
								if (this.__groupProperties.indexOf(propName) > -1)
									value -= this.__group['get'+propName]();
								this.__object['set'+propName]( value );
							}
							if (this.__onUpdate) this.__onUpdate();
						}
					})(ccName).bind(this)
				};
			}
			Object.defineProperties(this, config);

		}

		// Subclass from Timeline.SpriteObject
		EditableElement.prototype = Object.create( Timeline.Element.prototype );

		/**
		 * Update object's group
		 */
		EditableElement.prototype.setGroup = function(g) {
			this.__group = g;
		}

		/**
		 * Update object's reflection on the runtime
		 */
		EditableElement.prototype.updateReflection = function() {
			
			// Remove previous tween from runtime
			if (this.__tweenRef) {
				this.__runtime.removeTween( this.__tweenRef );
				createjs.Tween.removeTweens( this );
			}

			// Build a new tween
			this.__tweenRef = this.__runtime.buildTween( this, this.__keyframes );

			// Place it back on the runtime
			this.__runtime.addTween( this.__tweenRef );

			// Trigger UI update
			this.__runtime.tick(0)

		}

		/**
		 * Set a keyframe of all of object's current properties
		 */
		EditableElement.prototype.setKeyframe = function( position ) {

			// Build properties array
			var props = { };
			for (var i=0; i<this.__propertyNames.length; i++) {
				// Get the property value (the approppriate getter will be fired)
				props[this.__propertyNames[i]] = this[this.__propertyNames[i]];
			}

			// Update timeline position
			props['at'] = position;

			// Lookup index position in the keyframes
			var index = 0, found = false;
			for (var i=0; i<this.__keyframes.length; i++) {
				// Always keep index
				index = i;
				// Replace an existing keyframe
				if (this.__keyframes[i].at == position ) {

					// Replace the keyframe that matches excactly the position
					this.__keyframes[i] = props;
					this.updateReflection();

					return;

				} else if (this.__keyframes[i].at > position) {
					found = true;
					break;
				}
			}

			// Append/Insert new entry
			if (!found) {
				this.__keyframes.push(props);
			} else {
				this.__keyframes.splice(index,0,props);
			}

			// Update reflection
			this.updateReflection();

		}

		/**
		 * Provide editing capabilities to the animation runtime
		 */
		var EditableTimeline = function( canvas ) {
			Timeline.call(this, canvas );
			this.editableObjects = [];
			this.timeStep = 40; //ms (25 Fps)
		};

		// Subclass from Sprite Runtime
		EditableTimeline.prototype = Object.create( Timeline.prototype );

		/**
		 * Export the timeline to JSON
		 */
		EditableTimeline.prototype.toJSON = function( canvas ) {
			var tweens = [];
			for (var i=0; i<this.editableObjects.length; i++) {
				tweens.push(this.editableObjects[i].__keyframes);
			}
			// Return objects and tweens
			return {
				'canvas': canvas.toJSON(),
				'tweens': tweens
			};
		}

		/**
		 * Clear everything
		 */
		EditableTimeline.prototype.clear = function() {

			// Remove all tweens from timeline
			for (var i=0; i<this.editableObjects.length; i++) {
				this.removeTween( this.editableObjects[i].__tweenRef );
				createjs.Tween.removeTweens( this.editableObjects[i] );				
			}

			// Remove all references
			this.editableObjects = [];

			// Rewind
			this.gotoAndStop(0);

		}

		/**
		 * Update view in-position
		 */
		EditableTimeline.prototype.update = function() {
			var d = this.position;
			this.gotoAndStop(0);
			this.gotoAndStop(d);
		}

		/**
		 * Snap time into time step-wide segments
		 */
		EditableTimeline.prototype.snapTime = function( timePos ) {
			return Math.round( timePos / this.timeStep ) * this.timeStep;
		}

		/**
		 * Update object's reflection on the runtime
		 */
		EditableTimeline.prototype.scrollPosition = function( pos ) {
			this.gotoAndStop(0);
			this.gotoAndStop(pos);
		}

		/**
		 * Remove an object
		 */
		EditableTimeline.prototype.remove = function( obj ) {

			// Find the object in our list
			var i = this.editableObjects.indexOf(obj);
			if (i<0) return;

			// Remove from list
			this.editableObjects.splice(i,1);

			// Remove tween ref
			if (obj.__tweenRef) {
				this.removeTween( obj.__tweenRef );
				createjs.Tween.removeTweens( obj );
			}

		}

		/**
		 * Import a new tween.js object, wrap it and place it on timeline
		 */
		EditableTimeline.prototype.importObject = function( obj ) {
			
			// Wrap object into a new editable element
			var wrapObj = new EditableElement(obj, this);

			// Update reflection (place it on timeline)
			wrapObj.updateReflection();

			// Store on editable objects array
			this.editableObjects.push( wrapObj );

			// Put two keyframes
			wrapObj.setKeyframe( this.snapTime( this.position ) );
			wrapObj.setKeyframe( this.snapTime( this.position ) + this.timeStep * 10 );

			// Return instance for further manipulation
			return wrapObj;

		}

		/**
		 * Release group information from all objects
		 */
		EditableTimeline.prototype.releaseGroup = function() {
			for (var i=0; i<this.editableObjects.length; i++) {
				this.editableObjects[i].__group = null;
			}
		}

		/**
		 * Lookup element from the fabric.js object
		 */
		EditableTimeline.prototype.elementFromFabricObject = function( obj, group ) {
			for (var i=0; i<this.editableObjects.length; i++) {
				if (this.editableObjects[i].__object == obj) {
					this.editableObjects[i].setGroup(group);
					return this.editableObjects[i];
				}
			}
			return null;
		}

		/**
		 * Set keyframe for the given object (or all objects if missing)
		 */
		EditableTimeline.prototype.setKeyframe = function( obj, pos ) {
			var position = pos || this.snapTime( this.position );
			for (var i=0; i<this.editableObjects.length; i++) {
				if ((obj == undefined) || (this.editableObjects[i] == obj)) {
					this.editableObjects[i].setKeyframe( position );
				}
			}
		}

		/**
		 * Create editabl objects using the keyframes from the given timeline definition
		 */
		EditableTimeline.prototype.initWithJSON = function( objects, elmDef ) {
			for (var i=0; i<elmDef.length; i++) {

				// Wrap object into a new editable element
				var wrapObj = new EditableElement(objects[i], this);
				wrapObj.__keyframes = elmDef[i];

				// Update reflection (place it on timeline)
				wrapObj.updateReflection();

				// Store on editable objects array
				this.editableObjects.push( wrapObj );

			}
		}

		return EditableTimeline;

	}

);