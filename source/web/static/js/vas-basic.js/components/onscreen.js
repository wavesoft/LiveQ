define(

	// Dependencies
	["jquery", "core/registry","core/base/tuning_components" ], 

	/**
	 * This is the default tunable widget component for the base interface.
	 *
 	 * @exports base/components/tuning/tunable
	 */
	function(config, R, TC) {

		var DefaultOnScreen = function(hostDOM) {

			// Initialize widget
			TC.TunableWidget.call(this, hostDOM);

			// Prepare properties
			this.anchor = {x:0, y:0};
			this.width = 350;
			this.height = 250;
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

			this.element.mouseenter((function() {
				this.mouseOver = true;
			}).bind(this));
			this.element.mouseleave((function() {
				this.mouseOver = false;

				// Check for delayed hidding
				if (!this.visible)
					this.element.removeClass("visible");

			}).bind(this));

		};

		// Subclass from TunableWidget
		DefaultOnScreen.prototype = Object.create( TC.TunableWidget.prototype );

		/**
		 * Set the anchor position
		 */
		DefaultOnScreen.prototype.setAnchor = function(x,y,offset,side) {
			this.anchor.x = x;
			this.anchor.y = y;
			this.offset = offset || 50;

			// Calculate side
			if (side == undefined) {
				var parentContainer = this.hostDOM.parent(),
					pW = parentContainer.width(),
					pH = parentContainer.height();

				// Pick right side by default
				side = 0;

			} else {
				this.side = side;
			}

			this.update();
		}

		/**
		 * Define the body contents
		 */
		DefaultOnScreen.prototype.setBody = function(body) {
			this.textContainer.empty();
			this.textContainer.append(body);
		}

		/**
		 * Define the title
		 */
		DefaultOnScreen.prototype.setTitle = function(title) {
			this.titleElm.text(title);
		}

		/**
		 * Set visibility
		 */
		DefaultOnScreen.prototype.setVisible = function(visible) {
			if (visible) {
				if (!this.visible) {
					this.element.addClass("visible");
					this.visible = true;
				}
			} else {
				if (this.visible) {
					this.visible = false;
					// Don't hide if we have a mouse presence
					if (!this.mouseOver) 
						this.element.removeClass("visible");
				}

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
					'left'   : this.anchor.x - this.width - this.offset,
					'top'    : this.anchor.y - this.height/2,
					'width'  : this.width,
					'height' : this.height
				});
			} else { // Right side
				this.element.removeClass("left");
				this.element.addClass("right");
				this.element.css({
					'left'   : this.anchor.x + this.offset,
					'top'    : this.anchor.y - this.height/2,
					'width'  : this.width,
					'height' : this.height
				})
			}
		}

		// Store tuning widget component on registry
		R.registerComponent( 'widget.onscreen', DefaultOnScreen, 1 );

	}

);