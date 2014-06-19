
define(

	// Requirements
	["jquery", "core/config", "core/registry", "core/components"],

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
			this.comTop.onWillShow(function() { if (!--c) cb(); });
			this.comBottom.onWillShow(function() { if (!--c) cb(); });
		}
		ExplainScreen.prototype.onWillHide = function(cb) {
			var c=2;
			this.comTop.onWillHide(function() { if (!--c) cb(); });
			this.comBottom.onWillHide(function() { if (!--c) cb(); });
		}
		ExplainScreen.prototype.onShown = function() {
			this.comTop.onShown();
			this.comBottom.onShown();
		}
		ExplainScreen.prototype.onHidden = function() {
			this.comTop.onHidden();
			this.comBottom.onHidden();
		}
		ExplainScreen.prototype.onResize = function(w,h) {
			this.comTop.onResize(w,h*0.65);
			this.comBottom.onResize(w,h*0.35);
		}
		ExplainScreen.prototype.onTunablesDefined = function(tunables) {
			this.comTop.onTunablesDefined(tunables);
			this.comBottom.onTunablesDefined(tunables);
		}
		ExplainScreen.prototype.onObservablesDefined = function(observables) {
			this.comTop.onObservablesDefined(observables);
			this.comBottom.onObservablesDefined(observables);
		}
		ExplainScreen.prototype.onScenesDefined = function(scenes) {
			this.comTop.onScenesDefined(scenes);
			this.comBottom.onScenesDefined(scenes);
		}
		ExplainScreen.prototype.onMachineLayoutDefined = function(layout) {
			this.comTop.onMachineLayoutDefined(layout);
			this.comBottom.onMachineLayoutDefined(layout);
		}

		// Register home screen
		R.registerComponent( "screen.explain", ExplainScreen, 1 );

	}

);