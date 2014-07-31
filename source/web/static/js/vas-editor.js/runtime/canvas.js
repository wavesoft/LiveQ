define(

	[ "jquery", "fabric", "vas-editor/runtime/timeline" ],

	function($, fabric, Timeline) {
		
		/**
		 * Runtime canvas for rendering animation & level info
		 */
		var Canvas = function() {
			this.hostDOM = hostDOM;

			// Prepare canvas DOM
			this.canvasDOM = $('<canvas></canvas>');
			this.hostDOM.append( this.canvasDOM );

			// Prepare canvas fabric
			fabric.Object.prototype.transparentCorners = false;
			this.canvasFabric = new fabric.Canvas($(this.canvasDOM)[0]);

			// Initialize timeline runtime
			this.timeline = new Timeline( this.canvasFabric );
			
		}

		/**
		 * Initialize everything from JSON
		 */
		Canvas.prototype.fromJSON = function(json) {

		}

		// Return hotspots overlay class
		return Canvas;

	}

)