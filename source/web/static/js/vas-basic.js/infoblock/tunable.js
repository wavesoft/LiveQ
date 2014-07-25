define(

	// Dependencies
	["jquery", "core/registry","core/base/data_widget" ], 

	/**
	 * This is the default component for displaying information regarding a tunable
	 *
 	 * @exports vas-basic/infoblock/tunable
	 */
	function(config, R, DataWidget) {

		/**
		 * The default tunable body class
		 */
		var TunableBody = function(hostDOM) {

			// Initialize widget
			DataWidget.call(this, hostDOM);

			// Prepare infoblock
			this.element = $('<div class="body-more"></div>');
			hostDOM.append(this.element);
			this.bodyDOM = $('<div class="body"></div>');
			this.moreLinks = $('<div class="more"></div>');
			this.element.append(this.bodyDOM);
			this.element.append(this.moreLinks);

		};

		// Subclass from ObservableWidget
		TunableBody.prototype = Object.create( DataWidget.prototype );

		/**
		 * Define the metadata to use for description
		 */
		TunableBody.prototype.onMetaUpdate = function( meta ) {

			// Prepare body DOM
			this.bodyDOM.empty();
			this.bodyDOM.append($('<div>Book #'+meta['info']['book']+' will be loaded here</div>'));

			// Prepare 'more' links
			this.moreLinks.empty();

			// Put an 'explain this' button which triggers the 'explain' event
			var l = $('<a href="do:show-more"><span class="uicon uicon-explain"></span> Explain this ...</a>');
			l.click((function(e) {
				e.preventDefault();
				e.stopPropagation();
				this.trigger('explain', meta['info']['book'] );
			}).bind(this));
			this.moreLinks.append( l );
			
		}

		// Store tunable infoblock component on registry
		R.registerComponent( 'infoblock.tunable', TunableBody, 1 );

	}

);