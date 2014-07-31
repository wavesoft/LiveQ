define(

	["jquery", "fabric", "tweenjs", "core/db", "vas-editor/runtime/timeline"],

	function($, fabric, createjs, DB, Timeline) {
		
		/**
		 * 
		 */
		var HotspotsOverlay = function(hostDOM) {
			this.hostDOM = hostDOM;
			this.element = $('<div class="hotspots"></div>');
			this.hostDOM.append( this.element );
		}

		HotspotsOverlay.fromJSON = function() {
			
		}

		// Return hotspots overlay class
		return HotspotsOverlay;

	}

)