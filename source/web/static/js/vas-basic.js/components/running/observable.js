define(

	// Dependencies
	["jquery", "core/registry", "core/ui", "core/base/tuning_components", "core/config", "core/util/math", "liveq/Calculate" ], 

	/**
	 * This is the default observable widget component for the base interface.
	 *
 	 * @exports base/components/tuning/observable
	 */
	function(config, R, UI, TC, Config, CMath, LiveQCalc) {

		var DefaultRunningObservableWidget = function(hostDOM) {

			// Initialize widget
			TC.ObservableWidget.call(this, hostDOM);

			// Keep position for updating
			this.x = 0;
			this.y = 0;
			this.active = true;
			this.diameter = 45;
			this.mouseOver= false;
			this._handleTimer = 0;
			this.value = null;

			// Prepare host element
			this.element = $('<div class="grey"></div>');
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
		DefaultRunningObservableWidget.prototype = Object.create( TC.ObservableWidget.prototype );

		////////////////////////////////////////////////////////////
		//         Implementation of the ObservableWidget         //
		////////////////////////////////////////////////////////////

		/**
		 * Update tuning widget metadata
		 */
		DefaultRunningObservableWidget.prototype.onMetaUpdate = function(meta) {
			this.meta = meta;
			this.element.text(meta['info']['short']);
		}

		/**
		 * Update tuning widget value
		 */
		DefaultRunningObservableWidget.prototype.onUpdate = function(value) {
			if (value == undefined) { // Reset
				this.value = null;
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
		DefaultRunningObservableWidget.prototype.handleFocus = function() {
			clearTimeout(this._handleTimer);
			this._handleTimer = setTimeout((function() {
				
				UI.showPopup( 
					"widget.onscreen", 
					this.x, this.y,
					(function(hostDOM) {

						// Prepare the body
						var comBody = R.instanceComponent("infoblock.observable", hostDOM);
						if (comBody) {

							// Update infoblock 
							comBody.onMetaUpdate( this.meta );
							comBody.onUpdate( this.value );

							// Adopt events from infoblock as ours
							this.adoptEvents( comBody );

						} else {
							console.warn("Could not instantiate observable infoblock!");
						}

					}).bind(this),
					{ 
						'offset': 50,
						'title' : this.meta['info']['name']
					}
				);				

			}).bind(this), 250);

		}

		/**
		 * Take appropriate actions to blur this element
		 */
		DefaultRunningObservableWidget.prototype.handleBlur = function() {
			clearTimeout(this._handleTimer);
			this._handleTimer = setTimeout((function() {

				UI.hidePopup();

			}).bind(this), 100);
		}

		/**
		 * Activate/deactivate tunable
		 */
		DefaultRunningObservableWidget.prototype.setActive = function(active) {
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
		DefaultRunningObservableWidget.prototype.getValue = function() {

			// If we don't have yet histograms, return maximum chi-squared
			if (!this.value) return 0;

			// Get the ratio histogram
			var ratioHisto = LiveQCalc.calculateRatioHistogram( this.value.data, this.value.ref.data );

			// Calculate bin ratio
			var avg = 0;
			for (var i=0; i<ratioHisto.values.length; i++) { avg += ratioHisto.values[i][0]; };
			avg /= ratioHisto.values.length;

			// Wrap to bounds
			if (avg < 0.5) avg=0.5;
			if (avg > 1.5) avg=1.5;

			// Change bounds
			return avg - 0.5;

		}

		/**
		 * This event is fired when the view is scrolled/resized and it
		 * specifies the height coordinates of the bottom side of the screen.
		 */
		DefaultRunningObservableWidget.prototype.onHorizonTopChanged = function(bottom) {
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
		 * Update the configuration regarding the radial arrangement of the observable
		 */
		DefaultRunningObservableWidget.prototype.setRadialConfig = function(minD,maxD,angle) {
			if (minD !== undefined) this.minDistance = minD;
			if (maxD !== undefined) this.maxDistance = maxD;
			if (angle !== undefined) this.angle = angle || 0;
			this.update();
		}

		/**
		 * This event is fired when the view is scrolled/resized and it
		 * specifies the height coordinates of the bottom side of the screen.
		 */
		DefaultRunningObservableWidget.prototype.onResize = function(width, height) {
			this.width = width;
			this.height = height;

			// Calculate pivot point
			this.pivotX = width/2 + this.left;
			this.pivotY = height/2 + this.top;

			// 

			this.update();
		}

		/**
		 * Update the visual representation of the element
		 */
		DefaultRunningObservableWidget.prototype.update = function() {

			// Calculate position around pivot
			var v = this.getValue(),
				r = CMath.mapChiSq(v, this.minDistance, this.maxDistance);

			// Update position
			this.x = this.pivotX + Math.sin(this.angle) * r;
			this.y = this.pivotY + Math.cos(this.angle) * r;

			// Pick classes
			if ((v>=0.49) && (v<=0.51)) {
				this.element.removeClass('grey');
				this.element.addClass('green');
			} else {
				this.element.removeClass('green');
				this.element.addClass('grey');
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
		R.registerComponent( 'widget.observable.running', DefaultRunningObservableWidget, 1 );

	}

);