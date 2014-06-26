define(

	// Dependencies
	["jquery", "core/registry","core/base/tuning_components" ], 

	/**
	 * This is the default tunable widget component for the base interface.
	 *
 	 * @exports base/components/tuning/tunable
	 */
	function(config, R, TC) {

		var DefaultTunableDrawer = function(hostDOM) {

			// Initialize widget
			TC.TunableWidget.call(this, hostDOM);

			// Prepare properties
			this.anchor = {x:0, y:0};
			this.width = 350;
			this.height = 250;
			this.side = 0;
			this.visible = false;

			// Prepare drawer
			this.element = $('<div class="drawer"></div>');
			hostDOM.append(this.element);

			// Prepare description component
			this.textContainer = $('<div class="document"></div>');
			this.element.append( this.textContainer );

		};

		// Subclass from TunableWidget
		DefaultTunableDrawer.prototype = Object.create( TC.TunableWidget.prototype );

		/**
		 * Set the anchor position
		 */
		DefaultTunableDrawer.prototype.setAnchor = function(x,y,side) {
			this.anchor.x = x;
			this.anchor.y = y;
			this.side = side || 0;
			this.update();
		}

		/**
		 * Set visibility
		 */
		DefaultTunableDrawer.prototype.setVisible = function(visible) {
			if (visible) {
				if (!this.visible) {
					this.element.addClass("visible");
					this.visible = true;
				}
			} else {
				if (this.visible) {
					this.element.removeClass("visible");
					this.visible = false;
				}
			}
		}

		/**
		 * Update the position of the element
		 */
		DefaultTunableDrawer.prototype.update = function() {
			if (this.side == 0) { // Left side
				this.element.removeClass("side-r");
				this.element.addClass("side-l");
				this.element.css({
					'left'   : this.anchor.x - this.width,
					'top'    : this.anchor.y - this.height/2,
					'width'  : this.width,
					'height' : this.height
				});
			} else { // Right side
				this.element.removeClass("side-l");
				this.element.addClass("side-r");
				this.element.css({
					'left'   : this.anchor.x,
					'top'    : this.anchor.y - this.height/2,
					'width'  : this.width,
					'height' : this.height
				})
			}
		}

		// Store tuning widget component on registry
		R.registerComponent( 'widget.tunable_drawer.default', DefaultTunableDrawer, 1 );

	}

);