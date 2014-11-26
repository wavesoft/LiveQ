define(

	// Dependencies
	["jquery", "core/registry", "core/ui", "core/base/tuning_components" ], 

	/**
	 * This is the default tunable widget component for the base interface.
	 *
 	 * @exports base/components/tuning/tuning_panel
	 */
	function($, R, UI, TC) {

		var DefaultTuningPanel = function(hostDOM) {

			// Initialize widget
			TC.TuningPanel.call(this, hostDOM);

			// Prepare DOM
			hostDOM.addClass("tuning-panel hidden");
			this.headerElm = $('<div class="header">Test</div>').appendTo(hostDOM);
			this.tunablesElm = $('<div class="tunables"></div>').appendTo(hostDOM);

			// Dimentions of the panel
			this.panelSize = {
				'width': 0,
				'height': 0
			};

		};

		// Subclass from TuningPanel
		DefaultTuningPanel.prototype = Object.create( TC.TuningPanel.prototype );

		////////////////////////////////////////////////////////////
		//                    Helper Functions                    //
		////////////////////////////////////////////////////////////

		/**
		 * Register a new tunable widget
		 */
		DefaultTuningPanel.prototype.defineAndRegister = function(metadata) {
			var container = $('<div class="tunable"></div>').appendTo(this.tunablesElm),
				com = R.instanceComponent("widget.tunable.tuning", container);
			if (!com) return;

			// Initialize tunable
			com.onMetaUpdate(metadata);

			// Forward visual events to the component
			this.forwardVisualEvents(com);

			// Bind events
			com.on('change', (function() {

			}).bind(this));
		}

		////////////////////////////////////////////////////////////
		//           Implementation of the TuningWidget           //
		////////////////////////////////////////////////////////////

		/**
		 * This event is fired when the tunables of this panel should be defined
		 */
		DefaultTuningPanel.prototype.onTuningPanelDefined = function(title, tunables) {

			// Prepare panel dimentions according to the number of tunables
			var row_height = 52, row_width = 187,
				grid_w = 0, grid_h = 0;
			if (tunables.length <= 5) {
				grid_h = row_height * tunables.length + 8;
				grid_w = row_width + 10;
				this.tunablesElm.removeClass("col-2");
			} else {
				var max_rows = Math.ceil(tunables.length / 2);
				grid_h = max_rows * row_height + 8;
				grid_w = 2 * row_width + 10;
				this.tunablesElm.addClass("col-2");
			}

			// Resize container element
			this.tunablesElm.css({
				'width': grid_w,
				'height': grid_h
			});

			// Define the dimentions
			this.width = grid_w;
			this.height = 21 + grid_h;

			// Regenerate tunables
			this.tunablesElm.empty();
			for (var i=0; i<tunables.length; i++) {
				var t = tunables[i];
				this.defineAndRegister({
			          _id: 'num-'+i, // The tunable id (ex. TimeShower:alphaSvalue)
			         type: 'num',    // One of: num,str,list,bool
			          def: 0,        // The default value for this element
			         value: {        // Value metadata, for 'num' type:
			            min: 0,      //   The minimum value
			            max: 10,     //   The maximum value
			            dec: 2       //   The decimals on the number
			         },
			         info: {         // Information for the user:
			           name: 'Parm'+i,  //   The visible name for this parameter
			          short: 'P'+i,  //   A short (iconic) name for this parameter
			           book: 'r-'+i, //   Reference ID for providing more explaination 
			          group: 'first'   //   The group name where this parameter belongs
			         },
			         corr: {         // Correlation information
			         }
				});
			}
		}

		/**
		 * This event is fired when the view is scrolled/resized and it
		 * specifies the height coordinates of the bottom side of the screen.
		 */
		DefaultTuningPanel.prototype.onResize = function(width, height) {

			// Update size variables
			this.width = width;
			this.height = height;

			// Define the dimentions
			var win_t = 'translate(-' + Math.round(width/2) + 'px, -' + Math.round(height/2) + 'px)'
			this.hostDOM.css({
				// Width/height
				'width': width,
				'height': height,
				// Centering
				'transform': win_t,
				'oTransform': win_t,
				'msTransform': win_t,
				'webkitTransform': win_t,
				'mozTransform': win_t,
			});

		}

		// Store tuning widget component on registry
		R.registerComponent( 'widget.tunable.tuningpanel', DefaultTuningPanel, 1 );

	}

);