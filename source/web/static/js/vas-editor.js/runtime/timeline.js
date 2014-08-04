define(

	["jquery", "fabric", "tweenjs", "core/db", "core/config"],

	function($, fabric, createjs, DB, Config) {

		/**
		 * Initialize the sprite animation runtime
		 *
		 * @property {fabricjs.Canvas} canvas - The Fabric.js canvas to use for rendering
		 */
		var Timeline = function( canvas ) {
			createjs.Timeline.call( this );
			this.canvas = canvas;
			this.audioElement = null;
			this.audioTween = null;
			this.gotoAndStop(0);
		};

		// Subclass from createjs.Timeline because we are using most of it's
		// properties as-is.
		Timeline.prototype = Object.create( createjs.Timeline.prototype );

		/**
		 * Overload gotoAndPlay in order to forward the audio element too
		 */
		Timeline.prototype.gotoAndPlay = function( pos ) {
			createjs.Timeline.prototype.gotoAndPlay.call( this, pos );
			if (!this.audioElement) return;

			// Seek and play audio
			this.audioElement.currentTime = pos/1000;
			if (this.audioElement.paused) this.audioElement.play();

		}

		/**
		 * Overload gotoAndStop in order to seek the audio element too
		 */
		Timeline.prototype.gotoAndStop = function( pos ) {
			createjs.Timeline.prototype.gotoAndStop.call( this, pos );
			if (!this.audioElement) return;

			// Seek & Stop audio
			if (!this.audioElement.paused) this.audioElement.pause();
			this.audioElement.currentTime = pos/1000;

		}

		/**
		 * Overload setPaused in order to pause/resume the audio element too
		 */
		Timeline.prototype.setPaused = function( paused ) {
			createjs.Timeline.prototype.setPaused.call( this, paused );
			if (!this.audioElement) return;

			// Pause/resume audio
			//this.audioElement.currentTime = this.position/1000;
			if (paused) {
				this.audioElement.pause();
			} else {
				this.audioElement.play();
			}
	
		}

		/**
		 * Helper function to build a tween using the given animation definition
		 */
		Timeline.prototype.buildTween = function(object, definition) {

			var lastPos = 0, first = true,
				tween = createjs.Tween.get(object, {override:true, paused:true, position:0});

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

				// Very first node is just set
				if (first) {
					first = false;
					tween.to(d,0);
					// Check if first node has offset
					if (at > 0) {
						tween.wait(at);
					}
				} else {
					// All other nodes are transitions
					tween.to(d, at - lastPos, createjs.Ease[ d['easing'] || 'linear' ]);
				}

				// Update last position
				lastPos = at;

			}

			// As the last step on the tween, hide
			return tween;
		}

		/**
		 * Helper function to setup the audio element with various audio sources
		 */
		Timeline.prototype.setupAudio = function(baseURL, cbReady) {

			// Remove previous instances
			if (this.audioElement) {
				this.audioElement.src = "";
				this.canvas.wrapperEl.removeChild( this.audioElement );
				this.removeTween( this.audioTween );
			}

			// If we don't have a baseURL, reset audio
			if (!baseURL) {
				this.audioElement.src = "";
				this.audioElement = null;
				if (this.audioTween) {
					this.removeTween( this.audioTween );
					this.audioTween = null;
				}
				return;
			}

			// Regen the audio element
			this.audioElement = document.createElement('audio');
			this.audioElement.loop = true;
			this.audioElement.preload = "auto";
			this.canvas.wrapperEl.appendChild( this.audioElement );

			// Lookup the appropriate audio source
			var src = document.createElement('source');
			if (this.audioElement.canPlayType("audio/ogg;")) {
				src.type = 'audio/ogg';
				src.src = baseURL + '.ogg';
			} else if (this.audioElement.canPlayType("audio/mpeg;")) {
				src.type = 'audio/mpeg';
				src.src = baseURL + '.mp3';
			} else {
				src.type = 'audio/x-wav';
				src.src = baseURL + '.wav';
			}
			this.audioElement.appendChild(src);

			// Start preloading
			this.audioElement.addEventListener('canplaythrough', (function(e) {

				// Create new empty audio tween (for definining the minimal timeline length)
				var duration = Math.round(this.audioElement.duration * 1000);
				this.audioTween = createjs.Tween.get({}, {override:true, paused:true, position:0})
										.wait(duration)
										.to({}, 0);
				this.addTween( this.audioTween );

				// Fire callback
				if (cbReady) cbReady(true);

			}).bind(this));
			this.audioElement.addEventListener('error', (function(e) {
				if (cbReady) cbReady(false);
			}).bind(this));
			this.audioElement.load();

			// Pause audio
			this.audioElement.pause();

		}

		/**
		 * Create tween objects using the keyframes from the given timeline definition
		 */
		Timeline.prototype.initWithJSON = function( objects, elmDef ) {

			// Import elements from their definition
			for (var i=0; i<elmDef.length; i++) {

				// Create the animation-helper wrapping element
				var animObject = new Timeline.Element(objects[i]);

				// Build and store the new tween
				this.addTween( this.buildTween(animObject, elmDef[i]) );

			}

		}

		/**
		 * Clear timeline
		 */
		Timeline.prototype.clear = function() {

			// Remove all tweens from timeline
			for (var i=0; i<this._tweens.length; i++) {
				this.removeTween( this._tweens[i] );
			}

			// Rewind
			this.gotoAndStop(0);

		}

		/**
		 * Wrapper object for Fabric.js objects that adds some
		 * additional properties for  
		 */
		Timeline.Element = function( obj ){
			this.__object = obj;

			// Initialize default property names if missing
			if (!this.__propertyNames)
				this.__propertyNames = [ "progression", "visible", "stroke", "fill", "strokeWidth", "opacity", "left", "top", "scaleX", "scaleY", "angle" ];

			// Extract/create some additional properties
			this.__object.__pathProgression = 1;
			if (this.__object.path)
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

					if (!this.__object.path) return 0;
					return this.__object.__pathProgression;

				}).bind(this),
				set: (function(v) {
					
					if (!this.__object.path) return;

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
					})(ccName).bind(this),
					configurable: true
				};
			}

			// Define properties using the config
			Object.defineProperties(this, config);

		}

		// Return sprite runtime
		return Timeline;

	}

);