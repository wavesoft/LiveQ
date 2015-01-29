define(

	// Dependencies

	["jquery", "core/config", "core/registry","core/base/data_widget", "core/db", "core/analytics/analytics" ], 

	/**
	 * This is the default component for displaying information regarding a tunable
	 *
 	 * @exports vas-basic/infoblock/tunable
	 */
	function($, Config, R, DataWidget, DB, Analytics) {

		/**
		 * Replace book macros (helpers for specifying images in the description)
		 */
		function replace_macros(body) {
			var text = body;
			// Replace macros
			text = text.replace(/\${images}/gi, Config.images_url);
			// Return text
			return text;
		}

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
			this.coverage = [];
			this.currTab = 0;
			this.createTab($('<p>This is a test</p>'), "cs-blue", '<span class="uicon uicon-info"></span> Explain' );
			this.createTab($('<p>This is a another test</p>'), "cs-purple", '<span class="uicon uicon-game"></span> Understand' );
			this.createTab($('<p>This is a yet another test</p>'), "cs-green", '<span class="uicon uicon-find"></span> Research' );

			// Prepare error tab
			this.errorTab = $('<div class="tab tab-error"><h1>Error loading book</h1><p>It was not possible to find a book under the specified ID!</p></div>')

			// Prpare properties
			this.meta = null; 

		};

		// Subclass from ObservableWidget
		BookBody.prototype = Object.create( DataWidget.prototype );

		/**
		 * Remove all tabs
		 */
		BookBody.prototype.clearTabs = function() {
			this.tabs = [];
			this.coverage = [];
			this.currTab = 0;
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
			this.coverage.push(0);

			return tab;

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
					this.bookDOM.addClass(this.tabs[i]['color']);
				} else {
					this.tabs[i].tab.hide();
					this.tabs[i].tabBtn.removeClass('active');
					this.bookDOM.removeClass(this.tabs[i]['color']);
				}
			}

			// Fire tab analytics
			Analytics.fireEvent("book.tab_metrics", {
				"id": this.meta['info']['book'],
				"tab": this.currTab,
				"time": Analytics.restartTimer("book-tab"),
				"coverage": this.coverage[this.currTab]
			});

			// Update current tab
			this.currTab = index;

			// Fire tab change analytic
			Analytics.fireEvent("book.tab_change", {
				"id": this.meta['info']['book'],
				"tab": this.currTab
			});

		}

		/**
		 * Handle hidden event
		 */
		BookBody.prototype.onHidden = function() {
			if (!this.meta) return;

			// Fire tab analytics
			Analytics.fireEvent("book.tab_metrics", {
				"id": this.meta['info']['book'],
				"tab": this.currTab,
				"time": Analytics.stopTimer("book-tab"),
				"coverage": this.coverage[this.currTab]
			});

			// Fire book analytics
			Analytics.fireEvent("book.hide", {
				"id": this.meta['info']['book'],
				"time": Analytics.stopTimer("book")
			});

		}

		/**
		 * Define the metadata to use for description
		 */
		BookBody.prototype.onMetaUpdate = function( meta ) {
			var self = this;

			// Remove previous tabs
			this.clearTabs();

			// Get the specified book from database
			var books = DB.openDatabase("books");
			if (!meta['info']['book']) {
				this.bodyDOM.append(this.errorTab);
				return;
			}

			// Store meta
			this.meta = meta;

			// Load book
			books.get(meta['info']['book'], (function(data, errorMsg) {
				if (data != null) {

					// Place description tab
					var body = $('<div class="content"><h1><span class="glyphicon glyphicon-book"></span> ' + data['info']['title'] + '</h1><div>'+replace_macros(data['info']['description'])+'</div></div>');
					this.createTab(body, 'cs-blue', '<span class="uicon uicon-explain"></span> Description');

					// Handle body analytics
					body.scroll((function(e) {

						// Update page coverage
						var scrollHeight = e.currentTarget.scrollHeight - $(e.currentTarget).height() - parseFloat($(e).css("padding-top")) - parseFloat($(e).css("padding-bottom"));
							currCoverage = e.currentTarget.scrollTop / scrollHeight;
						if (currCoverage > this.coverage[0]) {
							this.coverage[0] = currCoverage;
						}

					}).bind(this));

					// Place games tab
					if (data['games'] && (data['games'].length > 0)) {
						var games_host = $('<div class="content"></div>'),
							games_iframe = $('<iframe class="split-left" frameborder="0" border=0"></iframe>').appendTo(games_host),
							games_list = $('<div class="split-right list"></div>').appendTo(games_host),
							games_floater = $('<div class="fix-bottom-left"></div>').appendTo(games_host);

						// Games coverage calculation
						var gamesSeen = [];

						for (var i=0; i<data['games'].length; i++) {
							var game = data['games'][i];
								// Create game label
								game_label = $('<div class="list-item"><div class="title"><span class="uicon uicon-game"></span> '+game['title']+'</div><div class="subtitle">'+game['short']+'</div></div>').appendTo(games_list);

							// Activate on click
							(function(game) {

								// Check game type
								var type='url', url = '';
								if (game['type']) type = game['type'];
								if (type == 'redwire') {
									// The EMBED redwire IO parameter
									url = 'http://redwire.io/#/game/'+game['redwireid']+'/embed?backgroundColor=%23000000';
								} else {
									// Otherwise, expect to find 'url' parameter
									url = game['url'];
								}								

								// Register label click
								game_label.click(function() {
									games_list.find(".list-item").removeClass("active");
									$(this).addClass("active");
									games_iframe.attr("src", url);

									// Update floater
									if (type == 'redwire') {
										games_floater.html('<a href="http://redwire.io/#/game/'+game['redwireid']+'/edit" target="_blank"><img src="http://redwire.io/assets/images/ribbon.png" style="border:none; width: 100%"></a>');
									} else {
										games_floater.empty();
									}

									// Update coverage
									if (gamesSeen.indexOf(url) == -1) {
										gamesSeen.push(url);
										self.coverage[1] = gamesSeen.length / data['games'].length;
									}

								});
							})(game);

						}
						this.createTab(games_host, 'cs-purple', '<span class="uicon uicon-game"></span> Understand')
							.addClass("tab-noscroll").addClass("tab-fullheight");

						// Click on the first item
						games_list.find(".list-item:first-child").click();
					}

					// Place resources tab
					if (data['material'] && (data['material'].length > 0)) {
						var material_host = $('<div class="content"></div>'),
							material_iframe = $('<iframe class="split-left" frameborder="0" border=0"></iframe>').appendTo(material_host),
							material_list = $('<div class="split-right list"></div>').appendTo(material_host),
							material_floater = $('<div class="fix-bottom-left"></div>').appendTo(material_host);

						// material coverage calculation
						var materialSeen = [];

						for (var i=0; i<data['material'].length; i++) {
							var mat = data['material'][i],
								// Create material label
								mat_label = $('<div class="list-item"><div class="title"><span class="uicon uicon-find"></span> '+mat['title']+'</div><div class="subtitle">'+mat['short']+'</div></div>').appendTo(material_list);

							// Activate on click
							(function(mat) {

								// Register label click
								mat_label.click(function() {
									material_list.find(".list-item").removeClass("active");
									$(this).addClass("active");
									material_iframe.attr("src", mat['url']);

									// Update coverage
									if (materialSeen.indexOf(mat['url']) == -1) {
										materialSeen.push(mat['url']);
										self.coverage[2] = materialSeen.length / data['material'].length;
									}

								});
							})(mat);

							/*
								color_css = (mat['color'] ? '; background-color: '+mat['color']+'' : ""),
								a = $('<a target="_blank" class="tile-row" href="'+mat['url']+'" title="'+mat['title']+'">'+
										'<div class="icon" style="background-image: url('+(mat['icon'] || 'static/img/icon-resource.png')+')'+color_css+'"></div>'+
										'<div class="text">'+mat['title']+'</div></a>'+
									  '</a>');
							material_host.append(a);
							*/
						}

						// Create tab
						this.createTab(material_host, 'cs-green', '<span class="uicon uicon-find"></span> Research')
							.addClass("tab-noscroll").addClass("tab-fullheight");
							
						// Click on the first item
						material_list.find(".list-item:first-child").click();

					}

					// Initial analytics setup
					Analytics.restartTimer("book");
					Analytics.restartTimer("book-tab");
					Analytics.fireEvent("book.show", {
						"id": meta['info']['book']
					});

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