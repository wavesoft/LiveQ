
define(

	// Requirements
	[ "jquery", "core/config", "core/registry", "core/base/components"],

	/**
	 * Basic version of the home screen
	 *
	 * @exports vas-basic/components/running_screen
	 */
	function($, config,R,C) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var RunningScreen = function( hostDOM ) {
			C.RunningScreen.call(this, hostDOM);

			// Prepare configuration
			this.diameter = 200;

			// Prepare host
			hostDOM.addClass("running");

			// Create a slpash backdrop
			this.backdropDOM = $('<div class="'+config.css['backdrop']+'"></div>');
			hostDOM.append(this.backdropDOM);
			this.backdrop = R.instanceComponent("backdrop.running", this.backdropDOM);

			// Create foreground DOM
			this.foregroundDOM = $('<div class="'+config.css['foreground']+'"></div>');
			hostDOM.append( this.foregroundDOM );

			// Prepare progress status
			this.progressGroup = $('<div class="progress"></div>');
			hostDOM.append( this.progressGroup );

			// Prepare progress knob
			this.progressKnobBlur = $('<input type="text" value="25" />');
			this.progressKnob = $('<input type="text" value="25" />');
			this.progressGroup.append(this.progressKnob);
			this.progressGroup.append(this.progressKnobBlur);
			this.progressKnob.knob({
				min:0, max:100,
				width 		: this.diameter - 12,
				height 		: this.diameter - 12,
				thickness	: 0.1,
				angleArc 	: 270,
				angleOffset : 45,
				readOnly  	: true,
				className 	: 'knob',
				fgColor 	: "#FFCC00",
				bgColor 	: "#EEEEEE",
			});
			this.progressKnobBlur.knob({
				min:0, max:100,
				width 		: this.diameter - 12,
				height 		: this.diameter - 12,
				thickness	: 0.1,
				angleArc 	: 270,
				angleOffset : 45,
				readOnly  	: true,
				className 	: 'knob blur',
				fgColor 	: "#FFCC00",
				bgColor 	: "#FFFFFF",
			});

			// Create globe
			this.globeDOM = $('<div class="globe"></div>');
			hostDOM.append( this.globeDOM );
			this.globe = R.instanceComponent("widget.globe3d", this.globeDOM);


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
				'top' : (this.height - globeH) / 2,
			});

			// Realign background
			this.progressGroup.css({
				'left': (this.width - this.diameter) / 2,
				'top': (this.height - this.diameter) / 2,
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