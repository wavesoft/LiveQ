
define(

	// Requirements
	["jquery", "core/registry", "core/base/components", "vas-editor/runtime/canvas" ],

	/**
	 * Basic version of the engine description
	 *
	 * @exports basic/components/explain_physics
	 */
	function($,R,C,Canvas) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var ExplainBlackboard = function( hostDOM ) {
			C.ExplainScreen.call(this, hostDOM);

			// Initialize a new canvas
			this.canvas = new Canvas( hostDOM );

			// Forward canvas events
			this.canvas.on('animationCompleted', (function() {
				this.trigger('animationCompleted');
			}).bind(this));
			this.canvas.on('animationStarted', (function() {
				this.trigger('animationStarted');
			}).bind(this));

		}
		ExplainBlackboard.prototype = Object.create( C.ExplainScreen.prototype );

		/**
		 * Return the animation position normalized to 0.0-1.0
		 */
		ExplainBlackboard.prototype.getPosition = function() {
			return this.canvas.getPosition(true);
		}

		/**
		 * This event is fired when animation information has updated
		 */
		ExplainBlackboard.prototype.onAnimationUpdated = function( doc, cb ) {
			this.canvas.loadJSON( doc, (function(e){
				this.canvas.hotspots.setProgression(1);
				this.canvas.timeline.setPaused(true);
				if (cb) cb();
			}).bind(this) );
		}

		/**
		 * This event is fired when animation should start
		 */
		ExplainBlackboard.prototype.onAnimationStart = function( ) {
			this.canvas.timeline.gotoAndPlay(0);
		}

		/**
		 * This event is fired when animation should stop
		 */
		ExplainBlackboard.prototype.onAnimationStop = function( ) {
			this.canvas.timeline.gotoAndStop(0); //this.canvas.timeline.duration);
		}

		/**
		 * Start animation when shown
		 */
		ExplainBlackboard.prototype.onWillShow = function(cb) {
			this.canvas.timeline.gotoAndStop(10);
			this.canvas.timeline.gotoAndStop(0);
			cb();
		}

		/**
		 * Stop animation when hiding
		 */
		ExplainBlackboard.prototype.onWillHide = function(cb) {
			this.canvas.timeline.gotoAndStop(0);
			cb();
		}

		/**
		 * Scale canvas to fit
		 */
		ExplainBlackboard.prototype.onResize = function(width, height) {
			var w = 800, h = 450;

			// Update local properties
			this.width = width;
			this.height = height;

			// Fit in the smallest dimention
			var scale;
			if (this.width > this.height) {
				scale = this.height / h;

				// Center horizontally
				var ww = w * scale;
				this.canvas.canvasDOM.css({
					'margin-top': 0,
					'margin-left': (this.width - ww)/2
				});

			} else {
				scale = this.width / w;

				// Center vertically
				var hh = hh * scale;
				this.canvas.canvasDOM.css({
					'margin-top': (this.height - hh)/2,
					'margin-left': 0
				});

			}

			// Apply scale
			this.canvas.canvasDOM.css({
				'transform': 'scale(' + scale + ')',
				'webkitTransform': 'scale(' + scale + ')',
				'mozTransform': 'scale(' + scale + ')',
				'msTransform': 'scale(' + scale + ')',
				'oTransform': 'scale(' + scale + ')',
			});

		}

		// Register home screen
		R.registerComponent( "explain.blackboard", ExplainBlackboard, 1 );

	}

);