define(

	// Dependencies
	["jquery", "core/registry","core/base/tuning_components" ], 

	/**
	 * This is the default observable widget component for the base interface.
	 *
 	 * @exports base/components/tuning/observable
	 */
	function(config, R, TC) {

		var DefaultObservableWidget = function(hostDOM) {

			// Initialize widget
			TC.ObservableWidget.call(this, hostDOM);

			// Keep position for updating
			this.x = 0;
			this.y = 0;
			this.value = 0;
			this.diameter = 64;

			// Prepare host element
			this.element = $('<div></div>');
			hostDOM.append(this.element);

			// Prepare an indicator when the element goes offscreen
			this.indicator = $('<div class="indicator"></div>');
			hostDOM.append(this.indicator);

			// Prepare classes
			this.element.addClass("observable");
			this.element.addClass("sz-big");

			// Expose functions
			var self = this;

		};

		// Subclass from ObservableWidget
		DefaultObservableWidget.prototype = Object.create( TC.ObservableWidget.prototype );

		////////////////////////////////////////////////////////////
		//         Implementation of the ObservableWidget         //
		////////////////////////////////////////////////////////////

		/**
		 * Update tuning widget metadata
		 */
		DefaultObservableWidget.prototype.onMetadataUpdate = function(meta) {
			this.meta = meta;
			this.element.text(meta['short']);
		}

		/**
		 * Update tuning widget value
		 */
		DefaultObservableWidget.prototype.onUpdate = function(value) {
			this.value = value;
			this.update();
		}

		////////////////////////////////////////////////////////////
		//            Implementation-specific functions           //
		////////////////////////////////////////////////////////////

		/**
		 * Analyze histogram and try return a goodness of fit value between 0.0 (bad) and 1.0 (perfect)
		 */
		DefaultObservableWidget.prototype.getValue = function() {
			//return Math.random();
			return this.value;
		}

		/**
		 * This event is fired when the view is scrolled/resized and it
		 * specifies the height coordinates of the bottom side of the screen.
		 */
		DefaultObservableWidget.prototype.onHorizonTopChanged = function(bottom) {
			this.bottom = bottom;
			if (this.y > this.bottom) {
				this.indicator.css({
					'top': bottom - 15
				});	
				this.indicator.show();
			} else {
				this.indicator.hide();
			}
		}

		/**
		 * Set the pivot point for the rotation angle
		 */
		DefaultObservableWidget.prototype.setPivotConfig = function(x,y,angle,minD,maxD) {
			if (x !== undefined) this.pivotX = x; 
			if (y !== undefined) this.pivotY = y;
			if (minD !== undefined) this.minDistance = minD;
			if (maxD !== undefined) this.maxDistance = maxD;
			if (angle !== undefined) this.angle = angle || 0;
			this.update();
		}

		/**
		 * Update the widget position
		 */
		DefaultObservableWidget.prototype.setPosition = function(x,y) {
			this.x = x; this.y = y;
			this.update();
		}

		/**
		 * Update the visual representation of the element
		 */
		DefaultObservableWidget.prototype.update = function() {

			// Calculate position around pivot
			var v = this.getValue(),
				r = this.getValue() * (this.maxDistance - this.minDistance);

			// Update position
			this.x = this.pivotX + Math.sin(this.angle) * (r+this.minDistance);
			this.y = this.pivotY + Math.cos(this.angle) * (r+this.minDistance);

			// Pick classes
			var obsValBounds = [0.33, 0.66];

			// Remove previous classes
			this.element.removeClass("val-bd");
			this.element.removeClass("val-md");
			this.element.removeClass("val-gd");

			// Append classes
			if (v < obsValBounds[0]) {
				this.element.addClass("val-bd");
				this.diameter = 64;
			} else if (v < obsValBounds[1]) {
				this.element.addClass("val-md");
				this.diameter = 32;
			} else {
				this.element.addClass("val-gd");
				this.diameter = 24;
			}

			// Update position
			this.element.css({
				'left': this.x - this.diameter/2,
				'top' : this.y - this.diameter/2
			});

			this.indicator.css({
				'left': this.x - 10
			});
		}

		// Store tuning widget component on registry
		R.registerComponent( 'widget.observable.default', DefaultObservableWidget, 1 );

	}

);