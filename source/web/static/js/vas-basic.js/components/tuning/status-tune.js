define(

	// Dependencies
	["jquery", "core/registry", "core/ui", "core/base/data_widget", "core/config" ], 

	/**
	 * This is the default observable widget component for the base interface.
	 *
 	 * @exports base/components/tuning/observable
	 */
	function(config, R, UI, DataWidget, Config) {

		var DefaultTuneStatusWidget = function(hostDOM) {

			// Initialize widget
			DataWidget.call(this, hostDOM);

			// Tunable parameters
			this.diameter = 160;

			// Prepare host
			this.element = $('<div class="progress-widget"></div>');
			hostDOM.append(this.element);

			// Prepare marker regions
			var self = this;
			var prepareMarker = function(radius, name ) {
				var marker = $('<div class="c-marker"></div>'),
					label = $('<div class="label">'+name+'</div>');
				marker.css({
					'left'   			: (self.diameter/2)-radius,
					'top'    			: (self.diameter/2)-radius,
					'width'  			: 2*radius,
					'height' 			: 2*radius,
					'border-radius' 		: radius,
					'-webkit-border-radius' : radius,
					'-moz-border-radius' 	: radius,
					'-o-border-radius'		: radius
				});
				marker.append(label);
				return marker;
			}

			// Prepare the save/load slots


			// Prepare label & sublabel
			this.titleElm = $('<div class="title">Tune</div>');
			this.subtitleElm = $('<div class="subtitle">Slide</div>');
			this.element.append(this.titleElm);
			this.element.append(this.subtitleElm);

		};

		// Subclass from DataWidget
		DefaultTuneStatusWidget.prototype = Object.create( DataWidget.prototype );

		////////////////////////////////////////////////////////////
		//           Implementation of the DataWidget             //
		////////////////////////////////////////////////////////////

		/**
		 * Update tuning widget metadata
		 */
		DefaultTuneStatusWidget.prototype.onMetaUpdate = function(meta) {
			
		}

		/**
		 * Update tuning widget value
		 */
		DefaultTuneStatusWidget.prototype.onUpdate = function(value) {
		}

		/**
		 * The host element has changed it's dimentions
		 */
		DefaultTuneStatusWidget.prototype.onResize = function(width, height) {
			this.width = width;
			this.height = height;

			// Calculate midpoint
			var midX = this.left + this.width / 2,
				midY = this.top + this.height / 2;

			this.element.css({
				'left': midX - this.diameter/2,
				'top': midY - this.diameter/2
			});
		}

		////////////////////////////////////////////////////////////
		//         Implementation of the Tuning Widget            //
		////////////////////////////////////////////////////////////



		////////////////////////////////////////////////////////////
		//            Implementation-specific functions           //
		////////////////////////////////////////////////////////////


		// Store tuning widget component on registry
		R.registerComponent( 'widget.tuning.status-tune', DefaultTuneStatusWidget, 1 );

	}

);