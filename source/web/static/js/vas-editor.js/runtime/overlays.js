define(

	["jquery" ],

	function($) {
		
		/**
		 * Overlay hotspots on top of the canvas
		 */
		var Overlays = function(hostDOM) {
			this.hostDOM = hostDOM;
			this.element = $('<div class="hotspots"></div>');
			this.hostDOM.append( this.element );
			
		}

		Overlays.fromJSON = function() {
			
		}

		// Return hotspots overlay class
		return Overlays;

	}

)