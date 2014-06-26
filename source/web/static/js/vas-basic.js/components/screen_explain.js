
define(

	// Requirements
	["jquery", "core/config", "core/registry", "core/base/components"],

	/**
	 * Basic version of the home screen
	 *
	 * @exports basic/components/explain_screen
	 */
	function($, config, R,C) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var ExplainScreen = function( hostDOM ) {
			C.ExplainScreen.call(this, hostDOM);
			var self = this;

			// Prepare host
			hostDOM.addClass("explain");

			// Create a slpash backdrop
			this.backdropDOM = $('<div class="'+config.css['backdrop']+'"></div>');
			hostDOM.append(this.backdropDOM);
			this.backdrop = R.instanceComponent("backdrop.explain", this.backdropDOM);

			// Create foreground
			this.foregroundDOM = $('<div class="'+config.css['foreground']+'"></div>');
			hostDOM.append(this.foregroundDOM);

			// Prepare sub-components
			var expTop = $('<div class="explain-top"></div>'),
				expBottom = $('<div class="explain-bottom"></div>');
				this.foregroundDOM.append(expTop);
				this.foregroundDOM.append(expBottom);

			// Prepare child components
			this.comTop = R.instanceComponent( "explain.physics", expTop );
			this.comBottom = R.instanceComponent( "explain.machine", expBottom );

			// Bind events
			this.comBottom.on('focusProcess', function(process) {
				self.comTop.focusProcess(process);
			});

		}
		ExplainScreen.prototype = Object.create( C.ExplainScreen.prototype );

		/**
		 * Forward ExplainScreen events to our child components
		 */
		ExplainScreen.prototype.onWillShow = function(cb) {
			var c=2;
			if (this.comTop) this.comTop.onWillShow(function() { if (!--c) cb(); });
			if (this.comBottom)  this.comBottom.onWillShow(function() { if (!--c) cb(); });
		}
		ExplainScreen.prototype.onWillHide = function(cb) {
			var c=2;
			if (this.comTop) this.comTop.onWillHide(function() { if (!--c) cb(); });
			if (this.comBottom)  this.comBottom.onWillHide(function() { if (!--c) cb(); });
		}
		ExplainScreen.prototype.onShown = function() {
			if (this.comTop) this.comTop.onShown();
			if (this.comBottom)  this.comBottom.onShown();
		}
		ExplainScreen.prototype.onHidden = function() {
			if (this.comTop) this.comTop.onHidden();
			if (this.comBottom)  this.comBottom.onHidden();
		}
		ExplainScreen.prototype.onResize = function(w,h) {
			if (this.comTop) this.comTop.onResize(w,h*0.65);
			if (this.comBottom)  this.comBottom.onResize(w,h*0.35);
		}
		ExplainScreen.prototype.onTunablesDefined = function(tunables) {
			if (this.comTop) this.comTop.onTunablesDefined(tunables);
			if (this.comBottom)  this.comBottom.onTunablesDefined(tunables);
		}
		ExplainScreen.prototype.onObservablesDefined = function(observables) {
			if (this.comTop) this.comTop.onObservablesDefined(observables);
			if (this.comBottom)  this.comBottom.onObservablesDefined(observables);
		}
		ExplainScreen.prototype.onScenesDefined = function(scenes) {
			if (this.comTop) this.comTop.onScenesDefined(scenes);
			if (this.comBottom)  this.comBottom.onScenesDefined(scenes);
		}
		ExplainScreen.prototype.onMachineLayoutDefined = function(layout) {
			if (this.comTop) this.comTop.onMachineLayoutDefined(layout);
			if (this.comBottom)  this.comBottom.onMachineLayoutDefined(layout);
		}

		// Register home screen
		R.registerComponent( "screen.explain", ExplainScreen, 1 );

	}

);