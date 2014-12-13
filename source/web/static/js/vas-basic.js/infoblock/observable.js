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

			// Prepare infoblock
			this.element = $('<div class="body-more"></div>');
			hostDOM.append(this.element);
			this.bodyDOM = $('<div class="body"></div>');
			this.moreLinks = $('<div class="more"></div>');
			this.element.append(this.bodyDOM);
			this.element.append(this.moreLinks);

			// Prepare tabular content
			this.tabHost = $('<div class="tabs tabs-right"></div>');
			this.tabBody = $('<div class="tabs-body"></div>');
			this.tabButtons = $('<div class="tabs-buttons"></div>');
			this.bodyDOM.append( this.tabHost );
			this.tabHost.append( this.tabBody );
			this.tabHost.append( this.tabButtons );

			// Prepare the tabular histogram information
			this.histogramTabs = [];

			// Prepare plot component on body
			this.registerTab("dataviz.histogram", "uicon-plot-sideside");
			this.registerTab("dataviz.histogram_ratio", "uicon-plot-ratio");
			this.registerTab("dataviz.histogram_full", "uicon-plot-ratio");

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
		 * Define the metadata to use for description
		 */
		ObservableBody.prototype.onMetaUpdate = function( meta ) {

			// Prepare 'more' links
			this.moreLinks.empty();

			/*
			// Put a 'pin this' button which triggers the 'pin' event
			var l = $('<a href="do:pin-this"><span class="uicon uicon-pin"></span> Pin this ...</a>');
			l.click((function(e) {
				e.preventDefault();
				e.stopPropagation();
				this.trigger('pin');
			}).bind(this));
			this.moreLinks.append( l );
			*/
			
			// Put an 'explain this' button which triggers the 'explain' event
			if (meta['info']['book']) {
				var l = $('<a href="do:show-more"><span class="uicon uicon-explain"></span> Explain this ...</a>');
				l.click((function(e) {
					e.preventDefault();
					e.stopPropagation();
					this.trigger('explain', meta['info']['book'] );
				}).bind(this));
				this.moreLinks.append( l );
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
		R.registerComponent( 'infoblock.observable', ObservableBody, 1 );

	}

);