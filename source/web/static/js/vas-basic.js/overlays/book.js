define(

	// Dependencies

	["jquery", "core/registry","core/base/data_widget", "core/db" ], 

	/**
	 * This is the default component for displaying information regarding a tunable
	 *
 	 * @exports vas-basic/infoblock/tunable
	 */
	function(config, R, DataWidget, DB) {

		/**
		 * The default tunable body class
		 */
		var BookBody = function(hostDOM) {

			// Initialize widget
			DataWidget.call(this, hostDOM);

			// Prepare DOM elements
			hostDOM.addClass("overlay-book");
			this.bookDOM = $('<div class="tabs"></div>').appendTo(hostDOM);
			this.bodyDOM = $('<div class="book-body tabs-body"></div>').appendTo(this.bookDOM);
			this.tabsDOM = $('<div class="book-tabs"></div>').appendTo(this.bookDOM);

			// Prepare tabs
			this.tabs = [];
			this.createTab($('<p>This is a test</p>'), "cs-blue", '<span class="uicon uicon-info"></span> Explain' );
			this.createTab($('<p>This is a another test</p>'), "cs-purple", '<span class="uicon uicon-game"></span> Understand' );
			this.createTab($('<p>This is a yet another test</p>'), "cs-green", '<span class="uicon uicon-find"></span> Research' );

			// Prepare error tab
			this.errorTab = $('<div class="tab tab-error"><h1>Error loading book</h1><p>It was not possible to find a book under the specified ID!</p></div>')

		};

		// Subclass from ObservableWidget
		BookBody.prototype = Object.create( DataWidget.prototype );

		/**
		 * Remove all tabs
		 */
		BookBody.prototype.clearTabs = function() {
			this.tabs = [];
			this.bodyDOM.empty();
			this.tabsDOM.empty();
		}

		/**
		 * Define the metadata to use for description
		 */
		BookBody.prototype.createTab = function( content, colorScheme, buttonText, buttonCb ) {
			var tab = $('<div class="tab"></div>'),
				tabBtn = $('<a href="do:show-more" class="'+colorScheme+'">'+buttonText+'</a>'),
				tabID = this.tabs.length;

			// Setup button handlers
			tabBtn.click((function(tabID) {
				return function(e) {
					e.preventDefault();
					e.stopPropagation();
					if (buttonCb) {
						buttonCb();
					} else {
						this.selectTab(tabID);
					}
				}
			})(tabID).bind(this));

			// Append tab content
			tab.append(content);

			// Put everyhing in place
			this.bodyDOM.append(tab);
			this.tabsDOM.append(tabBtn);

			// Activate first, hide others
			if (tabID == 0) {
				tabBtn.addClass("active");
				this.bookDOM.addClass(colorScheme);
			} else {
				tab.hide();
			}

			// Store to tabs
			this.tabs.push({
				'tab': tab,
				'tabBtn': tabBtn,
				'color': colorScheme
			});

		}

		/**
		 * Select one of the specified tab
		 */
		BookBody.prototype.selectTab = function( index ) {
			for (var i=0; i<this.tabs.length; i++) {
				if (i == index) {
					this.tabs[i].tab.show();
					this.tabs[i].tabBtn.addClass('active');
					this.bookDOM.addClass(this.tabs[i]['color']);
				} else {
					this.tabs[i].tab.hide();
					this.tabs[i].tabBtn.removeClass('active');
					this.bookDOM.removeClass(this.tabs[i]['color']);
				}
			}
		}

		/**
		 * Define the metadata to use for description
		 */
		BookBody.prototype.onMetaUpdate = function( meta ) {

			// Remove previous tabs
			this.clearTabs();

			// Get the specified book from database
			var books = DB.openDatabase("books");
			if (!meta['info']['book']) {
				this.bodyDOM.append(this.errorTab);
				return;
			}

			// Load book
			books.get(meta['info']['book'], (function(data, errorMsg) {
				if (data != null) {

					// Place description tab
					var body = $('<div>'+data['info']['description']+'</div>');
					this.createTab(body, 'cs-blue', '<span class="uicon uicon-explain"></span> Description');

					// Place games tab
					if (data['games'] && (data['games'].length > 0)) {
						var games_host = $('<div></div>');
						for (var i=0; i<data['games'].length; i++) {
							var game = data['games'][i],
								color_css = (game['color'] ? '; background-color: '+game['color']+'' : ""),
								a = $('<a target="_blank" class="tile-row" href="'+game['url']+'" title="'+game['title']+'">'+
										'<div class="icon" style="background-image: url('+(game['icon'] || 'static/img/icon-game.png')+')'+color_css+'"></div>'+
										'<div class="text">'+game['title']+'</div></a>'+
									  '</a>');
							games_host.append(a);
						}
						this.createTab(games_host, 'cs-purple', '<span class="uicon uicon-game"></span> Understand');
					}

					// Place resources tab
					if (data['material'] && (data['material'].length > 0)) {
						var material_host = $('<div></div>');
						for (var i=0; i<data['material'].length; i++) {
							var mat = data['material'][i],
								color_css = (mat['color'] ? '; background-color: '+mat['color']+'' : ""),
								a = $('<a target="_blank" class="tile-row" href="'+mat['url']+'" title="'+mat['title']+'">'+
										'<div class="icon" style="background-image: url('+(mat['icon'] || 'static/img/icon-resource.png')+')'+color_css+'"></div>'+
										'<div class="text">'+mat['title']+'</div></a>'+
									  '</a>');
							material_host.append(a);
						}
						this.createTab(material_host, 'cs-green', '<span class="uicon uicon-find"></span> Research');
					}

				} else {

					// Place error tab
					this.bodyDOM.append(this.errorTab);

				}

			}).bind(this));
			
		}

		// Store book infoblock component on registry
		R.registerComponent( 'overlay.book', BookBody, 1 );

	}

);