define(

	[ "jquery", "fabric", "vas-editor/runtime/timeline", "vas-editor/runtime/hotspots" ],

	function($, fabric, Timeline, Hotspots) {
		
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
			this.canvasFabric = new fabric.Canvas($(this.canvasDOM)[0]);

			// Initialize timeline runtime
			this.timeline = new Timeline( this.canvasFabric );
			
			// Initialize overlay DOM
			this.hotspotsDOM = $('<div class="hotspots"></div>');
			this.hostDOM.append( this.hotspotsDOM );

			// Initialize hotspots runtime
			this.hotspots = new Hotspots( this.hotspotsDOM );

		}

		/**
		 * Initialize everything from JSON
		 */
		Canvas.prototype.loadJSON = function(json) {

			// Helper function to initialize tweens
			var initTweens = (function() {

				// Initialize timeline with json
				this.timeline.initWithJSON( this.canvasFabric.getObjects(), json['scene']['tweens'] );

				// Redraw canvas
				this.canvasFabric.renderAll();

			}).bind(this);

			// Reset everything
			this.canvasFabric.clear();
			this.timeline.clear();
			this.hotspots.clear();

			// Load canvas objects & then init tweens
			this.canvasFabric.loadFromJSON(json['scene']['canvas'], initTweens);

			// Load hotspot information from JSON
			this.hotspots.loadJSON( json['spots'] );

		}

		// Return hotspots overlay class
		return Canvas;

	}

)