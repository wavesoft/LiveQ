define(

	// Dependencies
	["jquery", "core/registry","core/base/data_widget" ], 

	/**
	 * This is the default component for displaying information regarding a knowlege topic
	 *
 	 * @exports vas-basic/infoblock/knowlege
	 */
	function(config, R, DataWidget) {

		/**
		 * The default knowlege body class
		 */
		var KnowlegeBody = function(hostDOM) {

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
		KnowlegeBody.prototype = Object.create( DataWidget.prototype );

		/**
		 * Define the metadata to use for description
		 */
		KnowlegeBody.prototype.onMetaUpdate = function( meta ) {

			// Prepare body DOM
			this.bodyDOM.empty();
			this.bodyDOM.append($('<div>'+meta['info']['shortdesc']+'</div>'));

			// Prepare 'more' links
			this.moreLinks.empty();

			// Put a 'Course' button if we have a course
			if (meta['info']['course']) {
				var l = $('<a href="do:show-more"><span class="uicon uicon-course"></span> Course</a>');
				l.click((function(e) {
					e.preventDefault();
					e.stopPropagation();
					this.trigger('course', meta['info']['course'] );
				}).bind(this));
				this.moreLinks.append( l );
			}

			// Put a 'Tutorial' button if we have a tutorial
			if (meta['info']['tutorial']) {
				var l = $('<a href="do:show-more"><span class="uicon uicon-play"></span> Tutorial</a>');
				l.click((function(e) {
					e.preventDefault();
					e.stopPropagation();
					this.trigger('tutorial', meta['info']['tutorial'] );
				}).bind(this));
				this.moreLinks.append( l );
			}

			// Put an 'explain this' button which triggers the 'explain' event
			if (meta['info']['book']) {
				var l = $('<a href="do:show-more"><span class="uicon uicon-book"></span> Learn More</a>');
				l.click((function(e) {
					e.preventDefault();
					e.stopPropagation();
					this.trigger('explain', meta['info']['book'] );
				}).bind(this));
				this.moreLinks.append( l );
			}
			
			// Put how much credits it costs
			

		}

		// Store tunable infoblock component on registry
		R.registerComponent( 'infoblock.knowlege', KnowlegeBody, 1 );

	}

);