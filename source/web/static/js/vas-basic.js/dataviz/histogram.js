define(

	// Dependencies
	["jquery", "core/registry","core/base/data_widget" ], 

	/**
	 * This is the default data widget for visualizing a historgram
	 *
 	 * @exports vas-basic/dataviz/histogram
	 */
	function(config, R, DataWidget) {

		/**
		 * The default observable body class
		 */
		var DataVizHistogram = function(hostDOM) {

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
		DataVizHistogram.prototype = Object.create( DataWidget.prototype );

		/**
		 * Set the widget which is hosting the observable parameter information
		 * @param {core/base/tuning_components~observableWidget} widget - The observable widget to display additional information for
		 */
		DataVizHistogram.prototype.setWidget = function( widget ) {

			// Prepare body DOM
			this.bodyDOM.empty();
			this.bodyDOM.append($('<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis laoreet, nibh quis tempor tempus, purus orci egestas metus, at convallis turpis magna in sapien. Aliquam mattis dolor ut tincidunt commodo. Nunc at nisi erat. Quisque pellentesque nisi vel aliquam consequat. Integer condimentum vehicula mattis. Cras molestie aliquam massa vitae cursus. Mauris vel ipsum sodales, sollicitudin est sit amet, porttitor nulla. Etiam pretium pretium tristique. Nunc scelerisque nibh sed imperdiet pharetra. Aenean facilisis pellentesque orci, quis fringilla libero. Praesent nisi mauris, aliquam ac interdum ac, cursus eu enim. Proin eros magna, hendrerit eget mauris ut, dictum rutrum diam. Vivamus consectetur lectus sit amet ante sollicitudin egestas. Quisque nec vestibulum urna. Morbi elementum ornare lacus, vel aliquam nisl feugiat at. Sed id ipsum dictum, blandit urna nec, ullamcorper lectus.</p>'));
			this.bodyDOM.append($('<p>Sed tincidunt metus urna, fermentum accumsan magna tincidunt tempor. Maecenas ac mi enim. Nunc diam nulla, consectetur at erat a, gravida tristique erat. Suspendisse potenti. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Nullam vitae dignissim nibh. Donec sagittis nunc eu mauris semper, ut feugiat lacus molestie.</p>'));
			//this.hostDOM.append($('<p>'+"Information regarding "+JSON.stringify(widget.meta)+'</p>'));

			// Prepare 'more' links
			this.moreLinks.empty();
			var l = $('<a href="do:show-more"><span class="man explain"></span> Explain this ...</a>');
			this.moreLinks.append( l );

		}

		// Store histogram data visualization on registry
		O.registerComponent( 'dataviz.histogram', DataVizHistogram, 1 );

	}

);