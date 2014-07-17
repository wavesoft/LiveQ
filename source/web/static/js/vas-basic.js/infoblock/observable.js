define(

	// Dependencies
	["jquery", "core/registry","core/base/data_widget" ], 

	/**
	 * This is the default component for displaying information regarding a observable
	 *
 	 * @exports vas-basic/infoblock/observable
	 */
	function(config, R, DataWidget) {

		/**
		 * The default observable body class
		 */
		var ObservableBody = function(hostDOM) {

			// Initialize widget
			DataWidget.call(this, hostDOM);

			// Prepare infoblock
			hostDOM.addClass("body-more");
			this.bodyDOM = $('<div class="body"></div>');
			this.moreLinks = $('<div class="more"></div>');
			hostDOM.append(this.bodyDOM);
			hostDOM.append(this.moreLinks);

		};

		// Subclass from ObservableWidget
		ObservableBody.prototype = Object.create( DataWidget.prototype );

		/**
		 * Define the metadata to use for description
		 */
		ObservableBody.prototype.onMetaUpdate = function( meta ) {

			// Prepare body DOM
			this.bodyDOM.empty();
			this.bodyDOM.append($('<div>Book #'+meta['info']['book']+' will be loaded here</div>'));

			// Prepare 'more' links
			this.moreLinks.empty();

			// Put a 'pin this' button which triggers the 'pin' event
			var l = $('<a href="do:pin-this"><span class="uicon uicon-pin"></span> Pin this ...</a>');
			l.click((function(e) {
				e.preventDefault();
				e.stopPropagation();
				this.trigger('pin');
			}).bind(this));
			this.moreLinks.append( l );
			
			// Put an 'explain this' button which triggers the 'explain' event
			var l = $('<a href="do:show-more"><span class="uicon uicon-explain"></span> Explain this ...</a>');
			l.click((function(e) {
				e.preventDefault();
				e.stopPropagation();
				this.trigger('explain', meta['info']['book'] );
			}).bind(this));
			this.moreLinks.append( l );

		}

		// Store observable infoblock component on registry
		R.registerComponent( 'infoblock.observable', ObservableBody, 1 );

	}

);