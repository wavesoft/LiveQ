
define(

	// Requirements
	["jquery", "d3", "core/db", "core/ui", "core/config", "core/registry", "core/base/components"],

	/**
	 * Basic version of the home screen
	 *
	 * @exports basic/components/explain_screen
	 */
	function($, d3, DB, UI, config, R,C) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var TuningScreen = function( hostDOM ) {
			C.TuningScreen.call(this, hostDOM);

			// Prepare host
			hostDOM.addClass("tuning2");

			// Create a machine
			var machineDOM = $('<div class="fullscreen"></div>').appendTo(hostDOM);
			this.machine = R.instanceComponent("backdrop.machine", machineDOM);
			this.forwardVisualEvents( this.machine, { 'left':0, 'top': 0, 'width': '100%', 'height': '100%' } );
			
			// Setup machine
			this.machine.onTopicTreeUpdated({
				'issr': true
			});

			this.machine.on('click', (function(eid, pos) {
				this.showPopover(pos);
			}).bind(this));

			// Create a description vrame
			var boardHost = $('<div class="control-board"></div>').appendTo(hostDOM),
				descBoard = $('<div></div>').appendTo(boardHost);


			// Prepare tuning panel DOM
			this.tuningMask = $('<div class="fullscreen mask"></div>').hide().appendTo(hostDOM);
			this.tunableGroup = $('<div class="parameter-group"></div>').appendTo(this.tuningMask);
			this.tuningMask.click((function() {
				this.hidePopover((function() {
					this.tuningMask.hide();
				}).bind(this));
			}).bind(this));

			// Prepare tuning panel with it's blocking frame
			this.tuningPanel = R.instanceComponent("widget.tunable.tuningpanel", this.tunableGroup);
			this.tunableGroup.click(function(e) {
				e.stopPropagation();
				e.preventDefault();
			});

		}
		TuningScreen.prototype = Object.create( C.TuningScreen.prototype );

		/**
		 * Setup popover with the configuration given
		 */
		TuningScreen.prototype.setupPopover = function(config) {

		}

		/** 
		 * Hide pop-up
		 */
		TuningScreen.prototype.hidePopover = function(callback) {
			this.tunableGroup.removeClass("expanded");
			setTimeout(callback, 200);
		}

		/** 
		 * Show popover over the given coordinates
		 */
		TuningScreen.prototype.showPopover = function( pos ) {

			this.tuningPanel.onTuningPanelDefined();
			this.tuningPanel.onWillShow((function() {

				// Calculate centered coordinates
				var sz_w = 410, sz_h = 300,
					x = pos.left, y = pos.top;

				// Wrap inside screen coordinates
				if (x - sz_w/2 < 0) x = sz_w/2;
				if (y - sz_h/2 < 0) y = sz_h/2;
				if (x + sz_w/2 > this.width) x = this.width - sz_w/2;
				if (y + sz_h/2 > this.height) y = this.height - sz_h/2;

				// Change position
				this.tuningMask.show();
				this.tunableGroup.removeClass("animating");
				this.tunableGroup.css({
					'left': pos.left, 'top': pos.top
				});

				// Show
				setTimeout((function() {
					this.tunableGroup.addClass("expanded animating");
					this.tunableGroup.css({
						'left': x, 'top': y
					});

					setTimeout((function() {
						this.tuningPanel.onResize(sz_w, sz_h);
						this.tuningPanel.onShown();
					}).bind(this), 250);
				}).bind(this), 10);

			}).bind(this));

		}


		// Register home screen
		R.registerComponent( "screen.tuning", TuningScreen, 1 );

	}

);
