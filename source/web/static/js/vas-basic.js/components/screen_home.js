
define(

	// Requirements
	["core/config", "core/registry", "core/base/components"],

	/**
	 * Basic version of the home screen
	 *
	 * @exports basic/components/home_screen
	 */
	function(config,R,C) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var HomeScreen = function( hostDOM ) {
			var self = this;
			C.HomeScreen.call(this, hostDOM);
			hostDOM.addClass("home");

			// Create a slpash backdrop
			this.backdropDOM = $('<div class="'+config.css['backdrop']+'"></div>');
			hostDOM.append(this.backdropDOM);
			this.backdrop = R.instanceComponent("backdrop.home", this.backdropDOM);

			// Create foreground DOM
			this.foregroundDOM = $('<div class="'+config.css['foreground']+'"></div>');
			hostDOM.append(this.foregroundDOM);

			// Prepare the home menu floater
			this.menuFloater = $('<div class="home-menu"></div>');
			this.foregroundDOM.append(this.menuFloater);

			// Prepare some buttons
			this.menuFloater.append( $('<div class="text-center"><img src="static/img/logo.png" alt="Logo" /><h1>Virtual Atom Smasher</h1><p class="subtitle">Alpha Game Interface</p></div>') );
			this.menuFloater.append(
					$('<a href="#" class="btn btn-default">Explainations Screen</a>')
					.click(function() {
						self.trigger("changeScreen", "screen.explain");
					})
				);
			this.menuFloater.append(
					$('<a href="#" class="btn btn-default">Tuning Screen</a>')
					.click(function() {
						self.trigger("changeScreen", "screen.tuning");
					})
				);
			this.menuFloater.append(
					$('<a href="#" class="btn btn-default">Running Screen</a>')
					.click(function() {
						self.trigger("changeScreen", "screen.running");
					})
				);

			R.registerVisualAid( 'screen.menu', this.menuFloater );

		}
		HomeScreen.prototype = Object.create( C.HomeScreen.prototype );

		/**
		 * Re-align menu on position
		 */
		HomeScreen.prototype.onResize = function(w,h) {
			var fw = this.menuFloater.width(),
				fh = this.menuFloater.height();

			// Re-center 
			this.menuFloater.css({
				'left': (w-fw)/2,
				'top': (h-fh)/2,
			});
		}

		// Register home screen
		R.registerComponent( "screen.home", HomeScreen, 1 );

	}

);