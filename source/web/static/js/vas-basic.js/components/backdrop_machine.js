
define(

	// Requirements
	["jquery", "core/registry", "core/base/components", "core/ui"],

	/**
	 * Basic version of the machine backdrop
	 *
	 * @exports basic/components/backdrop_machine
	 */
	function($, R,C,UI) {

		/**
		 * @class
		 * @classdesc The basic machine backdrop screen
		 */
		var MachineBackdrop = function( hostDOM ) {
			C.Backdrop.call(this, hostDOM);
 
			// The enabled machine parts
			this.enabledMachineParts = {};

			// Handle mouse movement
			this.mouseX = 0;
			this.mouseY = 0;
			this.locked = false;
			hostDOM.mousemove((function(e) {
				this.mouseX = e.clientX;
				this.mouseY = e.clientY;
				if (this.locked) return;
				this.realignMachine();
			}).bind(this));

 			// Create drag host
			var dragHost = this.dragHost = $('<div class="fullscreen"></div>').appendTo(hostDOM);

			// Prepare machine
			var machine = this.machine = $('<div class="r-machine"></div>').appendTo(dragHost);
			this.machineComponents = this.machineComponents = [
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
			var overlay = $('<div class="r-machine-overlay"></div>').appendTo(dragHost);
			this.overlayComponents = [
					$('<div class="c-beam locked"></div>').appendTo(overlay),
					$('<div class="c-issr locked"></div>').appendTo(overlay),
					$('<div class="c-hard locked"></div>').appendTo(overlay),
					$('<div class="c-remnant locked"></div>').appendTo(overlay),
					$('<div class="c-fssr locked"></div>').appendTo(overlay),
					$('<div class="c-hadr locked"></div>').appendTo(overlay),
					$('<div class="c-decay locked"></div>').appendTo(overlay),
				];

			// Register visual aids
			R.registerVisualAid("machine.expand.beam", this.overlayComponents[0]);
			R.registerVisualAid("machine.expand.issr", this.overlayComponents[1]);
			R.registerVisualAid("machine.expand.hard", this.overlayComponents[2]);
			R.registerVisualAid("machine.expand.remnant", this.overlayComponents[3]);
			R.registerVisualAid("machine.expand.fssr", this.overlayComponents[4]);
			R.registerVisualAid("machine.expand.hadr", this.overlayComponents[5]);
			R.registerVisualAid("machine.expand.decay", this.overlayComponents[6]);

			// Aliases for each overlay component
			var aliases = this.aliases = [ 'beam', 'issr', 'hard', 'remnant', 'fssr', 'hadr', 'decay' ];
			var aliasComponent = this.aliasComponent = [ [1,2], [3], [4,5], [7,8,9], [6], [10], [0] ];

			// Bind callbacks
			for (var i=0; i<this.overlayComponents.length; i++) {

				this.overlayComponents[i].mouseover((function(index) {
					return function() {
						var pos = this.overlayComponents[index].position(),
							ppos = overlay.position();
						pos.left += ppos.left+ 24; 
						pos.top += ppos.top + 24;
						this.trigger("hover", aliases[index], pos);

						// Grey everything and focus the particular
						this.machine.removeClass("active");
						this.machine.addClass("gray");
						for (var i=0; i<this.machineComponents.length; i++) {
							this.machineComponents[i].removeClass("focus");
						}
						for (var i=0; i<aliasComponent[index].length; i++) {
							var j = aliasComponent[index][i];
							this.machineComponents[j].addClass("focus");
						}

					}
				})(i).bind(this));

				this.overlayComponents[i].mouseout((function(index) {
					return function() {
						var pos = this.overlayComponents[index].position(),
							ppos = overlay.position();
						pos.left += ppos.left+ 24; 
						pos.top += ppos.top + 24;
						this.trigger("mouseout", pos);

						// Reset gray focus
						this.machine.removeClass("active");
						this.machine.removeClass("gray");
						for (var i=0; i<this.machineComponents.length; i++) {
							this.machineComponents[i].removeClass("focus");
						}

					}
				})(i).bind(this));

				this.overlayComponents[i].click((function(index) {
					return function() {
						var pos = this.overlayComponents[index].position(),
							ppos = overlay.position();
						pos.left += ppos.left+ 24; 
						pos.top += ppos.top + 24;
						this.trigger("click", aliases[index], pos);
					}
				})(i).bind(this));

			}

		}
		MachineBackdrop.prototype = Object.create( C.Backdrop.prototype );

		/**
		 * Machine parts are enabled
		 */
		MachineBackdrop.prototype.onMachineConfigChanged = function(config) {

			// Change beam mode
			if (config['beam'] !== undefined) {
				var alt = 0;
				if (config['beam'] != "ee") alt=1;
				this.machineComponents[1].attr("class", "u-pdf alt-"+alt);
			}

		}

		/**
		 * Machine parts are enabled
		 */
		MachineBackdrop.prototype.onMachinePartsEnabled = function(parts) {
			
			// Check focusing mode to use
			this.focusMode = 0;

			// Keep a reference of the enabled machine parts
			this.enabledMachineParts = parts;

			// Build parts
			var first = true;
			for (var k in parts) {
				var i = this.aliases.indexOf(k);
				if (i < 0) continue;

				// Mark particular component locked/unlocked
				if (parts[k]) {
					this.overlayComponents[i].removeClass('locked');

					// Check for first time
					if (first) {
						// Register visual aids
						R.registerVisualAid("machine.first-topic", this.overlayComponents[i]);
						first = false;
					}

				} else {
					this.overlayComponents[i].addClass('locked');
				}

			}
		}

		/**
		 * Realign machine layout
		 */
		MachineBackdrop.prototype.realignMachine = function() {
			var machineW = this.machine.width() + 80,
				machineH = this.machine.height();

			// Realign based on cursor on smaller screens
			if (machineW > this.width - 50) {
				var delta = -(machineW - (this.width-50)),
					mouseDelta = (this.mouseX - this.width/2) * delta / this.width;
				this.dragHost.css({
					'left': mouseDelta
				});
			} else {
				this.dragHost.css({
					'left': 0
				});
			}
		}

		/**
		 * Handle resize events
		 */
		MachineBackdrop.prototype.onResize = function(width, height) {
			this.width = width;
			this.height = height;
			this.realignMachine();
		}

		/**
		 * Realign on show
		 */
		MachineBackdrop.prototype.onWillShow = function(cb) {
			this.realignMachine();
			cb();
		}

		/**
		 * DIsplay first-time aids when shown
		 */
		MachineBackdrop.prototype.onShown = function() {
			UI.showFirstTimeAid("machine.first-topic");
		}


		// Register machine backdrop screen
		R.registerComponent( "backdrop.machine", MachineBackdrop, 1 );

	}

);