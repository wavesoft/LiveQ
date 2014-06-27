
define(

	// Requirements
	["core/config", "core/registry", "core/base/components"],

	/**
	 * Basic version of the home screen
	 *
	 * @exports vas-basic/components/running_screen
	 */
	function(config,R,C) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var RunningScreen = function( hostDOM ) {
			C.RunningScreen.call(this, hostDOM);

			// Prepare host
			hostDOM.addClass("running");

			// Create a slpash backdrop
			this.backdropDOM = $('<div class="'+config.css['backdrop']+'"></div>');
			hostDOM.append(this.backdropDOM);
			this.backdrop = R.instanceComponent("backdrop.running", this.backdropDOM);

			// Create foreground DOM
			this.foregroundDOM = $('<div class="'+config.css['foreground']+'"></div>');
			hostDOM.append( this.foregroundDOM );

			// Create globe
			this.globeDOM = $('<div class="globe"></div>');
			hostDOM.append( this.globeDOM );
			this.globe = R.instanceComponent("widget.globe3d", this.globeDOM);

			// 

		}
		RunningScreen.prototype = Object.create( C.RunningScreen.prototype );

		/**
		 * Reisze canvas & engine dimentions to fit host
		 */
		RunningScreen.prototype.onResize = function(w,h) {
			var globeW = 160, globeH = 160;
			this.width = w;
			this.height = h;

			// Realign globe
			this.globe.onResize( globeW, globeH );
			this.globeDOM.css({
				'left': (this.width - globeW) / 2,
				'top' : (this.height - globeH) / 2
			});

		}

		/**
		 * Forward onShow event to children
		 */
		RunningScreen.prototype.onShown = function() {
			this.globe.onShown();
		}

		/**
		 * Forward onWillShow event to children
		 */
		RunningScreen.prototype.onWillShow = function(cb) {
			var vc=1;
			this.globe.onWillShow(function() { if (--vc == 0) cb(); });
		}

		/**
		 * Forward onHidden event to children
		 */
		RunningScreen.prototype.onHidden = function() {
			this.globe.onHidden();
		}

		/**
		 * Forward onWillHide event to children
		 */
		RunningScreen.prototype.onWillHide = function(cb) {
			var vc=1;
			this.globe.onWillHide(function() { if (--vc == 0) cb(); });
		}

		// Register home screen
		R.registerComponent( "screen.running", RunningScreen, 1 );

	}

);