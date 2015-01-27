define(

	// Dependencies

	["jquery", "core/registry","core/base/data_widget", "core/db", "core/analytics/analytics" ], 

	/**
	 * This is the default component for displaying information regarding a tunable
	 *
 	 * @exports vas-basic/infoblock/tunable
	 */
	function(config, R, DataWidget, DB, Analytics) {

		/**
		 * The default tunable body class
		 */
		var BookBody = function(hostDOM) {

			// Initialize widget
			DataWidget.call(this, hostDOM);

			// Prepare infoblock
			this.element = $('<div class="body-more"></div>');
			hostDOM.append(this.element);
			this.bodyDOM = $('<div class="body tabular"></div>');
			this.moreLinks = $('<div class="more"></div>');
			this.element.append(this.bodyDOM);
			this.element.append(this.moreLinks);

			// Local properties
			this.meta = {};

			// Tab array
			this.tabs = [];
			this.currTab = 0;

		};

		// Subclass from ObservableWidget
		BookBody.prototype = Object.create( DataWidget.prototype );

		/**
		 * Remove all tabs
		 */
		BookBody.prototype.clearTabs = function() {
			this.tabs = [];
			this.bodyDOM.empty();
			this.moreLinks.empty();
		}

		/**
		 * Define the metadata to use for description
		 */
		BookBody.prototype.createTab = function( content, button, buttonCb ) {
			var tab = $('<div></div>'),
				tabBtn = $('<a href="do:show-more">'+button+'</a>'),
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
			this.moreLinks.append(tabBtn);

			// Activate first, hide others
			if (tabID == 0) {
				tabBtn.addClass("active");
			} else {
				tab.hide();
			}

			// Store to tabs
			this.tabs.push({
				'tab': tab,
				'tabBtn': tabBtn
			});

		}

		/**
		 * Select one of the specified tab
		 */
		BookBody.prototype.selectTab = function( index ) {

			// Don't re-activate same tab
			if (this.currTab == index) return;

			// Select tab
			for (var i=0; i<this.tabs.length; i++) {
				if (i == index) {
					this.tabs[i].tab.show();
					this.tabs[i].tabBtn.addClass('active');
				} else {
					this.tabs[i].tab.hide();
					this.tabs[i].tabBtn.removeClass('active');
				}
			}


			// Fire tab analytics
			Analytics.fireEvent("book.tab_time", {
				"id": meta['info']['book'],
				"tab": this.currTab,
				"time": Analytics.restartTimer("book-tab")
			});

			// Update current tab
			this.currTab = index;

			// Fire tab change analytic
			Analytics.fireEvent("book.tab_change", {
				"id": meta['info']['book'],
				"tab": this.currTab
			});

		}

		/**
		 * Handle hidden event
		 */
		BookBody.prototype.onHidden = function() {
			if (!this.meta) return;

			// Fire tab analytics
			Analytics.fireEvent("book.tab_time", {
				"id": meta['info']['book'],
				"tab": this.currTab,
				"time": Analytics.stopTimer("book-tab")
			});

			// Fire book analytics
			Analytics.fireEvent("book.time", {
				"id": meta['info']['book'],
				"time": Analytics.stopTimer("book")
			});
			Analytics.fireEvent("book.hide", {
				"id": meta['info']['book'],
			});

		}

		/**
		 * Define the metadata to use for description
		 */
		BookBody.prototype.onMetaUpdate = function( meta ) {

			// Remove previous tabs
			this.clearTabs();
			this.meta = meta;

			// Get the specified book from database
			var books = DB.openDatabase("books");
			books.get(meta['info']['book'], (function(data, errorMsg) {
				if (data != null) {

					// Place description tab
					var body = $('<div>'+data['info']['short']+'</div>');
					this.createTab(body, '<span class="uicon uicon-explain"></span> Description');

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
						this.createTab(games_host, '<span class="uicon uicon-game"></span> Understand');
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
						this.createTab(material_host, '<span class="uicon uicon-find"></span> Research');
					}

				} else {

					// Place error tab
					var body = $('<div>Could not find book #'+meta['info']['book']+' in the database!</div>');
					this.createTab(body, '<span class="uicon uicon-warning"></span> Error &nbsp;');

				}

				// Select first tab
				this.selectTab(0);

				// Initial analytics setup
				Analytics.restartTimer("book");
				Analytics.restartTimer("book-tab");
				Analytics.fireEvent("book.show", {
					"id": meta['info']['book']
				});

			}).bind(this));
		
			
		}

		// Store book infoblock component on registry
		R.registerComponent( 'infoblock.book', BookBody, 1 );

	}

);