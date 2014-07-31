define(

	[ "jquery", "core/ui" ],

	function($, UI) {
		
		/**
		 * Overlay hotspots on top of the canvas
		 */
		var Hotspots = function(hostDOM) {
			this.hostDOM = hostDOM;
			this.hotspotElms = [];
			this.depth = 0;
		}

		/**
		 * Initialize hotspot information from JSON
		 */
		Hotspots.prototype.loadJSON = function(json) {
			for (var i=0; i<json.length; i++) {
				this.addHotspot( json[i] );
			}
		}

		/**
		 * Return the hotspot progression depth (number of hotspots)
		 */
		Hotspots.prototype.getDepth = function() {
			return this.hotspotElms.length;
		}

		/**
		 * Set the current hotspot progression depth
		 */
		Hotspots.prototype.setProgression = function(num) {
			for (var i=0; i<this.hotspotElms.length; i++) {
				if ((num==null) || (i<num))  {
					this.hotspotElms[i].elm.removeClass("active");
					this.hotspotElms[i].elm.addClass("visible");
				} else if (i==num) {
					this.hotspotElms[i].elm.addClass("active");
					this.hotspotElms[i].elm.addClass("visible");
				} else {
					this.hotspotElms[i].elm.removeClass("active");
					this.hotspotElms[i].elm.removeClass("visible");
				}
			}
		}

		/**
		 * Add a hotspot configuration
		 */
		Hotspots.prototype.addHotspot = function( config ) {
			var elm = $('<div class="hotspot"></div>'),
				elmLabel = $('<h1></h1>');

			// Nest elements
			elm.append(elmLabel);
			this.hostDOM.append(elm);

			// Handle click
			elm.click((function(e) {
				e.preventDefault();
				e.stopPropagation();

			}).bind(this));

			// Align
			elm.css({
				'left': config.x - $(elm).width()/2,
				'top': config.y - $(elm).height()/2
			});

			// Prepare elements
			elmLabel.text(config.short);

			// Update hotspot array
			this.hotspotElms.push(elm);

			return elm;
		}


		/**
		 * Clear all the hotspot information
		 */
		Hotspots.prototype.clear = function() {
			this.hostDOM.empty();
			this.hotspotElms = [];
		}

		// Return hotspots overlay class
		return Hotspots;

	}

)