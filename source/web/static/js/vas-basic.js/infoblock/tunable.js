define(

	// Dependencies
	["jquery", "core/registry","core/base/component" ], 

	/**
	 * This is the default component for displaying information regarding a tunable
	 *
 	 * @exports vas-basic/infoblock/tunable
	 */
	function(config, R, Component) {

		/**
		 * The default tunable body class
		 */
		var TunableBody = function(hostDOM) {

			// Initialize widget
			Component.call(this, hostDOM);

			// Prepare infoblock
			

		};

		// Subclass from ObservableWidget
		TunableBody.prototype = Object.create( Component.prototype );

		/**
		 * Set the widget which is hosting the tunable parameter information
		 * @param {core/base/tuning_components~TunableWidget} widget - The tunable widget to display additional information for
		 */
		TunableBody.prototype.setWidget = function( widget ) {
			this.hostDOM.empty();
			this.hostDOM.append($('<p>'+"Information regarding "+JSON.stringify(widget.meta)+'</p>'));
		}

		// Store tunable infoblock component on registry
		R.registerComponent( 'infoblock.tunable', TunableBody, 1 );

	}

);