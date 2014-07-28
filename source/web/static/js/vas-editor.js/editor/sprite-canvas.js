define(

	["jquery", "fabric", "tweenjs", "core/db"],

	function($, fabric, createjs, DB) {

		var ObjectWrapper = function( object ) {
			this.__object = object;

			// Extract/create some additional properties
			this.__object.__pathProgression = 1;
			this.__object.__pathElements = this.__object.path.slice(0);

			// OnUpdate handler
			this.onUpdate = null;

			// Prepare property config
			var config = {
				"progression": {
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

						// Fire the onUpdate handler
						if (this.onUpdate)
							this.onUpdate("progression", v);

					}).bind(this)
				}
			};

			// Passthrough properties
			var passthrough = [ "left", "top", "scaleX", "scaleY" ];
			for (var i=0; i<passthrough.length; i++) {
				config[passthrough[i]] = {
					get: (function(propName) { 
						return function() {
							return this.__object[propName];
						}
					})(passthrough[i]).bind(this),
					set: (function(propName) { 
						return function(value) {
							this.__object[propName] = value;
							if (this.onUpdate) this.onUpdate();
						}
					})(passthrough[i]).bind(this)
				};
			}

			// Define properties using the config
			Object.defineProperties(this, config);

		}

		var SpriteCanvas = function(store, canvasElement) {
			this.store = store;
			this.canvasElement = canvasElement;

			var canvas = this.canvas = new fabric.Canvas($(this.canvasElement)[0], {
				isDrawingMode: true
			});

			//fabric.Object.prototype.transparentCorners = false;

			canvas.freeDrawingBrush.color = '#FFF';
			canvas.freeDrawingBrush.width = 4;

			window.c = canvas;

			canvas.on('path:created', (function(obj) {

				console.log(obj);
				canvas.isDrawingMode = false;

				window.p = obj.path;

				window.ow = new ObjectWrapper(obj.path);
				window.ow.onUpdate = function() { canvas.renderAll(); };

				window.doit = function() {
					window.ow.progression = 0;

					window.timeline = new createjs.Timeline();

					var tween = createjs.Tween.get(window.ow)
							.wait(500)
							.to({progression:1}, 1000);

					window.timeline.addTween(tween);
					setInterval(function() {
						window.timeline.tick(10);
					}, 10);
				}

			}).bind(this));

		};

		SpriteCanvas.prototype.start = function() {

		}

		return SpriteCanvas;

	}

);