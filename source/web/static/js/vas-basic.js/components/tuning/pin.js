define(

	// Dependencies
	["jquery", "core/registry", "core/base/component", "core/config" ], 

	/**
	 * This is the default observable widget component for the base interface.
	 *
 	 * @exports base/components/tuning/observable
	 */
	function(config, R, Component, Config) {

		var DefaultPinScreen = function(hostDOM) {

			// Initialize widget
			Component.call(this, hostDOM);

			// Prepare the scroller view
			this.scrollerView = $('<div class="scroller"></div>');
			this.hostDOM.append( this.scrollerView );

			this.pinnedHistos = {};

		};

		// Subclass from Component
		DefaultPinScreen.prototype = Object.create( Component.prototype );

		////////////////////////////////////////////////////////////
		//           Implementation of the Component              //
		////////////////////////////////////////////////////////////

		/**
		 * Unpin all histograms
		 */
		DefaultPinScreen.prototype.onUnpinAll = function() {
			this.pinnedHistos = {};
			this.scrollerView.empty();
		}

		/**
		 * Pin histogram in the pin bar
		 */
		DefaultPinScreen.prototype.onHistogramPin = function( id, metadata ) {

			// Do this only once
			if (this.pinnedHistos[id]) return;

			// Create component and host
			var histoHost = $('<div class="histogram"></div>').appendTo(this.scrollerView),
				histoCom = R.instanceComponent("screen.tuning.pin_widget", histoHost);

			// Validate
			if (!histoCom) {
				console.error("[PinScreen] Unable to instance component 'screen.tuning.pin_widget' required for showing the pinned histogram");
				histoHost.remove();
				return;
			}

			// Register
			this.forwardVisualEvents( histoCom );
			this.pinnedHistos[id] = histoCom;

			// Add dismiss listener
			histoCom.on('close', (function() {
				histoCom.onWillHide((function() {
					
					// Trigger hidden
					histoCom.onHidden();
					
					// Remove
					histoHost.remove();
					delete this.pinnedHistos[id];

				}).bind(this));
			}).bind(this));

			// Update metadata
			this.pinnedHistos[id].onMetaUpdate( metadata );

		}	

		/**
		 * Update the histogram values by their ID
		 */
		DefaultPinScreen.prototype.onHistogramUpdate = function( id, histoRef ) {
			if (!this.pinnedHistos[id]) return;
			this.pinnedHistos[id].onUpdate( histoRef );
		}

		// Store tuning widget component on registry
		R.registerComponent( 'screen.tuning.pin', DefaultPinScreen, 1 );

	}

);