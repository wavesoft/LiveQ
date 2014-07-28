
define(

	// Requirements
	["jquery", "d3", "core/ui", "core/config", "core/registry", "core/base/components"],

	/**
	 * Basic version of the home screen
	 *
	 * @exports basic/components/explain_screen
	 */
	function($, d3, UI, config, R,C) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var ExplainScreen = function( hostDOM ) {
			C.ExplainScreen.call(this, hostDOM);

			// Prepare host
			hostDOM.addClass("explain");

			// Create a slpash backdrop
			this.backdropDOM = $('<div class="'+config.css['backdrop']+'"></div>');
			hostDOM.append(this.backdropDOM);
			this.backdrop = R.instanceComponent("backdrop.explain", this.backdropDOM);

			// Create foreground
			this.foregroundDOM = $('<div class="'+config.css['foreground']+'"></div>');
			hostDOM.append(this.foregroundDOM);

		}
		ExplainScreen.prototype = Object.create( C.ExplainScreen.prototype );

		/**
		 * Forward ExplainScreen events to our child components
		 */
		ExplainScreen.prototype.onResize = function(w,h) {
			this.width = w;
			this.height = h;

		}

		/**
		 * Pause fore before exiting
		 */
		ExplainScreen.prototype.onHidden = function() {
		}

		/**
		 * Update level status 
		 */
		ExplainScreen.prototype.onWillShow = function(cb) {
			cb();
		}


		// Register home screen
		R.registerComponent( "screen.explain", ExplainScreen, 1 );

	}

);