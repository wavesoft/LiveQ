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
			hostDOM.addClass("tuning-panel");
			this.tunableHost = $('<div class="tunable-host"></div>').appendTo(hostDOM);

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
			var container = $('<div class="tunable"></div>').appendTo(this.tunableHost),
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
		 * This event is fired when the view is scrolled/resized and it
		 * specifies the height coordinates of the bottom side of the screen.
		 */
		DefaultTuningPanel.prototype.onResize = function(width, height) {
			this.width = width;
			this.height = height;
		}

		/**
		 * HAndle the onWillShow event
		 */
		DefaultTuningPanel.prototype.onWillShow = function(ready) {

			this.tunableHost.empty();
			for (var i=0; i<10; i++) {
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

			ready();
		}

		/**
		 * HAndle the onShow event
		 */
		DefaultTuningPanel.prototype.onShown = function() {

		}

		// Store tuning widget component on registry
		R.registerComponent( 'widget.tunable.tuningpanel', DefaultTuningPanel, 1 );

	}

);