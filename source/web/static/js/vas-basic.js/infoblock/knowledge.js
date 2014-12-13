define(

	// Dependencies
	["jquery", "core/registry","core/base/data_widget", "core/user" ], 

	/**
	 * This is the default component for displaying information regarding a knowledge topic
	 *
 	 * @exports vas-basic/infoblock/knowledge
	 */
	function(config, R, DataWidget, User) {

		/**
		 * The default knowledge body class
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

			// Prepare 'more' links
			this.moreLinks.empty();

			// If it's not enabled show how much credits it costs
			if (!meta['enabled']) {

				// Prepare body DOM
				this.bodyDOM.empty();
				this.bodyDOM.append($('<div>You need to unlock this topic first if you want to see more information!</div>'));

				// Put credits button
				var l = $('<a href="do:show-more"><span class="uicon uicon-money"></span> Unlock for <strong>' + meta['info']['cost'] + '</strong> credits</a>');
				l.click((function(e) {
					e.preventDefault();
					e.stopPropagation();
					this.trigger('unlock', meta['id']);
				}).bind(this));
				this.moreLinks.append( l );

			} else {

				// Prepare body DOM
				this.bodyDOM.empty();
				this.bodyDOM.append($('<div>'+meta['info']['shortdesc']+'</div>'));

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

			}


		}

		// Store tunable infoblock component on registry
		R.registerComponent( 'infoblock.knowledge', KnowlegeBody, 1 );

	}

);