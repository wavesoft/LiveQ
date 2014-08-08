define(

	// Dependencies
	["jquery", "core/registry", "core/ui", "core/base/data_widget", "core/config", "core/util/math" ], 

	/**
	 * This is the default observable widget component for the base interface.
	 *
 	 * @exports base/components/tuning/observable
	 */
	function(config, R, UI, DataWidget, Config, CMath) {

		var DefaultObserveStatusWidget = function(hostDOM) {

			// Initialize widget
			DataWidget.call(this, hostDOM);

			// Tunable parameters
			this.diameter = 160;
			this.minValue = 0.2;
			this.maxValue = 1000;
			this.shownVisualAid = false;

			// Prepare host
			this.element = $('<div class="progress-widget"></div>');
			hostDOM.append(this.element);

			// Create radial marker for the target zone
			this.element.append( this.elmChiGood = this.createRadialMarker( 1, "Target", "#2ecc71", "#2ecc71" ) );
			this.element.append( this.elmChiAverage = this.createRadialMarker( 1, "&chi;<sup>2</sup> = " + Config['chi2-bounds']['average'] ) );

			// Prepare progress knob
			this.knobConfig = {
				min:0, max:100,
				width 		: this.diameter - 12,
				height 		: this.diameter - 12,
				thickness	: 0.35,
				angleArc 	: 270,
				angleOffset : -135,
				readOnly  	: true,
				className 	: 'knob',
				fgColor 	: "#16a085",
				bgColor 	: "#bdc3c7",
			};
			this.progressKnob = $('<input type="text" value="25" />');
			this.element.append(this.progressKnob);
			this.progressKnob.knob(this.knobConfig);

			// Prepare tunable icon
			this.startIcon = $('<a href="do:begin" class="button">Validate</a>');
			this.element.append(this.startIcon);
			this.startIcon.click((function(e) {
				e.preventDefault();
				e.stopPropagation();
				this.trigger('begin');
			}).bind(this));

			// Prepare label & sublabel
			this.element.append('<div class="message"><span class="uicon uicon-warning"></span><br/>Results are estimated!</div>')

			// Register visual aids
			R.registerVisualAid("tuning.status", this.element, { "screen": "screen.tuning" });
			R.registerVisualAid("tuning.button.begin", this.startIcon, { "screen": "screen.tuning" });
			R.registerVisualAid("tuning.marker.target", this.elmChiGood, { "screen": "screen.tuning" });

		};

		// Subclass from DataWidget
		DefaultObserveStatusWidget.prototype = Object.create( DataWidget.prototype );

		////////////////////////////////////////////////////////////
		//                    Helper Functions                    //
		////////////////////////////////////////////////////////////

		/**
		 * Create a new radial marker
		 */
		DefaultObserveStatusWidget.prototype.createRadialMarker = function(radius, name, borderColor, fillColor, borderWidth) {
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
				'-o-border-radius'		: radius+bw/2,
				'z-index'				: -1
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
		DefaultObserveStatusWidget.prototype.updateRadialMarker = function(marker, radius, borderWidth) {
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
		DefaultObserveStatusWidget.prototype.onShown = function() {

			// Show first-time aids
			UI.showFirstTimeAid( "tuning.status" );
			UI.showFirstTimeAid( "tuning.marker.target" );

		}


		/**
		 * Update tuning widget metadata
		 */
		DefaultObserveStatusWidget.prototype.onMetaUpdate = function(meta) {
			
		}

		/**
		 * Update tuning widget value
		 */
		DefaultObserveStatusWidget.prototype.onUpdate = function(value) {
			if (value == undefined) { // Reset
				this.progressKnob.val(0).trigger('change');
				return;
			}

			// Change configuration based on value
			if (value <= Config['chi2-bounds']['good']) {
				this.knobConfig['fgColor'] = '#16a085';
				this.progressKnob.trigger( 'configure', this.knobConfig );

				// First time we reach a good value show visual aid
				if (!this.shownVisualAid) {
					this.shownVisualAid = true;
					UI.showFirstTimeAid("tuning.button.begin");
				}

			} else if (value <= Config['chi2-bounds']['average']) {
				this.knobConfig['fgColor'] = '#f39c12';
				this.progressKnob.trigger( 'configure', this.knobConfig );
			} else {
				this.knobConfig['fgColor'] = '#e74c3c';
				this.progressKnob.trigger( 'configure', this.knobConfig );
			}

			// Update progress bar
			this.progressKnob
				.val( 100 - CMath.mapChiSq( value, 0, 100 ) )
				.trigger('change');

		}

		/**
		 * The host element has changed it's dimentions
		 */
		DefaultObserveStatusWidget.prototype.onResize = function(width, height) {
			this.width = width;
			this.height = height;

			// Calculate midpoint
			var midX = this.left + this.width / 2,
				midY = this.top + this.height / 2;

			this.element.css({
				'left': midX - this.diameter/2,
				'top': midY - this.diameter/2
			});

		}
		

		////////////////////////////////////////////////////////////
		//            Implementation-specific functions           //
		////////////////////////////////////////////////////////////

		/**
		 * Update the configuration regarding the radial arrangement of the observable
		 */
		DefaultObserveStatusWidget.prototype.setRadialConfig = function(minD,maxD) {
			this.updateRadialMarker( this.elmChiGood, CMath.mapChiSq( Config['chi2-bounds']['good'], minD, maxD ) );
			this.updateRadialMarker( this.elmChiAverage, CMath.mapChiSq( Config['chi2-bounds']['average'], minD, maxD ) );
		}


		// Store tuning widget component on registry
		R.registerComponent( 'widget.tuning.status-observe', DefaultObserveStatusWidget, 1 );

	}

);