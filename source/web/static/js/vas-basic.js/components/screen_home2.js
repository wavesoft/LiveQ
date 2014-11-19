
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
		var HomeScreen = function( hostDOM ) {
			C.HomeScreen.call(this, hostDOM);

			// Prepare host
			hostDOM.addClass("home");

			// Handle mouse movement
			this.mouseX = 0;
			this.mouseY = 0;
			hostDOM.mousemove((function(e) {
				this.mouseX = e.clientX;
				this.mouseY = e.clientY;
				this.realignMachine();
			}).bind(this));

			// Create drag host
			var dragHost = this.dragHost = $('<div class="fullscreen"></div>').appendTo(hostDOM);

			// Prepare machine
			var machine = this.machine = $('<div class="r-machine"></div>').appendTo(dragHost),
				machineComponents = this.machineComponents = [
					$('<div class="m-decay"></div>').appendTo(machine),
					$('<div class="u-pdf"></div>').appendTo(machine),
					$('<div class="m-beam"></div>').appendTo(machine),
					$('<div class="m-issr"></div>').appendTo(machine),
					$('<div class="u-hard"></div>').appendTo(machine),
					$('<div class="m-hard"></div>').appendTo(machine),
					$('<div class="m-fssr"></div>').appendTo(machine),
					$('<div class="m-remn-join"></div>').appendTo(machine),
					$('<div class="m-remn-down"></div>').appendTo(machine),
					$('<div class="m-remn-up"></div>').appendTo(machine),
					$('<div class="m-hadr"></div>').appendTo(machine),
				];

			// Prepare machine overlay
			var overlay = $('<div class="r-machine-overlay"></div>').appendTo(dragHost),
				overlayComponents = [
					$('<div class="c-beam locked"></div>').appendTo(overlay),
					$('<div class="c-issr"></div>').appendTo(overlay),
					$('<div class="c-hard locked"></div>').appendTo(overlay),
					$('<div class="c-remnant locked"></div>').appendTo(overlay),
					$('<div class="c-fssr"></div>').appendTo(overlay),
					$('<div class="c-hadr"></div>').appendTo(overlay),
					$('<div class="c-decay"></div>').appendTo(overlay),
				];

			// Create a description vrame
			var descFrame = this.descFrame = $('<div class="description-frame"></div>').appendTo(hostDOM),
				descImage = this.descImage = $('<div class="image"></div>').appendTo(descFrame),
				descContent = this.descContent = $('<div class="content"></div>').appendTo(descFrame);

		}
		HomeScreen.prototype = Object.create( C.HomeScreen.prototype );

		/**
		 * Realign machine layout
		 */
		HomeScreen.prototype.realignMachine = function() {
			var machineW = this.machine.width(),
				machineH = this.machine.height();

			// Realign based on cursor on smaller screens
			if (machineW > this.width - 50) {
				var delta = -(machineW - (this.width-50)),
					mouseDelta = (this.mouseX - this.width/2) * delta / this.width;

				this.dragHost.css({
					'left': mouseDelta
				});
			}
		}

		/**
		 * Handle resize events
		 */
		HomeScreen.prototype.onResize = function(width, height) {
			this.width = width;
			this.height = height;
			this.realignMachine();
		}


		// Register home screen
		R.registerComponent( "screen.home", HomeScreen, 1 );

	}

);
