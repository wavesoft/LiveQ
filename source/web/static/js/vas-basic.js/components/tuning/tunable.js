define(

	// Dependencies
	["jquery", "core/registry","core/base/tuning_components", "core/util/spinner" ], 

	/**
	 * This is the default tunable widget component for the base interface.
	 *
 	 * @exports base/components/tuning/tunable
	 */
	function(config, R, TC, Spinner) {

		var DefaultTunableWidget = function(hostDOM) {

			// Initialize widget
			TC.TunableWidget.call(this, hostDOM);

			// Tunable parameters
			this.height = 74;
			this.width = 100;

			// Prepare variables
			this.active = true;
			this.value = 0;
			this.mouseOver = false;
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
			this.inpValue = $('<input type="text" value="0.000"></input>');
			this.lblTitle = $('<div class="title">T</div>');
			this.centerDial.append(this.lblTitle);
			this.centerDial.append(this.inpValue);

			// Prepare spinner
			this.spinner = new Spinner({}, this.onUpdate);

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
		DefaultTunableWidget.prototype.onMetadataUpdate = function(meta) {
			this.meta = meta;

			// Update spinner with the new metadata 
			this.spinner = new Spinner({}, this.onUpdate);

			// Update labels
			this.lblTitle.text(meta['info']['short']);

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
		 * Local callback to update value
		 */
		DefaultTunableWidget.prototype.setValue = function(value) {
			var v = parseFloat(value);
		}

		/**
		 * Take appropriate actions to focus this element
		 */
		DefaultTunableWidget.prototype.handleFocus = function() {
			this.element.addClass("expanded");
			this.inpValue[0].select();

			clearTimeout(this._handleTimer);
			this._handleTimer = setTimeout((function() {
				this.trigger( "showDetails", this.meta );
			}).bind(this), 500);

		}

		/**
		 * Take appropriate actions to blur this element
		 */
		DefaultTunableWidget.prototype.handleBlur = function() {
			this.element.removeClass("expanded");
			this.inpValue[0].blur();

			clearTimeout(this._handleTimer);
			this._handleTimer = setTimeout((function() {
				this.trigger( "hideDetails" );
			}).bind(this), 100);
		}


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
				if (this.mouseOver)
					this.handleFocus();
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