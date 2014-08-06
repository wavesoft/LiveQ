define(

	[ "jquery", "fabric", "tweenjs", "vas-editor/runtime/timeline", "vas-editor/runtime/hotspots" ],

	function($, fabric, tweenjs, Timeline, Hotspots) {
		
		/**
		 * Runtime canvas for rendering animation & level info
		 */
		var Canvas = function( hostDOM ) {
			this.hostDOM = hostDOM;

			// Prepare canvas DOM
			this.canvasDOM = $('<canvas></canvas>');
			this.hostDOM.append( this.canvasDOM );
			this.canvasDOM.attr({
				'width': 800,
				'height': 450
			});

			// Prepare canvas fabric
			fabric.Object.prototype.transparentCorners = false;
			this.canvasFabric = new fabric.StaticCanvas($(this.canvasDOM)[0]);

			// Disable ticker
			tweenjs.Ticker.setPaused(true);

			// Initialize timeline runtime
			this.timeline = new Timeline( this.canvasFabric );
			this.timeline.addEventListener('change', (function() {
				this.canvasFabric.renderAll();
			}).bind(this));
			
			// Initialize overlay DOM
			this.hotspotsDOM = $('<div class="hotspots"></div>');
			this.hostDOM.append( this.hotspotsDOM );

			// Initialize hotspots runtime
			this.hotspots = new Hotspots( this.hotspotsDOM );

			// Setup in-house ticker
			var self = this,
				t = Date.now(),
				animate = function() {
					setTimeout(function() {
						requestAnimationFrame(function() {
							var t2 = Date.now(),
								delta = t2 - t;
							t = t2;
							self.timeline.tick(delta);
							animate();
						});
					}, 25);
				};
			animate();

		}

		/**
		 * Initialize everything from JSON
		 */
		Canvas.prototype.loadJSON = function(json, onReady) {

			// Helper function to initialize tweens
			var initTweens = (function() {

				// Initialize timeline with json
				this.timeline.initWithJSON( this.canvasFabric.getObjects(), json['scene']['tweens'] );

				// Redraw canvas
				this.canvasFabric.renderAll();

				// Initialize timeline audio
				if (json['narration']) {
					// Setup audio and fire onReady when audio is loaded
					this.timeline.setupAudio( json['narration']['audio_url'], onReady );
				} else {
					// Fire ready
					if (onReady) onReady();
				}

			}).bind(this);

			// Reset everything
			this.canvasFabric.clear();
			this.timeline.clear();
			this.hotspots.clear();

			// Load hotspot information from JSON
			this.hotspots.loadJSON( json['spots'] );

			// Load canvas objects & then init tweens
			this.canvasFabric.loadFromJSON(json['scene']['canvas'], initTweens);

		}

		// Return hotspots overlay class
		return Canvas;

	}

)