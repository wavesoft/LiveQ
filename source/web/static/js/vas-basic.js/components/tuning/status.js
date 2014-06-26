define(

	// Dependencies
	["jquery", "core/registry", "core/base/data_widget" ], 

	/**
	 * This is the default observable widget component for the base interface.
	 *
 	 * @exports base/components/tuning/observable
	 */
	function(config, R, DataWidget) {

		var DefaultStatusWidget = function(hostDOM) {

			// Initialize widget
			DataWidget.call(this, hostDOM);

			// Tunable parameters
			this.diameter = 160;

			// Prepare host
			this.element = $('<div class="progress-widget"></div>');
			hostDOM.append(this.element);

			// Prepare progress knob
			this.progressKnob = $('<input type="text" value="25" />');
			this.element.append(this.progressKnob);
			this.progressKnob.knob({
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
			});

			// Prepare marker regions
			var self = this;
			var prepareMarker = function(radius, name ) {
				var marker = $('<div class="c-marker"></div>');
				marker.css({
					'left'   			: (self.diameter/2)-radius,
					'top'    			: (self.diameter/2)-radius,
					'width'  			: 2*radius,
					'height' 			: 2*radius,
					'border-radius' 		: radius,
					'-webkit-border-radius' : radius,
					'-moz-border-radius' 	: radius,
					'-o-border-radius'		: radius
				});
				return marker;
			}
			this.element.append( prepareMarker( 150, "Good" ) );
			this.element.append( prepareMarker( 350, "Average" ) );
			this.element.append( prepareMarker( 400, "Bad" ) );
			this.element.append( prepareMarker( 533, "Acceptable" ) );
			this.element.append( prepareMarker( 600, "Bad" ) );

			// Prepare tunable icon
			this.startIcon = $('<a href="do:begin" class="button">Begin</a>');
			this.element.append(this.startIcon);

			// Prepare label & sublabel
			this.titleElm = $('<div class="title">Good</div>');
			this.subtitleElm = $('<div class="subtitle">match</div>');
			this.element.append(this.titleElm);
			this.element.append(this.subtitleElm);

		};

		// Subclass from DataWidget
		DefaultStatusWidget.prototype = Object.create( DataWidget.prototype );

		////////////////////////////////////////////////////////////
		//         Implementation of the DataWidget            //
		////////////////////////////////////////////////////////////

		/**
		 * Update tuning widget metadata
		 */
		DefaultStatusWidget.prototype.onMetadataUpdate = function(meta) {
			
		}

		/**
		 * Update tuning widget value
		 */
		DefaultStatusWidget.prototype.onUpdate = function(value) {
			if (value == undefined) { // Reset

			}
			this.update();
		}

		////////////////////////////////////////////////////////////
		//            Implementation-specific functions           //
		////////////////////////////////////////////////////////////

		/**
		 * This event is fired when the view is scrolled/resized and it
		 * specifies the height coordinates of the bottom side of the screen.
		 */
		DefaultStatusWidget.prototype.onHorizonTopChanged = function(bottom) {
			this.bottom = bottom;
			if (this.y > this.bottom) {
				this.indicator.css({
					'top': bottom - 15
				});	
				this.indicator.fadeIn();
			} else {
				this.indicator.fadeOut();
			}
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

		/**
		 * Update the visual representation of the element
		 */
		DefaultStatusWidget.prototype.update = function() {

		}

		// Store tuning widget component on registry
		R.registerComponent( 'widget.tuning_status', DefaultStatusWidget, 1 );

	}

);