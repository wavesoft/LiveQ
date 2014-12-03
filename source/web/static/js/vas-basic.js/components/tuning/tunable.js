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
			this.lastMarkerInfo = {};
			this.idleTimer = 0;

			// Delay-initialized components
			this.spinner = null;
			this.dragdealer = null;

			// Prepare DOM elements
			this.elmTitle = $('<div class="title"></div>');
			this.hostDOM.append( this.elmTitle );
			this.elmSlider = $('<div class="slider"></div>');
			this.hostDOM.append( this.elmSlider );
			this.elmMarkers = $('<div class="markers"></div>');
			this.hostDOM.append( this.elmMarkers );

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

			// Setup drag dealer after a delay
			this.dragdealer = null;

			// Pop-up description of the element on hover
			var hoverTimer = 0;
			this.elmTitle.mouseenter((function() {
				clearTimeout(hoverTimer);
				hoverTimer = setTimeout((function() {

					// Show pop-up
					UI.showPopup( 
						"widget.onscreen", 
						this.hostDOM,
						(function(hostDOM) {

							// Prepare the body
							var comBody = R.instanceComponent("infoblock.tunable", hostDOM);
							if (comBody) {

								// Update infoblock 
								comBody.onMetaUpdate( this.meta );
								comBody.onUpdate( this.getValue() );

								// Adopt events from infoblock as ours
								this.adoptEvents( comBody );

							} else {
								console.warn("Could not instantiate tunable infoblock!");
							}

						}).bind(this),
						{ 
							'offset': $(this.hostDOM).width()/2+20,
							'title' : this.meta['info']['name']
						}
					);

				}).bind(this), 250);
			}).bind(this));
			this.hostDOM.mouseleave((function() {
				clearTimeout(hoverTimer);
				hoverTimer = setTimeout((function() {
					UI.hidePopup();
				}).bind(this), 100);
			}).bind(this));

			// Create the default 4 blank markers
			this.updateMarkers([null, null, null, null]);


		};

		// Subclass from TunableWidget
		DefaultTunableWidget.prototype = Object.create( TC.TunableWidget.prototype );

		////////////////////////////////////////////////////////////
		//                    Helper Functions                    //
		////////////////////////////////////////////////////////////

		/**
		 * Handle a value update from the interface
		 */
		DefaultTunableWidget.prototype.handleValueChange = function(value, source) {
			// Store the normalized value
			this.value = value;
			this.update();

			// Update spinner
			if (source == 1) { // Event source is dragDealer -> Update spinner
				if (this.spinner)
					this.spinner.value = this.getValue();
			} else if (source == 2) { // Event source is spinner -> Update dragDealer
				if (this.dragdealer)
					this.dragdealer.setValue(this.value,0,true);
			}

			// Use idle timer before forwarding value change event
			clearTimeout(this.idleTimer);
			this.idleTimer = setTimeout( (function() {
				this.trigger('valueChanged', this.getValue());
			}).bind(this), 250);

		}

		/**
		 * Render the value
		 */
		DefaultTunableWidget.prototype.renderValue = function() {
			var v = this.getValue(), dec=0;
			if (this.meta['value'] && (this.meta['value']['dec'] != undefined)) dec=this.meta['value']['dec'];
			return v.toFixed(dec);
		}

		/**
		 * Return the tuning widget value
		 * (Convert normalized this.value to mapped value)
		 */
		DefaultTunableWidget.prototype.getValue = function() {
			if (!this.meta['value']) return this.value;
			var vInt = this.meta['value']['min'] + (this.meta['value']['max'] - this.meta['value']['min']) * this.value;
			return parseFloat( vInt.toFixed(this.meta['value']['dec'] || 2) )
		}

		/**
		 * Convert mapped value (between metadata[min] till metadata[max]) to normalized this.value
		 */
		DefaultTunableWidget.prototype.unmapValue = function( value ) {
			if ((value == undefined) || (value == null)) return value;
			if (!this.meta['value']) return this.value = value;
			return (value - this.meta['value']['min']) / (this.meta['value']['max'] - this.meta['value']['min']);
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
				
				// Hide/show marker
				if (!this.markers[i].v) {
					this.markers[i].e.hide();
				} else {
					this.markers[i].e.show();
				}

				// Update marker info
				this.markers[i].e.css({
					'left': arrSpan * this.markers[i].v,
				});
				this.markers[i].eArrow.css({
					'border-bottom-color': '#3498db'
				});
				this.markers[i].eLabel.css({
					'color': '#3498db'
				});
			}

		}

		/**
		 * Update markers
		 */
		DefaultTunableWidget.prototype.updateMarkers = function(markers) {
			this.elmMarkers.empty();
			this.markers = [ ];
			for (i in markers) {
				if (typeof(markers[i] != 'number')) continue;

				// Get marker info
				var v = markers[i];

				// Prepare DOM Elements
				var eMarker = $('<div class="marker"></div>'),
					eArrow = $('<div class="arrow"></div>'),
					eLabel = $('<div class="label"></div>');
				eMarker.append(eArrow);
				eMarker.append(eLabel);
				this.elmMarkers.append(eMarker);

				// Populate
				eLabel.text(i);
				eMarker.click( (function(index){
					return function(e) {
						e.preventDefault();
						e.stopPropagation();
						this.dragdealer.setValue( this.markers[index].v, 0 );
					};
				})(this.markers.length).bind(this));

				// Store on markers array
				this.markers.push({
					'e': eMarker,
					'eArrow': eArrow,
					'eLabel': eLabel,
					'v': v
				});

				// If 0 or null, hide
				if (!v) {
					eMarker.hide();
				}

			}

			// Realign markers
			this.update();

		}

		////////////////////////////////////////////////////////////
		//           Implementation of the TuningWidget           //
		////////////////////////////////////////////////////////////

		/**
		 * Update saved slot value
		 */
		DefaultTunableWidget.prototype.onMarkersDefined = function( markers ) {
			// Update markers 
			this.updateMarkers(markers);
		}

		/**
		 * Update tuning widget value
		 */
		DefaultTunableWidget.prototype.onUpdate = function(value) {
			this.value = this.unmapValue( value );

			if (this.dragdealer == null) return;
			this.dragdealer.setValue( this.value, 0 );
		}

		/**
		 * Update tuning widget metadata
		 */
		DefaultTunableWidget.prototype.onMetaUpdate = function(meta) {
			this.meta = meta;

			// Update label
			this.elmTitle.text(meta['info']['short']);

			// Prepare spinner
			if (this.spinner) return;
			this.spinner = new Spinner(this.meta['value'], (function(v) {

				// Spinner works in mapped values, while we internaly
				// work with normalized values. Therefore we trigger handleValueChange
				// passing the normalized value of the spinner value.
				this.handleValueChange( this.unmapValue(v), 2 );

			}).bind(this));

			// Bind button events to the spinner
			this.btnPlus.mousedown((function(e) {
				e.preventDefault();
				e.stopPropagation();
				this.spinner.start(1);
			}).bind(this));
			this.btnPlus.mouseup((function(e) {
				e.preventDefault();
				e.stopPropagation();
				this.spinner.stop();
			}).bind(this));
			this.btnMinus.mousedown((function(e) {
				e.preventDefault();
				e.stopPropagation();
				this.spinner.start(-1);
			}).bind(this));
			this.btnMinus.mouseup((function(e) {
				e.preventDefault();
				e.stopPropagation();
				this.spinner.stop();
			}).bind(this));

		}

		/**
		 * This event is fired when the view is scrolled/resized and it
		 * specifies the height coordinates of the bottom side of the screen.
		 */
		DefaultTunableWidget.prototype.onResize = function(width, height) {
			this.width = width;
			this.height = height;
			this.update();
		}

		/**
		 * HAndle the onWillShow event
		 */
		DefaultTunableWidget.prototype.onWillShow = function(ready) {
			setTimeout(this.update.bind(this), 100);
			ready();
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
				x 		   : this.value,

				// Handle value change
				animationCallback: (function(x,y) {
					this.handleValueChange(x, 1);
				}).bind(this)

			});			
		}

		// Store tuning widget component on registry
		R.registerComponent( 'widget.tunable.tuning', DefaultTunableWidget, 1 );

	}

);