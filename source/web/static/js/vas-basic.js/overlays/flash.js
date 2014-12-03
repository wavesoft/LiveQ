define(

	// Dependencies

	["jquery", "core/registry","core/base/component", "core/db" ], 

	/**
	 * This is the default component for displaying flash overlay messages
	 *
 	 * @exports vas-basic/overlay/flash
	 */
	function(config, R, Component, DB) {

		/**
		 * The default tunable body class
		 */
		var OverlayFlash = function(hostDOM) {

			// Initialize widget
			Component.call(this, hostDOM);

			// Prepare data
			this.flashDOM = $('<div class="flash-overlay"></div>').appendTo(hostDOM);
			this.domImg = $('<div class="image"></div>').appendTo(this.flashDOM);
			this.domTitle = $('<div class="title"></div>').appendTo(this.flashDOM);
			this.domBody = $('<div class="body"></div>').appendTo(this.flashDOM);
			
			// Click on close
			this.hostDOM.click((function() {
				this.trigger('close');
			}).bind(this));

		};

		// Subclass from ObservableWidget
		OverlayFlash.prototype = Object.create( Component.prototype );

		/**
		 * Reposition flashDOM on resize
		 */
		OverlayFlash.prototype.onMessageDefined = function( image, title, body ) {
			this.domImg.css("background-image", "url("+image+")");
			this.domTitle.html(title);
			this.domBody.html(body);
		}

		/**
		 * Reposition flashDOM on resize
		 */
		OverlayFlash.prototype.onResize = function(w,h) {
			this.width = w;
			this.height = h;

		}

		// Store overlay component on registry
		R.registerComponent( 'overlay.flash', OverlayFlash, 1 );

	}

);