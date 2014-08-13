define(

	// Dependencies
	["jquery", "core/ui", "core/registry", "core/base/component", "core/config" ], 

	/**
	 * This is the default observable widget component for the base interface.
	 *
 	 * @exports base/components/tuning/observable
	 */
	function(config, UI, R, Component, Config) {

		var DefaultPinScreen = function(hostDOM) {

			// Initialize widget
			Component.call(this, hostDOM);

			// Prepare the scroller view
			this.scrollerView = $('<div class="scroller"></div>');
			this.hostDOM.append( this.scrollerView );

			this.pinnedHistos = {};
			this.firstHistogram = true;

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
			this.firstHistogram = true;
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

			// Add first histogram to visual aids
			if (this.firstHistogram) {
				this.firstHistogram = false;
				R.registerVisualAid( 'tuning.firstpin', histoHost, {'screen': 'screen.tuning' } );				
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

		/**
		 * Display first-time aids
		 */
		DefaultPinScreen.prototype.onShown = function() {
			// Show first-time aids
			UI.showFirstTimeAid( "tuning.firstpin" );
		}

		// Store tuning widget component on registry
		R.registerComponent( 'screen.tuning.pin', DefaultPinScreen, 1 );

	}

);