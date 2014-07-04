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

		};

		// Subclass from Component
		DefaultPinScreen.prototype = Object.create( Component.prototype );

		////////////////////////////////////////////////////////////
		//           Implementation of the Component              //
		////////////////////////////////////////////////////////////

		DefaultPinScreen.prototype.onResize = function(width, height) {
			
		}

		// Store tuning widget component on registry
		R.registerComponent( 'screen.tuning.pin', DefaultPinScreen, 1 );

	}

);