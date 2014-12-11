
define(

	// Requirements
	["jquery", "core/db", "core/ui", "core/config", "core/registry", "core/base/component", "core/apisocket"],

	/**
	 * Basic version of the menu screen
	 *
	 * @exports basic/components/screem_menu
	 */
	function($, DB, UI, config, R, Component, API) {

		/**
		 * @class
		 * @classdesc The basic menu screen
		 */
		var MenuScreen = function( hostDOM ) {
			Component.call(this, hostDOM);

			// Prepare host
			hostDOM.addClass("menu");

			// Team header
			//this.eHeader = $('<h1><span class="highlight">Game</span> Menu</h1><div class="subtitle">From here you can select miscelaneous actions.</div>').appendTo(hostDOM);
			this.eBackdrop = $('<div class="backdrop"></div>').appendTo(hostDOM);

			// ----------------------------
			//  Buttons
			// ----------------------------

			this.btnMachine = $('<div class="menu-button b-machine"><div class="title">Quantum Machine</div></div>').appendTo(this.hostDOM)
				.click((function() {
					this.trigger('showMachine');
				}).bind(this));
			this.btnJobs = $('<div class="menu-button b-jobs"><div class="title">Validation Jobs</div></div>').appendTo(this.hostDOM)
				.click((function() {
					this.trigger('showJobs');
				}).bind(this));
			this.btnTeam = $('<div class="menu-button b-team"><div class="title">Your Team</div></div>').appendTo(this.hostDOM)
				.click((function() {
					this.trigger('showTeam');
				}).bind(this));
			this.btnTeam = $('<div class="menu-button b-knowledge"><div class="title">Knowledge Grid</div></div>').appendTo(this.hostDOM)
				.click((function() {
					this.trigger('showKnowledge');
				}).bind(this));

			// ----------------------------
			//  Public Chatroom
			// ----------------------------

			// Prepare achievements panel
			this.eChatroomHost = $('<div class="discussions panel-top"></div>').appendTo(hostDOM);
			this.eChatroomLabel = $('<div class="title">Discussions</div>').appendTo(this.eChatroomHost);
			this.eForumDiv = $('<div class="content"></div>').appendTo(this.eChatroomHost);
			this.eForumIframe = $('<iframe src="http://test4theory.cern.ch/forum/index.php"></div>').appendTo(this.eForumDiv);

			// Setup chatroom
			this.eChatroomLabel.click((function() {
				this.eChatroomHost.toggleClass("expanded");
				this.eAchievementsHost.toggleClass("hidden");
			}).bind(this));

			// ----------------------------
			//  Achievements
			// ----------------------------

			// Prepare achievements panel
			this.eAchievementsHost = $('<div class="achievements panel-bottom"></div>').appendTo(hostDOM);
			this.eAchievementsLabel = $('<div class="title">Achievements</div>').appendTo(this.eAchievementsHost);
			this.eAchievementsContainer = $('<div class="content"></div>').appendTo(this.eAchievementsHost);

			// Setup acievements
			this.eAchievementsLabel.click((function() {
				this.eAchievementsHost.toggleClass("expanded");
				this.eChatroomHost.toggleClass("hidden");
			}).bind(this));

			// Optimzize
			for (var i=0; i<10; i++) {
				$('<div></div>').appendTo(this.eAchievementsContainer);
			}

			// ----------------------------
			//  Background colors
			// ----------------------------

			// Create a random color
			var random_color = function(a) {
				return "rgba("
					+ Math.round(Math.random() * 255) + ","
					+ Math.round(Math.random() * 255) + ","
					+ Math.round(Math.random() * 255) + ","
					+ a + ")";
			};

			// Create a set of bubbles
			this.bubbles = [];
			for (var i=0; i<50; i++) {
				var bubble = $('<div class="bubble"></div>').appendTo(this.eBackdrop),
					sz = 20 + (Math.random()*30);
				bubble.css({
					'left': (Math.random() * 100) + "%",
					 'top': (Math.random() * 100) + "%",
		'background-color': random_color(0.1 + Math.random() * 0.2),
				   'width': sz,
				  'height': sz
				});
			}


		}
		MenuScreen.prototype = Object.create( Component.prototype );

		// Handle resize events
		MenuScreen.prototype.onResize = function(w,h) {
			this.width = w;
			this.height = h;
			this.eForumIframe.attr({
				'width': this.eForumDiv.width(),
				'height': this.eForumDiv.height(),
			});
		}

		// Resize on shown
		MenuScreen.prototype.onShown = function() {
			this.eForumIframe.attr({
				'width': this.eForumDiv.width(),
				'height': this.eForumDiv.height(),
			});
		}


		// Register home screen
		R.registerComponent( "screen.menu", MenuScreen, 1 );

	}

);
