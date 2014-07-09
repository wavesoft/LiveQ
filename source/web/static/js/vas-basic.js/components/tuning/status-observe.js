define(

	// Dependencies
	["jquery", "core/registry", "core/ui", "core/base/data_widget", "core/config" ], 

	/**
	 * This is the default observable widget component for the base interface.
	 *
 	 * @exports base/components/tuning/observable
	 */
	function(config, R, UI, DataWidget, Config) {

		var DefaultObserveStatusWidget = function(hostDOM) {

			// Initialize widget
			DataWidget.call(this, hostDOM);

			// Tunable parameters
			this.diameter = 160;

			// Prepare host
			this.element = $('<div class="progress-widget"></div>');
			hostDOM.append(this.element);

			// Prepare progress knob
			this.knobConfig = {
				min:0, max:100,
				width 		: this.diameter - 12,
				height 		: this.diameter - 12,
				thickness	: 0.35,
				angleArc 	: 270,
				angleOffset : -135,
				readOnly  	: true,
				className 	: 'knob',
				fgColor 	: "#16a085",
				bgColor 	: "#bdc3c7",
			};
			this.progressKnob = $('<input type="text" value="25" />');
			this.element.append(this.progressKnob);
			this.progressKnob.knob(this.knobConfig);

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
			this.element.append( prepareMarker( 150, "Good" ) );
			this.element.append( prepareMarker( 350, "Average" ) );
			this.element.append( prepareMarker( 400, "Bad" ) );
			this.element.append( prepareMarker( 533, "Acceptable" ) );
			this.element.append( prepareMarker( 600, "Bad" ) );

			// Prepare tunable icon
			this.startIcon = $('<a href="do:begin" class="button">Validate</a>');
			this.element.append(this.startIcon);
			this.startIcon.click((function(e) {
				e.preventDefault();
				e.stopPropagation();
				if (this.startIcon.hasClass("active")) {
					this.trigger('begin');
				}
			}).bind(this));

			// Prepare label & sublabel
			this.titleElm = $('<div class="title">Good</div>');
			this.subtitleElm = $('<div class="subtitle">match</div>');
			this.element.append(this.titleElm);
			this.element.append(this.subtitleElm);

			// Register visual aids
			R.registerVisualAid( 'tuning.status', this.element, "", 'screen.tuning' );
			R.registerVisualAid( 'tuning.start', this.startIcon, "active", 'screen.tuning' );

		};

		// Subclass from DataWidget
		DefaultObserveStatusWidget.prototype = Object.create( DataWidget.prototype );

		////////////////////////////////////////////////////////////
		//           Implementation of the DataWidget             //
		////////////////////////////////////////////////////////////

		/**
		 * Update tuning widget metadata
		 */
		DefaultObserveStatusWidget.prototype.onMetaUpdate = function(meta) {
			
		}

		/**
		 * Update tuning widget value
		 */
		DefaultObserveStatusWidget.prototype.onUpdate = function(value) {
			if (value == undefined) { // Reset
				this.progressKnob.val(0).trigger('change');
				this.titleElm.html("---");
				this.startIcon.removeClass("active");
				return;
			}

			// Change configuration based on value
			if (value < Config.values['good-average']) {
				this.knobConfig['fgColor'] = '#e74c3c';
				this.progressKnob.trigger( 'configure', this.knobConfig );
				this.titleElm.html("Bad");
				this.startIcon.removeClass("active")
			} else if (value < Config.values['average-bad']) {
				this.knobConfig['fgColor'] = '#f39c12';
				this.progressKnob.trigger( 'configure', this.knobConfig );
				this.titleElm.html("Almost");
				this.startIcon.removeClass("active")
			} else {
				this.knobConfig['fgColor'] = '#16a085';
				this.progressKnob.trigger( 'configure', this.knobConfig );
				this.titleElm.html("Good");
				this.startIcon.addClass("active")
			}

			// Update progress bar
			this.progressKnob
				.val(100 * value)
				.trigger('change');

		}

		/**
		 * The host element has changed it's dimentions
		 */
		DefaultObserveStatusWidget.prototype.onResize = function(width, height) {
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
		R.registerComponent( 'widget.tuning.status-observe', DefaultObserveStatusWidget, 1 );

	}

);