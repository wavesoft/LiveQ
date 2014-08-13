

define(

	/**
	 * Dependencies
	 */
	["jquery", "core/config", "core/registry", "core/base/components", "core/db", "core/ui", "core/user", "liveq/core",

	 // Self-registering dependencies
	 "jquery-knob"], 

	/**
	 * Basic version of the home screen
	 *
	 * @exports vas-basic/components/tuning_screen
	 */
	function($, config, R, C, DB, UI, User, LiveQCore) {

		/**
		 * Tuning dashboard screen
		 */
		var ResultsScreen = function(hostDOM) {
			C.ResultsScreen.call(this, hostDOM);

			// Prepare properties
			this.host = hostDOM;
			this.width = 0;
			this.height = 0;

			// Prepare host
			hostDOM.addClass("results");

			// Create a slpash backdrop
			this.backdropDOM = $('<div class="'+config.css['backdrop']+'"></div>');
			hostDOM.append(this.backdropDOM);
			this.backdrop = R.instanceComponent("backdrop.results", this.backdropDOM);
			this.forwardVisualEvents( this.backdrop );

			// Create foreground
			this.foregroundDOM = $('<div class="'+config.css['foreground']+'"></div>');
			hostDOM.append(this.foregroundDOM);

			// Preapre elements
			this.resultsHost = $('<div class="results-host"></div>').appendTo(this.foregroundDOM);

		}
		ResultsScreen.prototype = Object.create( C.ResultsScreen.prototype );

		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		////                            HOOK HANDLERS                              ////
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////

		/**
		 * Setup screen
		 */
		ResultsScreen.prototype.setScreen = function() {

		}

		// Register screen component on the registry
		R.registerComponent( 'screen.results', ResultsScreen, 1 );

	}

);