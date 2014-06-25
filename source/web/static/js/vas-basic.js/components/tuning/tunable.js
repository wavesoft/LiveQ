define(

	// Dependencies
	["jquery", "core/registry","core/base/tuning_components" ], 

	/**
	 * This is the default tunable widget component for the base interface.
	 *
 	 * @exports base/components/tuning/tunable
	 */
	function(config, R, TC) {

		var DefaultTunableWidget = function(hostDOM) {

			// Initialize widget
			TC.TunableWidget.call(this, hostDOM);

			// Tunable parameters
			this.height = 74;
			this.width = 100;

			// Prepare variables
			this.active = true;
			this.isFocused = false;
			this.value = 0;

			// Prepare host element
			this.element = $('<div class="tunable"></div>');
			hostDOM.append(this.element);

			// Prepare & nest UI elements
			this.leftWing = $('<a class="wing left">-</a>');
			this.rightWing = $('<a class="wing right">+</a>');
			this.centerDial = $('<div class="dial"></div>');
			this.element.append(this.leftWing);
			this.element.append(this.rightWing);
			this.element.append(this.centerDial);

			// Prepare input/label elements
			this.inpValue = $('<input type="text" value="0.000"></input>');
			this.lblTitle = $('<div class="title">T</div>');
			this.centerDial.append(this.lblTitle);
			this.centerDial.append(this.inpValue);

			// Auto-focus on hover
			var self = this;
			this.element.mouseover(function() {

				// If we are active, expand
				if (self.active) {
					if (!self.isFocused) {
						self.element.addClass("expanded");
						self.inpValue[0].select();
						self.isFocused = true;
					}
				} else {
				}

			});
			this.element.mouseout(function() {
				if (self.isFocused) {
					self.element.removeClass("expanded");
					self.inpValue[0].blur();
					self.isFocused = false;
				}
			});

		};

		// Subclass from TunableWidget
		DefaultTunableWidget.prototype = Object.create( TC.TunableWidget.prototype );

		////////////////////////////////////////////////////////////
		//           Implementation of the TuningWidget           //
		////////////////////////////////////////////////////////////

		/**
		 * Update tuning widget metadata
		 */
		DefaultTunableWidget.prototype.onMetadataUpdate = function(meta) {
			this.meta = meta;
		}

		/**
		 * Update tuning widget value
		 */
		DefaultTunableWidget.prototype.onUpdate = function(value) {
			this.value = value;
			this.update();
		}

		////////////////////////////////////////////////////////////
		//            Implementation-specific functions           //
		////////////////////////////////////////////////////////////

		/**
		 * This event is fired when the view is scrolled/resized and it
		 * specifies the height coordinates of the bottom side of the screen.
		 */
		DefaultTunableWidget.prototype.onHorizonTopChanged = function(bottom) {
			this.bottom = bottom;
		}

		/**
		 * Return the tuning widget value
		 */
		DefaultTunableWidget.prototype.getValue = function() {
			return this.value;
		}

		/**
		 * Activate/deactivate tunable
		 */
		DefaultTunableWidget.prototype.setActive = function(active) {
			this.active = active;
			if (active) {
				this.element.removeClass("inactive");
			} else {
				this.element.addClass("inactive");
			}
		}

		/**
		 * Set the pivot point for the rotation angle
		 */
		DefaultTunableWidget.prototype.setPivotConfig = function(x,y,angle,trackOffset) {
			if (x !== undefined) this.pivotX = x; 
			if (y !== undefined) this.pivotY = y;
			if (angle !== undefined) this.angle = angle || 0;
			if (trackOffset !== undefined) this.trackOffset = trackOffset;
			this.update();
		}

		/**
		 * Update the widget position
		 */
		DefaultTunableWidget.prototype.setPosition = function(x,y) {
			this.element.css({
				'left': x - this.width/2,
				'top' : y - this.height/2
			});
		}

		/**
		 * Update the visual representation of the element
		 */
		DefaultTunableWidget.prototype.update = function() {

			// Calculate position around pivot
			var v = this.getValue();

			// Update position
			this.x = this.pivotX + Math.sin(this.angle) * this.trackOffset;
			this.y = this.pivotY + Math.cos(this.angle) * this.trackOffset;

			// Update position
			this.element.css({
				'left': this.x - this.width/2,
				'top' : this.y - this.height/2
			});

		}

		// Store tuning widget component on registry
		R.registerComponent( 'widget.tunable.default', DefaultTunableWidget, 1 );

	}

);