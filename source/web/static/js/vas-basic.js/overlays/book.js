define(

	// Dependencies

	["jquery", "core/config", "core/registry","core/base/data_widget", "core/db" ], 

	/**
	 * This is the default component for displaying information regarding a tunable
	 *
 	 * @exports vas-basic/infoblock/tunable
	 */
	function($, Config, R, DataWidget, DB) {

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

			return tab;

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
					var body = $('<div class="content"><h1><span class="glyphicon glyphicon-book"></span> ' + data['info']['title'] + '</h1><div>'+replace_macros(data['info']['description'])+'</div></div>');
					this.createTab(body, 'cs-blue', '<span class="uicon uicon-explain"></span> Description');

					// Place games tab
					if (data['games'] && (data['games'].length > 0)) {
						var games_host = $('<div class="content"></div>'),
							games_iframe = $('<iframe class="split-left" frameborder="0" border=0"></iframe>').appendTo(games_host),
							games_list = $('<div class="split-right list"></div>').appendTo(games_host),
							games_floater = $('<div class="fix-bottom-left"></div>').appendTo(games_host);

						for (var i=0; i<data['games'].length; i++) {
							var game = data['games'][i];
								// Create game label
								game_label = $('<div class="list-item"><div class="title"><span class="uicon uicon-game"></span> '+game['title']+'</div><div class="subtitle">'+game['short']+'</div></div>').appendTo(games_list);
								/*
								color_css = (game['color'] ? '; background-color: '+game['color']+'' : ""),
								a = $('<a target="_blank" class="tile-row" href="'+game['url']+'" title="'+game['title']+'">'+
										'<div class="icon" style="background-image: url('+(game['icon'] || 'static/img/icon-game.png')+')'+color_css+'"></div>'+
										'<div class="text">'+game['title']+'</div></a>'+
									  '</a>');
								*/

							// Activate on click
							(function(game) {

								// Check game type
								var type='url', url = '';
								if (game['type']) type = game['type'];
								if (type == 'redwire') {
									// The EMBED redwire IO parameter
									url = 'http://redwire.io/#/game/'+game['redwireid']+'/embed?bg=#9b59b6';
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