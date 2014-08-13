define(

	// Dependencies
	["jquery", "core/registry", "core/ui", "core/base/data_widget" ], 

	/**
	 * This is the default observable widget component for the base interface.
	 *
 	 * @exports base/components/tuning/observable
	 */
	function(config, R, UI, DataWidget) {

		var DefaultStatusWidget = function(hostDOM) {

			// Initialize widget
			DataWidget.call(this, hostDOM);

			// Tunable parameters
			this.diameter = 200;
			this.shootRadius = 200;
			this.shootZoneWidth = 40;
			this.pinIDs = {};

			// Prepare host
			this.element = $('<div class="progress-widget"></div>');
			hostDOM.append( this.element );

			// Prepare abort button
			this.abortIcon = $('<a href="do:abort" class="button"><div>Abort</div></a>');
			this.element.append(this.abortIcon);
			this.abortIcon.click((function(e) {
				e.preventDefault();
				e.stopPropagation();
				this.trigger('abort');
			}).bind(this));

			// Prepare progress knob
			this.progressKnob = $('<input type="text" value="25" />');
			this.progressKnobBlur = $('<input type="text" value="25" />');
			this.element.append(this.progressKnob);
			this.element.append(this.progressKnobBlur);
			this.progressKnob.knob({
				min:0, max:100,
				width 		: this.diameter - 12,
				height 		: this.diameter - 12,
				thickness	: 0.1,
				angleArc 	: 270,
				angleOffset : 45,
				readOnly  	: true,
				className 	: 'knob',
				fgColor 	: "#22b573",
				bgColor 	: "#EFEFEF",
			});
			this.progressKnobBlur.knob({
				min:0, max:100,
				width 		: this.diameter - 12,
				height 		: this.diameter - 12,
				thickness	: 0.1,
				angleArc 	: 270,
				angleOffset : 45,
				readOnly  	: true,
				className 	: 'knob blur',
				fgColor 	: "#22b573",
				bgColor 	: "transparent",
			});

			// Shoot target is at this.shootTarget
			this.shootTarget = 250;
			this.element.append( this.elmShootZone = this.createRadialMarker( this.shootTarget, "", "#2ecc71", "", this.shootZoneWidth ) );
			this.element.append( this.elmShootMin  = this.createRadialMarker( this.shootTarget - this.shootZoneWidth/2, "", "#2ecc71" ) );
			this.element.append( this.elmShootMax  = this.createRadialMarker( this.shootTarget + this.shootZoneWidth/2, "Your target", "#2ecc71" ) );
			this.elmShootZone.css({
				'border-style': 'solid',
				'border-width': this.shootZoneWidth,
				'opacity'     : 0.3
			});

			// Create globe
			this.globeDOM = $('<div class="globe"></div>');
			this.element.append( this.globeDOM );
			this.globe = R.instanceComponent( "widget.globe3d", this.globeDOM );
			if (!this.globe) {
				console.warn("Unable to instantiate Glob3D widget");
			} else {
				this.forwardVisualEvents( this.globe );
				this.globe.onResize( this.diameter, this.diameter );
			}

			// Reset value
			this.onUpdate(0);

			// Register visual aid 
			R.registerVisualAid("running.button.abort", this.abortIcon, { "screen": "screen.running" });

		};

		// Subclass from DataWidget
		DefaultStatusWidget.prototype = Object.create( DataWidget.prototype );

		////////////////////////////////////////////////////////////
		//                    Helper Functions                    //
		////////////////////////////////////////////////////////////

		/**
		 * Create a new radial marker
		 */
		DefaultStatusWidget.prototype.createRadialMarker = function(radius, name, borderColor, fillColor, borderWidth) {
			var bw = borderWidth || 1,
				marker = $('<div class="c-marker"></div>'),
				label = $('<div class="label">'+name+'</div>');

			// Prepare marker style
			marker.css({
				'left'   				: (this.diameter/2)-radius-bw/2,
				'top'    				: (this.diameter/2)-radius-bw/2,
				'width'  				: 2*radius-bw,
				'height' 				: 2*radius-bw,
				'border-radius' 		: radius+bw/2,
				'-webkit-border-radius' : radius+bw/2,
				'-moz-border-radius' 	: radius+bw/2,
				'-o-border-radius'		: radius+bw/2
			});

			// Prepare marker colors
			if (borderColor) {
				marker.css({
					'border-color'		: borderColor
				});
				label.css({
					'color'				: borderColor
				});
			}
			if (fillColor) {
				var r=0,g=0,b=0;
				if (fillColor[0] == '#') {
					r = parseInt(fillColor.substr(1,2),16);
					g = parseInt(fillColor.substr(3,2),16);
					b = parseInt(fillColor.substr(5,2),16);
				}
				marker.css({
					'background-color'	: 'rgba('+r+','+g+','+b+',0.3)',
				});
			}

			marker.append(label);
			return marker;
		}

		/**
		 * Update the given element to a radial element
		 */
		DefaultStatusWidget.prototype.updateRadialMarker = function(marker, radius, borderWidth) {
			var bw = borderWidth || 1;
			marker.css({
				'left'   				: (this.diameter/2)-radius-bw/2,
				'top'    				: (this.diameter/2)-radius-bw/2,
				'width'  				: 2*radius-bw,
				'height' 				: 2*radius-bw,
				'border-radius' 		: radius+bw/2,
				'-webkit-border-radius' : radius+bw/2,
				'-moz-border-radius' 	: radius+bw/2,
				'-o-border-radius'		: radius+bw/2
			});
		}

		////////////////////////////////////////////////////////////
		//           Implementation of the DataWidget             //
		////////////////////////////////////////////////////////////

		/**
		 * When shown, show first-time aids
		 */
		DefaultStatusWidget.prototype.onShown = function() {

			// Show first-time aids
			UI.showFirstTimeAid( "running.button.abort" );

		}

		/**
		 * Fired when a worker node is added to the job
		 */
		DefaultStatusWidget.prototype.onWorkerRemoved = function( id ) {
			this.globe.removePin( this.pinIDs[id] );
			delete this.pinIDs[id];
		}

		/**
		 * Fired when a worker node is added to the job
		 */
		DefaultStatusWidget.prototype.onWorkerAdded = function( id, info ) {
			var lat = info['lat'] || Math.random() * 180 - 90,
				lng = info['lng'] || Math.random() * 180;
			this.pinIDs[id] = this.globe.addPin( lat, lng );
		}

		/**
		 * Reisze canvas & engine dimentions to fit host
		 */
		DefaultStatusWidget.prototype.onStartRun = function( values, referenceHistograms ) {
			this.pinIDs = {};
			this.globe.removeAllPins();
		}

		/**
		 * Update tuning widget metadata
		 */
		DefaultStatusWidget.prototype.onMetaUpdate = function(meta) {
			
		}

		/**
		 * Update tuning widget value
		 */
		DefaultStatusWidget.prototype.onUpdate = function(value) {
			if (value == undefined) { // Reset
				this.progressKnob.val(0).trigger('change');
				this.progressKnobBlur.val(0).trigger('change');
				return;
			}

			// Change configuration based on value
			this.progressKnob.val(value*100).trigger('change');
			this.progressKnobBlur.val(value*100).trigger('change');

		}

		////////////////////////////////////////////////////////////
		//            Implementation-specific functions           //
		////////////////////////////////////////////////////////////

		/**
		 * Set target radius
		 */
		DefaultStatusWidget.prototype.setShootTarget = function(target) {

			this.shootTarget = target;			
			this.updateRadialMarker( this.elmShootZone, this.shootTarget, this.shootZoneWidth );
			this.updateRadialMarker( this.elmShootMin,  this.shootTarget - this.shootZoneWidth/2 );
			this.updateRadialMarker( this.elmShootMax,  this.shootTarget + this.shootZoneWidth/2 );
		}

		/**
		 * Update the widget position
		 */
		DefaultStatusWidget.prototype.setPosition = function(x,y) {
			this.element.css({
				'left': x - this.diameter/2,
				'top': y - this.diameter/2
			});
		}

		// Store tuning widget component on registry
		R.registerComponent( 'widget.running_status', DefaultStatusWidget, 1 );

	}

);