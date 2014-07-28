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
		}

		// Subclass from Timeline.SpriteObject
		EditableElement.prototype = Object.create( Timeline.Element.prototype );

		/**
		 * Update object's reflection on the runtime
		 */
		EditableElement.prototype.updateReflection = function() {
			
			// Remove previous tween from runtime
			if (this.__tweenRef)
				this.__runtime.removeTween( this.__tweenRef );

			// Keep 'at's because they get destructed
			var ats = [];
			for (var i=0; i<this.__keyframes.length; i++) {
				ats.push( this.__keyframes[i].at );
			}

			// Build a new tween
			this.__tweenRef = this.__runtime.buildTween( this, this.__keyframes );

			// Place 'at's back
			for (var i=0; i<this.__keyframes.length; i++) {
				this.__keyframes[i].at = ats[i];
			}

			// Place it back on the runtime
			this.__runtime.addTween( this.__tweenRef );

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
		};

		// Subclass from Sprite Runtime
		EditableTimeline.prototype = Object.create( Timeline.prototype );

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

			// Return instance for further manipulation
			return wrapObj;

		}

		/**
		 * Lookup element from the fabric.js object
		 */
		EditableTimeline.prototype.elementFromFabricObject = function( obj ) {
			for (var i=0; i<this.editableObjects.length; i++) {
				if (this.editableObjects[i].__object == obj)
					return this.editableObjects[i];
			}
			return null;
		}

		/**
		 * Set keyframe for the given object (or all objects if missing)
		 */
		EditableTimeline.prototype.setKeyframe = function( obj ) {

		}

		/**
		 * Generate the JSON Definition of this runtime
		 */
		EditableTimeline.prototype.getJSONDefinition = function() {

		}

		/**
		 * Regenerate timeline using the editable objects
		 */

		return EditableTimeline;

	}

);