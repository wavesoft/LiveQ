
define(

	// Requirements
	["jquery", "d3", "core/db", "core/ui", "core/config", "core/registry", "core/base/components", "core/user"],

	/**
	 * Basic version of the home screen
	 *
	 * @exports basic/components/explain_screen
	 */
	function($, d3, DB, UI, config, R,C, User) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var ExplainScreen = function( hostDOM ) {
			C.ExplainScreen.call(this, hostDOM);

			// Local properties
			this.topicInfo = null;
			this.taskBtn = [];
			this.activeTask = 0;

			// Prepare host
			hostDOM.addClass("explain");

			// Create a slpash backdrop
			this.backdropDOM = $('<div class="'+config.css['backdrop']+'"></div>');
			hostDOM.append(this.backdropDOM);
			this.backdrop = R.instanceComponent("backdrop.explain", this.backdropDOM);

			// Create foreground
			this.foregroundDOM = $('<div class="'+config.css['foreground']+' fullscreen"></div>');
			hostDOM.append(this.foregroundDOM);

			// Create host element where to place the explain screen
			this.elmWindow = $('<div class="explain-window cs-green"></div>').appendTo(this.foregroundDOM);
			var elmHeader = $('<div class="explain-header">').appendTo(this.elmWindow);
			this.elmIcon = $('<div class="icon" style="background-image: url(static/img/level-icons/pdfs.png);"></div>').appendTo(elmHeader);
			this.elmTitle = $('<h1>Level Title</h1>').appendTo(elmHeader);
			this.elmSubtitle = $('<p class="subtitle">Level Title</p>').appendTo(elmHeader);
			this.elmScreen = $('<div class="explain-screen"></div>').appendTo(this.elmWindow);
			this.elmFooter = $('<div class="explain-footer"></div>').appendTo(this.elmWindow);
			this.elmPopup = $('<div class="explain-popup"></div>').appendTo(this.elmWindow);
			this.elmPopupBody = $('<div></div>').appendTo(this.elmPopup);
			this.elmPopupFooter = $('<div class="btn-host"></div>').appendTo(this.elmPopup);

			// Setup click handlers to hide when clicking on empty space
			this.elmWindow.click((function(e) {
				e.stopPropagation();
				e.preventDefault();
			}).bind(this));
			this.foregroundDOM.click((function(e) {
				this.trigger('hideExplain');
			}).bind(this));

			// Hide popup by default
			this.elmPopup.hide();

			// Create buttons on footer
			/*
			this.btnExplain = $('<div class="footer-btn"><span class="uicon uicon-explain"></span> Explain</div>').appendTo(this.elmFooter);
			this.btnLearn = $('<div class="footer-btn"><span class="uicon uicon-info"></span> Learn</div>').appendTo(this.elmFooter);
			this.btnUnderstand = $('<div class="footer-btn"><span class="uicon uicon-game"></span> Understand</div>').appendTo(this.elmFooter);
			this.btnResearch = $('<div class="footer-btn"><span class="uicon uicon-find"></span> Research</div>').appendTo(this.elmFooter);
			*/

			// Level buttons
			var levelBtn;
			levelBtn = $('<a href="#" class="btn-level">1</a>').appendTo(this.elmFooter);
			levelBtn = $('<a href="#" class="btn-level">2</a>').appendTo(this.elmFooter);
			levelBtn = $('<a href="#" class="btn-level">3</a>').appendTo(this.elmFooter);

			// Action buttons
			var actionBtn;
			actionBtn = $('<a href="#" class="btn-do"><span class="uicon uicon-find"></span></a>').appendTo(this.elmPopupFooter);
			actionBtn = $('<a href="#" class="btn-do"><span class="uicon uicon-play-media"></span></a>').appendTo(this.elmPopupFooter);
			actionBtn = $('<a href="#" class="btn-do"><span class="uicon uicon-play"></span></a>').appendTo(this.elmPopupFooter);


			// Initialize explain screen
			this.createExplainScreen();

		}
		ExplainScreen.prototype = Object.create( C.ExplainScreen.prototype );

		/**
		 * Load explain scene
		 */
		ExplainScreen.prototype.loadAnimation = function(id, cb) {

			// Load animations for the explain scene
			var db = DB.openDatabase("animations");
			db.get(id, (function(doc, err) {
				if (!doc) {
					// TODO: Show error
				} else {
					this.explainComponent.onAnimationUpdated( doc, cb );
				}
			}).bind(this));
			
		}

		/**
		 * Start screen animation
		 */
		ExplainScreen.prototype.playAnimation = function() {
			// Hide popup
			this.elmPopup.fadeOut();
			// Start animation
			this.explainComponent.onAnimationStart();
		}

		/**
		 * Stop screen animation
		 */
		ExplainScreen.prototype.stopAnimation = function() {
			this.explainComponent.onAnimationStop();
		}

		/**
		 * Setup screen
		 */
		ExplainScreen.prototype.createExplainScreen = function() {
			this.elmScreen.addClass("cs-blackboard");

			var explainBlackboard = $('<div></div>').appendTo(this.elmScreen),
				com = R.instanceComponent("explain.blackboard", explainBlackboard);

			if (!com) {
				console.warn("ExplainScreen: Unable to ininitalize explain blackboard!");
				explainBlackboard.remove();
				return;
			} else {

				// Initialize component
				this.explainComponent = com;

				// Adopt & Forward events
				this.forwardVisualEvents( com );
				this.adoptEvents( com );

				// Handle events
				com.on('animationCompleted', (function() {

					// Show pop-up
					this.elmPopup.fadeIn();

					// Let database know that the user has seen this animation
					if (!this.topicInfo.taskDetails[this.activeTask].seen_intro) {

						// Mark as seen & update DB
						this.topicInfo.taskDetails[this.activeTask].seen_intro = true;
						User.setTaskAnimationAsSeen( this.topicInfo.taskDetails[this.activeTask]['_id'] );

					}

				}).bind(this));

			}

		}

		/**
		 * Forward ExplainScreen events to our child components
		 */
		ExplainScreen.prototype.onResize = function(w,h) {
			this.width = w;
			this.height = h;

			var winW = $(this.elmWindow).width(),
				winH = $(this.elmWindow).height();

			// Realign window
			this.elmWindow.css({
				'left': (w - winW) / 2,
				'top': (h - winH) / 2
			});
		}

		/**
		 * Pause fore before exiting
		 */
		ExplainScreen.prototype.onHidden = function() {
		}

		/**
		 * Update level status 
		 */
		ExplainScreen.prototype.onWillShow = function(cb) {
			cb();
		}

		/**
		 * Update topic information
		 */
		ExplainScreen.prototype.onTopicUpdated = function(topic_info) {

			// Store topic info
			this.topicInfo = topic_info;

			// Update title
			this.elmTitle.text(topic_info['info']['title']);
			this.elmSubtitle.html(topic_info['info']['desc']);

			// Regenerate task buttons
			this.elmFooter.empty();
			this.taskBtn = [];
			this.activeTask = 0;
			for (var i=0; i<topic_info.taskDetails.length; i++) {
				var task = topic_info.taskDetails[i],
					taskBtn = $('<a href="#" class="btn-level">'+(i+1)+'</a>');

				// Stop creating buttons when we reached a disabled task
				this.activeTask = i;
				if (!task.enabled) return;

				// Setup hooks
				taskBtn.click((function(index) {
					return function(e) {
						this.selectTask(index);
					}
				})(i).bind(this));

				// Put button on footer
				this.elmFooter.append( taskBtn );
				this.taskBtn.push( taskBtn );

			}

			// Select active task
			this.selectTask( this.activeTask );

		}

		/**
		 * Select a task
		 */
		ExplainScreen.prototype.selectTask = function(index) {

			// Activate/blur buttons
			for (var i=0; i<this.taskBtn.length; i++) {
				if (i < index) {
					this.taskBtn[i].removeClass("active");
					this.taskBtn[i].addClass("blur");
				} else if (i == index) {
					this.taskBtn[i].removeClass("blur");
					this.taskBtn[i].addClass("active");
				} else {
					this.taskBtn[i].removeClass("blur active");
				}
			}

			// Get task details
			var task = this.topicInfo.taskDetails[index];
			if (!task) return;

			// Populate pop-up window
			this.elmPopupBody.empty();
			this.elmPopupBody.append($('<h2>'+task['info']['title']+'</h2>'));
			this.elmPopupBody.append($('<div>'+task['info']['desc']+'</div>'));

			// Create pop-up window buttons
			this.elmPopupFooter.empty();
			var btnReplay = $('<a href="#" class="btn-do"><span class="uicon uicon-play-media"></span></a>')
								.appendTo(this.elmPopupFooter)
								.click((function(e) {
									this.playAnimation();
								}).bind(this));
			var btnStart = $('<a href="#" class="btn-do"><span class="uicon uicon-play"></span></a>')
								.appendTo(this.elmPopupFooter)
								.click((function(e) {
									this.trigger("startTask", task['_id']);
								}).bind(this));


			// Check if we have seen the animation
			if (task.seen_intro) {
				// If yes, show the pop-up window
				this.elmPopup.show();
			} else {
				// If no, start the animation
				this.loadAnimation( task['info']['animation'], (function() {
					this.playAnimation();
				}).bind(this));
			}

		}

		// Register home screen
		R.registerComponent( "screen.explain", ExplainScreen, 1 );

	}

);