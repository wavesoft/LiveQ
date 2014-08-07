define(

	// Dependencies
	["jquery", "core/registry","core/base/components" ], 

	/**
	 * This is the default onscreen pop-up component for the tunables and
	 * observables.
	 *
 	 * @exports vas-basic/components/onscreen
	 */
	function(config, R, Components) {

		var DefaultOnScreen = function(hostDOM) {

			// Initialize widget
			Components.Popup.call(this, hostDOM);

			// Prepare properties
			this.anchor = {x:0, y:0};
			this.offsetX = 0;
			this.offsetY = 0;
			this.fixedWidth = 350;
			this.fixedHeight = 250;
			this.side = 0;
			this.visible = false;
			this.mouseOver = false;

			// Prepare onscreen pop-up element
			this.element = $('<div class="onscreen"></div>');
			hostDOM.append(this.element);

			this.bulletElm = $('<div class="bullet"></div>');
			this.titleElm = $('<div class="title">Details on the parameter</div>');
			this.element.append(this.bulletElm);
			this.element.append(this.titleElm);

			// Prepare description component
			this.textContainer = $('<div class="document"></div>');
			this.element.append( this.textContainer );

			this.textContainer.append($("<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis ullamcorper est at massa euismod sodales. In tincidunt mauris posuere, ornare sem ac, molestie diam. Maecenas ultrices ultricies purus, vel adipiscing leo ultrices vitae. Maecenas vestibulum, augue fermentum tincidunt tempus, diam libero cursus sem, ac vestibulum dui odio ut risus. Proin mi turpis, posuere et tristique pellentesque, condimentum sed lacus. Nulla at purus id leo vehicula mattis. Duis rhoncus mi at est lobortis hendrerit. Donec commodo accumsan mi a sodales. Vivamus cursus semper interdum.</p>"));
			this.textContainer.append($("<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis ullamcorper est at massa euismod sodales. In tincidunt mauris posuere, ornare sem ac, molestie diam. Maecenas ultrices ultricies purus, vel adipiscing leo ultrices vitae. Maecenas vestibulum, augue fermentum tincidunt tempus, diam libero cursus sem, ac vestibulum dui odio ut risus. Proin mi turpis, posuere et tristique pellentesque, condimentum sed lacus. Nulla at purus id leo vehicula mattis. Duis rhoncus mi at est lobortis hendrerit. Donec commodo accumsan mi a sodales. Vivamus cursus semper interdum.</p>"));

			// Update cursor presence
			this.mouseOutCallback = false;
			this.element.mouseenter((function() {
				this.mouseOver = true;
			}).bind(this));
			this.element.mouseleave((function() {
				this.mouseOver = false;

				// Check for delayed hidding
				if (!this.visible) {

					// Delay-hide
					this.element.removeClass("visible");

					// Fire the mouse out callback to complete the .onWillHide event
					if (this.mouseOutCallback)
						this.mouseOutCallback();

				}

			}).bind(this));

		};

		// Subclass from Components.Popup
		DefaultOnScreen.prototype = Object.create( Components.Popup.prototype );

		/**
		 * Update popup anchor
		 */
		DefaultOnScreen.prototype.onAnchorUpdate = function(x, y) {
			this.anchor.x = x;
			this.anchor.y = y;

			// Calculate side
			this.side = 1; // Default right side
			if (this.anchor.x + this.offsetX + this.fixedWidth > this.width) {
				this.side = 0; // Go to left side if overflow on right
			}

			// Check for overflows
			if (this.anchor.y - this.offsetY - this.fixedHeight/2 < 0) 
				this.anchor.y = this.fixedHeight/2 - this.offsetY;
			if (this.anchor.y + this.offsetY + this.fixedHeight/2 > this.height)
				this.anchor.y = this.height - this.fixedHeight/2 - this.offsetY;

			// Update position
			this.update();
		}

		/**
		 * Update popup information
		 */
		DefaultOnScreen.prototype.onPopupConfig = function(cfg, bodyFn) {
			// Create body contents using the body function
			if (bodyFn) {
				this.textContainer.empty();
				bodyFn( this.textContainer );
			}
			// Create title using title configuration
			if (cfg['title']) {
				this.titleElm.html(cfg['title']);
			}
			// Update offset using offset configuration
			if (cfg['offset']) this.offsetX = cfg['offset'];
			if (cfg['offset-x']) this.offsetX = cfg['offset-x'];
			if (cfg['offset-y']) this.offsetY = cfg['offset-y'];
			// Update color
			if (cfg['color']) {
				this.bulletElm.css('background-color', cfg['color']);
			}
		}

		/**
		 * Set visibility
		 */
		DefaultOnScreen.prototype.onWillShow = function(cb) {
			if (!this.visible) {
				this.element.addClass("visible");
				this.visible = true;
			}
			cb();
		}

		/**
		 * We are about to be hidden
		 */
		DefaultOnScreen.prototype.onWillHide = function(cb) {
			if (this.visible) {
				this.visible = false;
				// Don't hide if we have a mouse presence
				if (!this.mouseOver) {
					this.element.removeClass("visible");
					cb();
				} else {
					this.mouseOutCallback = cb;
				}
			} else {
				cb();
			}
		}

		/**
		 * Update the position of the element
		 */
		DefaultOnScreen.prototype.update = function() {
			if (this.side == 0) { // Left side
				this.element.removeClass("right");
				this.element.addClass("left");
				this.element.css({
					'left'   : this.anchor.x - this.fixedWidth - this.offsetX,
					'top'    : this.anchor.y - this.fixedHeight/2 + this.offsetY,
					'width'  : this.fixedWidth,
					'height' : this.fixedHeight
				});
			} else { // Right side
				this.element.removeClass("left");
				this.element.addClass("right");
				this.element.css({
					'left'   : this.anchor.x + this.offsetX,
					'top'    : this.anchor.y - this.fixedHeight/2 + this.offsetY,
					'width'  : this.fixedWidth,
					'height' : this.fixedHeight
				})
			}
		}

		// Store tuning widget component on registry
		R.registerComponent( 'widget.onscreen', DefaultOnScreen, 1 );

	}

);