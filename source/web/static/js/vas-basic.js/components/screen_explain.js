
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
				expBook = $('<div class="explain-book"></div>'),
				this.foregroundDOM.append(expTop);
				this.foregroundDOM.append(expBottom);
				this.foregroundDOM.append(expBook);

			// Prepare child components
			this.comTop = R.instanceComponent( "explain.physics", expTop );
			this.comBottom = R.instanceComponent( "explain.machine", expBottom );
			this.comBook = R.instanceComponent( "explain.book", expBook );

			window.ex = this;

			// Forward events to the children
			this.forwardVisualEvents(
				[ this.comTop, this.comBottom ]
			);
			this.forwardEvents( 
				[ this.comTop, this.comBottom, this.comBook ],
				['onTunablesDefined', 'onObservablesDefined', 'onScenesDefined', 'onMachineLayoutDefined']
			);

			// Bind events
			this.comBottom.on('focusProcess', function(process) {
				self.comTop.focusProcess(process);
			});

		}
		ExplainScreen.prototype = Object.create( C.ExplainScreen.prototype );

		/**
		 * Forward ExplainScreen events to our child components
		 */
		ExplainScreen.prototype.onResize = function(w,h) {
			if (this.comTop) this.comTop.onResize(w,h*0.65);
			if (this.comBottom)  this.comBottom.onResize(w,h*0.35);
		}

		// Register home screen
		R.registerComponent( "screen.explain", ExplainScreen, 1 );

	}

);