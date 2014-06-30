define(

	// Dependencies
	["jquery", "core/registry", "core/base/tuning_components", "core/config" ], 

	/**
	 * This is the default observable widget component for the base interface.
	 *
 	 * @exports base/components/tuning/observable
	 */
	function(config, R, TC, Config) {

		var DefaultObservableWidget = function(hostDOM) {

			// Initialize widget
			TC.ObservableWidget.call(this, hostDOM);

			// Keep position for updating
			this.x = 0;
			this.y = 0;
			this.active = true;
			this.value = 0;
			this.diameter = 64;
			this.mouseOver= false;
			this._handleTimer = 0;

			// Prepare host element
			this.element = $('<div></div>');
			hostDOM.append(this.element);

			// Prepare an indicator when the element goes offscreen
			this.indicator = $('<div class="indicator"></div>');
			hostDOM.append(this.indicator);

			// Prepare classes
			this.element.addClass("observable");
			this.element.addClass("sz-big");

			// Handle pointer events
			this.element.mouseenter((function() {
				this.mouseOver = true;
				if (this.active)
					this.handleFocus();
			}).bind(this));
			this.element.mouseleave((function() {
				this.mouseOver = false;
				this.handleBlur();
			}).bind(this));
			this.element.click((function() {
				this.trigger( "click" );
			}).bind(this));

		};

		// Subclass from ObservableWidget
		DefaultObservableWidget.prototype = Object.create( TC.ObservableWidget.prototype );

		////////////////////////////////////////////////////////////
		//         Implementation of the ObservableWidget         //
		////////////////////////////////////////////////////////////

		/**
		 * Update tuning widget metadata
		 */
		DefaultObservableWidget.prototype.onMetaUpdate = function(meta) {
			this.meta = meta;
			this.element.text(meta['info']['short']);
		}

		/**
		 * Update tuning widget value
		 */
		DefaultObservableWidget.prototype.onUpdate = function(value) {
			if (value == undefined) { // Reset
				this.value = 0;
			} else {
				this.value = value;
			}
			this.update();
		}

		////////////////////////////////////////////////////////////
		//            Implementation-specific functions           //
		////////////////////////////////////////////////////////////

		/**
		 * Take appropriate actions to focus this element
		 */
		DefaultObservableWidget.prototype.handleFocus = function() {
			clearTimeout(this._handleTimer);
			this._handleTimer = setTimeout((function() {
				this.trigger( "showDetails", this.meta );
			}).bind(this), 250);

		}

		/**
		 * Take appropriate actions to blur this element
		 */
		DefaultObservableWidget.prototype.handleBlur = function() {
			clearTimeout(this._handleTimer);
			this._handleTimer = setTimeout((function() {
				this.trigger( "hideDetails" );
			}).bind(this), 100);
		}

		/**
		 * Activate/deactivate tunable
		 */
		DefaultObservableWidget.prototype.setActive = function(active) {
			this.active = active;
			if (active) {
				this.element.removeClass("inactive");

				// Update indicator position
				this.onHorizonTopChanged(this.bottom);

				// Check for pop-up window display
				if (this.mouseOver)
					this.handleFocus();

			} else {
				this.element.addClass("inactive");
				this.indicator.hide();
			}
		}

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

			// Update indicator position only if active
			if (!this.active) return;
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

			// What's the maximum value we will render
			var maxValid = 4.0;

			// Calculate position around pivot
			var v = this.getValue(), midRange = (this.maxDistance - this.minDistance) / 2, r = 0;
			if (v < 1.0) { // 0.0 -> 1.0 = minDistance -> mid
				r = this.minDistance + (v*midRange);
			} else { // 1.0 -> 4.0 = mid -> maxDistance
				if (v > maxValid) v = maxValid;
				v = (v-1.0) / (maxValid-1.0);
				r = this.minDistance + midRange + (v*midRange);
			}

			// Update position
			this.x = this.pivotX + Math.sin(this.angle) * (r+this.minDistance);
			this.y = this.pivotY + Math.cos(this.angle) * (r+this.minDistance);

			// Pick classes
			var obsValBounds = [0.33, 0.66];

			// Remove previous classes
			this.element.removeClass("val-bd");
			this.element.removeClass("val-md");
			this.element.removeClass("val-gd");
			this.indicator.removeClass("val-bd");
			this.indicator.removeClass("val-md");
			this.indicator.removeClass("val-gd");

			// Append classes
			if (v < Config.values['good-average']) {
				this.element.addClass("val-bd");
				this.indicator.addClass("val-bd");
				this.diameter = 54;
			} else if (v < Config.values['average-bad']) {
				this.element.addClass("val-md");
				this.indicator.addClass("val-md");
				this.diameter = 50;
			} else {
				this.element.addClass("val-gd");
				this.indicator.addClass("val-gd");
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
		R.registerComponent( 'widget.observable.running', DefaultObservableWidget, 1 );

	}

);