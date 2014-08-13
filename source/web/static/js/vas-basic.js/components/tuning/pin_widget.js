define(

	// Dependencies
	["jquery", "core/registry","core/base/data_widget" ], 

	/**
	 * This is the default component for displaying information regarding a observable
	 *
 	 * @exports vas-basic/infoblock/observable
	 */
	function(config, R, DataWidget) {

		// Keep in memory the last active tab
		var lastActiveTab = 0;

		/**
		 * The default observable body class
		 */
		var ObservableBody = function(hostDOM) {

			// Initialize widget
			DataWidget.call(this, hostDOM);

			// Prepare tabular content
			this.tabHost = $('<div class="tabs tabs-right"></div>');
			this.tabBody = $('<div class="tabs-body"></div>');
			this.tabButtons = $('<div class="tabs-buttons"></div>');
			hostDOM.append( this.tabHost );
			this.tabHost.append( this.tabBody );
			this.tabHost.append( this.tabButtons );

			// Prepare the tabular histogram information
			this.histogramTabs = [];

			// Add close button
			var closeBtn = $('<a href="do:close"><span class="uicon uicon-x"></span></a>').appendTo(this.tabButtons);
			closeBtn.click((function(e) {
				e.stopPropagation();
				e.preventDefault();
				this.trigger('close');
			}).bind(this));

			// Prepare plot component on body
			this.registerTab("dataviz.histogram", "uicon-plot-sideside");
			this.registerTab("dataviz.histogram_ratio", "uicon-plot-ratio");

			// Select the last active tab
			this.selectTab(lastActiveTab);

		};

		// Subclass from ObservableWidget
		ObservableBody.prototype = Object.create( DataWidget.prototype );

		///////////////////////////////////////////////////////////////////////////////
		////                         UTILITY FUNCTIONS                             ////
		///////////////////////////////////////////////////////////////////////////////

		/**
		 * Register histogram handler
		 */
		ObservableBody.prototype.selectTab = function( id ) {
			lastActiveTab = id;
			for (var i=0; i<this.histogramTabs.length; i++) {
				if (i == id) {
					this.histogramTabs[i].com.show();
					this.histogramTabs[i].elmButton.addClass("active");
					this.histogramTabs[i].elmBody.show();
				} else {
					this.histogramTabs[i].com.hide();
					this.histogramTabs[i].elmButton.removeClass("active");
					this.histogramTabs[i].elmBody.hide();
				}
			}
		}


		/**
		 * Register histogram handler
		 */
		ObservableBody.prototype.registerTab = function( className, uicon ) {

			// Create button
			var tabButton = $('<a href="do:'+className+'"><span class="uicon '+uicon+'"></span></a>'),
				tabIndex = this.histogramTabs.length;
			this.tabButtons.append( tabButton );

			// Handle click
			tabButton.click((function(e) {
				e.preventDefault();
				e.stopPropagation();
				this.selectTab(tabIndex);
			}).bind(this));

			// Create body
			var tabBody = $('<div class="tab"></div>');
			this.tabBody.append( tabBody );

			// Instantiate component
			var com = R.instanceComponent( className, tabBody );
			if (!com) {
				tabBody.remove();
				tabButton.remove();
				console.error("ObservableBody: Could not instantiate histogram tab from component '"+className+"'");
				return;
			}

			// Adopt component
			this.forwardVisualEvents( com );
			this.adoptEvents( com );

			// Hide/show
			if (this.histogramTabs.length == 0) {
				tabBody.show();
				tabButton.addClass("active");
				com.show();
			} else {
				tabBody.hide();
				com.hide();
			}


			// Store
			this.histogramTabs.push({
				'elmButton': tabButton,
				'elmBody'  : tabBody,
				'com'	   : com
			});

		}

		///////////////////////////////////////////////////////////////////////////////
		////                          EVENT HANDLERS                               ////
		///////////////////////////////////////////////////////////////////////////////

		/**
		 * Forvward value update to the plot
		 */
		ObservableBody.prototype.onUpdate = function( value ) {
			for (var i=0; i<this.histogramTabs.length; i++) {
				this.histogramTabs[i].com.onUpdate( value );
			}
		}

		/**
		 * Forward the resize events
		 */
		ObservableBody.prototype.onResize = function(width, height) {
			this.width = width;
			this.height = height;
			for (var i=0; i<this.histogramTabs.length; i++) {
				this.histogramTabs[i].com.onResize( this.tabBody.width()-18, this.tabBody.height()-20 );
			}
		}

		// Store observable infoblock component on registry
		R.registerComponent( 'screen.tuning.pin_widget', ObservableBody, 1 );

	}

);