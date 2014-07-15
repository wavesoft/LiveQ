define(

	// Dependencies
	["jquery", "core/registry", "core/ui", "core/base/tuning_components", "core/util/spinner" ], 

	/**
	 * This is the default tunable widget component for the base interface.
	 *
 	 * @exports base/components/tuning/tunable
	 */
	function(config, R, UI, TC, Spinner) {

		var DefaultTunableWidget = function(hostDOM) {

			// Initialize widget
			TC.TunableWidget.call(this, hostDOM);

			// Tunable parameters
			this.fixedHeight = 74;
			this.fixedWidth = 100;

			// Prepare variables
			this.active = true;
			this.value = 0;
			this.mouseOver = false;
			this.focused = false;
			this.pivotX = 0;
			this.pivotY = 0;

			// Local properties
			this._triggerTimer = 0;
			this._handleTimer = 0;

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
			this.inpValue = $('<input type="text" />');
			this.lblTitle = $('<div class="title">T</div>');
			this.centerDial.append(this.lblTitle);
			this.centerDial.append(this.inpValue);

			// Prepare spinner
			this.spinner = new Spinner({}, this.handleValueUpdate.bind(this));

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
			this.leftWing.mousedown((function() {
				this.spinner.start(-1);
			}).bind(this));
			this.rightWing.mousedown((function() {
				this.spinner.start(1);
			}).bind(this));
			this.hostDOM.mouseup((function() {
				this.spinner.stop();
			}).bind(this));

		};

		// Subclass from TunableWidget
		DefaultTunableWidget.prototype = Object.create( TC.TunableWidget.prototype );

		////////////////////////////////////////////////////////////
		//           Implementation of the TuningWidget           //
		////////////////////////////////////////////////////////////

		/**
		 * Update tuning widget metadata
		 */
		DefaultTunableWidget.prototype.onMetaUpdate = function(meta) {
			this.meta = meta;

			// Update spinner with the new metadata 
			this.spinner = new Spinner(meta['value'] || {}, 
								this.handleValueUpdate.bind(this));

			// Update labels
			this.lblTitle.text(meta['info']['short']);

		}

		/**
		 * Update tuning widget value
		 */
		DefaultTunableWidget.prototype.onUpdate = function(value) {

			// Parse specified value wrapped on the decimals specified
			var decimals = 2;
			if (this.meta && this.meta['value'])
				decimals = this.meta['value']['decimals'] || 2;
			this.value = ( parseFloat( Number(value).toFixed(decimals) ) ) || 0;

			// Update spinner & UI
			this.spinner.value = this.value;
			this.update();

		}

		////////////////////////////////////////////////////////////
		//            Implementation-specific functions           //
		////////////////////////////////////////////////////////////

		/**
		 * Handle a value update
		 */
		DefaultTunableWidget.prototype.handleValueUpdate = function(value) {

			// Update UI
			this.onUpdate(value);

			// Throttle value change event
			clearTimeout(this._triggerTimer || 0);
			this._triggerTimer = setTimeout((function() {
				this.trigger( 'valueChanged', this.value );
				console.log("Value changed: ",this.value);
			}).bind(this), 250);


		}

		/**
		 * Take appropriate actions to focus this element
		 */
		DefaultTunableWidget.prototype.handleFocus = function() {
			this.element.addClass("expanded");
			this.inpValue[0].select();

			clearTimeout(this._handleTimer);
			this._handleTimer = setTimeout((function() {

				// Prepare the body
				var comBodyHost = $('<div></div>'),
					comBody = R.instanceComponent("infoblock.tunable", comBodyHost);
				if (comBody) {

					// Update infoblock 
					comBody.onMetaUpdate( this.meta );
					comBody.onUpdate( this.getValue() );

					// Adopt events from infoblock as ours
					this.adoptEvents( comBody );

				} else {
					console.warn("Could not instantiate tunable infoblock!");
				}

				UI.showPopup( 
					"widget.onscreen", 
					this.x, this.y,
					{ 
						'offset': 100,
						'title' : this.meta['info']['name'],
						'body'  : comBodyHost
					}
				);

			}).bind(this), 500);

			// Keep the value we wad when we were focuse
			this.focusValue = this.value;
			this.focused = true;

		}

		/**
		 * Take appropriate actions to blur this element
		 */
		DefaultTunableWidget.prototype.handleBlur = function() {
			this.element.removeClass("expanded");
			this.inpValue[0].blur();

			clearTimeout(this._handleTimer);
			this._handleTimer = setTimeout((function() {

				UI.hidePopup();

			}).bind(this), 100);

			// Update the value if we were active and focused
			if (this.focused) {				

				// Try to parse the value
				try {

					// Try to parse the new value
					var newVal = parseFloat( this.inpValue.val() );
					if (isNaN(newVal)) {
						this.update();
					} else {

						// Get value metadata
						var valueMeta = this.meta['value'] || {},
							valMin = valueMeta['min'] || 0,
							valMax = valueMeta['max'] || 1;

						// Wrap value
						if (newVal < valMin)
							newVal = valMin;
						if (newVal > valMax)
							newVal = valMax;

						// Trigger update
						if (newVal != this.focusValue)
							this.handleValueUpdate(newVal);
						else
							this.update();

					}

				} catch (e) {
					this.update();
				}

			}
			this.focused = false;

		}

		/**
		 * This event is fired when the view is scrolled/resized and it
		 * specifies the height coordinates of the bottom side of the screen.
		 */
		DefaultTunableWidget.prototype.onResize = function(width, height) {
			this.width = width;
			this.height = height;

			this.pivotX = width/2 + this.left;
			this.pivotY = height/2 + this.top;

			this.update();
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
				if (this.mouseOver)
					this.handleFocus();
			} else {
				this.element.addClass("inactive");
			}
		}

		/**
		 * Set the pivot point for the rotation angle
		 */
		DefaultTunableWidget.prototype.setRadialConfig = function(minD,maxD,angle) {
			if (minD !== undefined) this.minDistance = minD;
			if (maxD !== undefined) this.maxDistance = maxD;
			if (angle !== undefined) this.angle = angle || 0;
			this.update();
		}


		/**
		 * Update the visual representation of the element
		 */
		DefaultTunableWidget.prototype.update = function() {

			// Get number of dcimals for formatting
			var decimals = 2;
			if (this.meta && this.meta['value'])
				decimals = this.meta['value']['decimals'] || 2;

			// Calculate position around pivot
			var v = this.getValue(),
				r = ( 1.0 * ( this.maxDistance - this.minDistance ) ) + this.minDistance;
			this.inpValue.val( v.toFixed(decimals) );

			// Update position
			this.x = this.pivotX + Math.sin(this.angle) * r;
			this.y = this.pivotY + Math.cos(this.angle) * r;

			// Update position
			this.element.css({
				'left': this.x - this.fixedWidth/2,
				'top' : this.y - this.fixedHeight/2
			});

		}

		// Store tuning widget component on registry
		R.registerComponent( 'widget.tunable.tuning', DefaultTunableWidget, 1 );

	}

);