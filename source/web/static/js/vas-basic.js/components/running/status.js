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
			this.element = $('<div class="progress"></div>');
			hostDOM.append( this.element );

			// Prepare abort button
			this.startIcon = $('<a href="do:abort" class="button"><div>Abort</div></a>');
			this.element.append(this.startIcon);

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

			// Create globe
			this.globeDOM = $('<div class="globe"></div>');
			this.element.append( this.globeDOM );
			this.globe = R.instanceComponent( "widget.globe3d", this.globeDOM );

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
		R.registerComponent( 'widget.running_status', DefaultStatusWidget, 1 );

	}

);