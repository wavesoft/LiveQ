
define(

	// Requirements
	["core/config", "core/registry", "core/components"],

	/**
	 * Basic version of the home screen
	 *
	 * @exports basic/components/running_screen
	 */
	function(config,R,C) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var ProgressScreen = function( hostDOM ) {
			C.ProgressScreen.call(this, hostDOM);

			// Prepare host
			hostDOM.addClass("progress");

			// Create a slpash backdrop
			this.backdropDOM = $('<div class="'+config.css['backdrop']+'"></div>');
			hostDOM.append(this.backdropDOM);
			this.backdrop = R.instanceComponent("backdrop.progress", this.backdropDOM);

			// Create foreground DOM
			this.foregroundDOM = $('<div class="'+config.css['foreground']+'"></div>');
			hostDOM.append(this.foregroundDOM);

			// Create progress bar element
			this.elmBar = $('<div class="bar"></div>');
			this.elmBarValue = $('<div class="bar-value"></div>');
			this.elmBar.append(this.elmBarValue);
			this.foregroundDOM.append(this.elmBar);

			// Create text bar
			this.elmStatus = $('<div class="bar-status"></div>');
			this.elmProgress = $('<div class="bar-progress"></div>');
			this.foregroundDOM.append(this.elmStatus);
			this.foregroundDOM.append(this.elmProgress);

			// Create logo
			this.elmLogo = $('<div class="logo"></div>');
			this.foregroundDOM.append(this.elmLogo);

			// Set to initializing
			this.onProgress(0, "Initializing");

		}
		ProgressScreen.prototype = Object.create( C.ProgressScreen.prototype );

		/**
		 * Update progress bar value
		 */
		ProgressScreen.prototype.onProgress = function(progress, message) {
			this.elmBarValue.css({
				'width': progress*100 + '%'
			})
			this.elmProgress.text(  Math.round(progress*100) + "%" );
			this.elmStatus.text( message );
		}

		/**
		 * Fade-out animation
		 */
		ProgressScreen.prototype.onWillHide = function(ready) {
			//this.hostElement.addClass("hidden");
			//setTimeout(ready, 500);
			ready();
		}

		/**
		 * Fade-out animation
		 */
		ProgressScreen.prototype.onWillShow = function(ready) {
			//this.hostElement.removeClass("hidden");
			//setTimeout(ready, 500);
			ready();
		}

		// Register home screen
		R.registerComponent( "screen.progress", ProgressScreen, 1 );

	}

);