define(

	// Dependencies
	["jquery", "dragdealer", "core/registry", "core/ui", "core/base/tuning_components", "core/util/spinner" ], 

	/**
	 * This is the default tunable widget component for the base interface.
	 *
 	 * @exports base/components/tuning/tunable
	 */
	function($, Dragdealer, R, UI, TC, Spinner) {

		var DefaultTunableWidget = function(hostDOM) {

			// Initialize widget
			TC.TunableWidget.call(this, hostDOM);

			// Prepare variables
			this.value = 0;
			this.meta = {};
			this.markers = [];

			// Prepare host element
			this.element = $('<div class="tunable"></div>');
			hostDOM.append(this.element);

			this.elmTitle = $('<div class="title"></div>');
			this.element.append( this.elmTitle );
			this.elmSlider = $('<div class="slider"></div>');
			this.element.append( this.elmSlider );
			this.elmMarkers = $('<div class="markers"></div>');
			this.element.append( this.elmMarkers );

			this.elmDragHost = $('<div class="draghost"></div>');
			this.elmSlider.append( this.elmDragHost );

			this.elmDragDealer = $('<div class="dragdealer"></div>');
			this.elmDragHost.append( this.elmDragDealer );
			this.elmDragHandle = $('<div class="handle">0.000</div>');
			this.elmDragDealer.append( this.elmDragHandle );

			this.elmDragArrow = $('<div class="arrow"></div>');
			this.elmDragHost.append( this.elmDragArrow );
			this.btnMinus = $('<a class="minus">-</div>');
			this.elmDragHost.append( this.btnMinus );
			this.btnPlus = $('<a class="plus">+</div>');
			this.elmDragHost.append( this.btnPlus );

			var a = [];
			for (var i=0; i<4; i++) {
				a.push(Math.random());
			}
			this.onMarkersUpdated(a);
			this.update();

			// Setup drag dealer after a delay
			this.dragdealer = null;

		};

		// Subclass from TunableWidget
		DefaultTunableWidget.prototype = Object.create( TC.TunableWidget.prototype );

		////////////////////////////////////////////////////////////
		//                    Helper Functions                    //
		////////////////////////////////////////////////////////////

		/**
		 * Handle a value update from the interface
		 */
		DefaultTunableWidget.prototype.handleValueChange = function(value) {
			// Store the normalized value
			this.value = value;
			this.update();
		}

		/**
		 * Render the value
		 */
		DefaultTunableWidget.prototype.renderValue = function() {
			var v = this.getValue(), dec;
			if (this.meta['value'] && (this.meta['value']['dec'] != undefined)) dec=this.meta['value']['dec'];
			return v.toFixed(dec);
		}

		/**
		 * Update the visual interface
		 */
		DefaultTunableWidget.prototype.update = function() {

			// Update text
			this.elmDragHandle.html( this.renderValue() );

			// Update arrow position
			var arrLeft = 20, arrW = 10,
				arrSpan = $(this.elmDragDealer).width() - arrW;
			this.elmDragArrow.css({
				'left': arrLeft + arrSpan * this.value
			});

			// Update marker positions
			for (var i=0; i<this.markers.length; i++) {
				this.markers[i].e.css({
					'left': arrLeft + arrSpan * this.value,
				});
				this.markers[i].eArrow.css({
					'border-bottom-color': '#0F0'
				});
				this.markers[i].eLabel.css({
					'color': '#0F0'
				});
			}

		}

		////////////////////////////////////////////////////////////
		//           Implementation of the TuningWidget           //
		////////////////////////////////////////////////////////////

		/**
		 * Update markers
		 */
		DefaultTunableWidget.prototype.onMarkersUpdated = function(markers) {
			this.elmMarkers.empty();
			this.markers = [ ];

			for (var i=0; i<markers.length; i++) {
				var eMarker = $('<div class="marker"></div>'),
					eArrow = $('<div class="arrow"></div>'),
					eLabel = $('<div class="label"></div>');

				eMarker.append(eArrow);
				eMarker.append(eLabel);
				eLabel.text(i+1);

				this.markers.push({
					'e': eMarker,
					'eArrow': eArrow,
					'eLabel': eLabel,
					'v': markers[i]
				});
			}
		}

		/**
		 * Update tuning widget metadata
		 */
		DefaultTunableWidget.prototype.onMetaUpdate = function(meta) {
			this.meta = meta;
		}

		/**
		 * Update tuning widget value
		 */
		DefaultTunableWidget.prototype.onUpdate = function(value) {

		}

		/**
		 * This event is fired when the view is scrolled/resized and it
		 * specifies the height coordinates of the bottom side of the screen.
		 */
		DefaultTunableWidget.prototype.onResize = function(width, height) {
			this.width = width;
			this.height = height;
		}

		/**
		 * Return the tuning widget value
		 */
		DefaultTunableWidget.prototype.getValue = function( getStr ) {
			if (!this.meta['value']) return this.value;
			var vInt = this.meta['value']['min'] + (this.meta['value']['max'] - this.meta['value']['min']) * this.value;
			return parseFloat( vInt.toFixed(this.meta['value']['dec'] || 2) )
		}

		/**
		 * HAndle the onShow event
		 */
		DefaultTunableWidget.prototype.onShown = function() {

			//
			// Bugfix: DragDealer works only if the DOM is displayed
			//         We therefore initialize it only after we are
			//         visible.
			//

			if (this.dragdealer != null) return;
			this.dragdealer = new Dragdealer( this.elmDragDealer[0], {
				horizontal : true,
				vertical   : false,
				slide      : false,
				requestAnimationFrame : true,

				// Handle value change
				animationCallback: (function(x,y) {
					this.handleValueChange(x);
				}).bind(this)

			});			
		}

		// Store tuning widget component on registry
		R.registerComponent( 'widget.tunable.tuning', DefaultTunableWidget, 1 );

	}

);