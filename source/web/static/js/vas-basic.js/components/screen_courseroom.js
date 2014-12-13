
define(

	// Requirements
	["jquery", "core/db", "core/ui", "core/config", "core/registry", "core/base/components", "core/apisocket"],

	/**
	 * Basic version of the courseroom screen
	 *
	 * @exports basic/components/screem_courseroom
	 */
	function($, DB, UI, config, R,C, API) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var CourseroomScene = function( hostDOM ) {
			C.CourseroomScene.call(this, hostDOM);

			// Prepare host
			hostDOM.addClass("courseroom");

			// Reset properties
			this.course_id = "";
			this.visible = false;
			this.started = false;
			this.userMap = {};

			// ---------------------------------
			// Create screen
			// ---------------------------------

			// Create presentation monitor
			this.eMonitor = $('<div class="monitor"></div>').appendTo(hostDOM);

			// Create video player
			this.createExplainScreen();

			// Create countdown clock
			this.eCountdown = $('<div class="countdown"></div>').appendTo(this.eMonitor);
			this.eCountTitle = $('<h5>Course starts in</h5>').appendTo(this.eCountdown);
			this.eCountTimer = $('<p>00:00</p>').appendTo(this.eCountdown);

			// ---------------------------------
			// Create amphitheater
			// ---------------------------------

			// Prepare amphitheater
			this.eChairs =  $('<div class="chat-chairs"></div>').appendTo(hostDOM);
			this.eChatBox = $('<div class="chat-box"></div>').appendTo(hostDOM);

			// Setup chatbox
			var chatHost =  $('<div class="chat-input"></div>').appendTo(this.eChatBox);
			this.eInput =   $('<input placeholder="Share your thoughts..." />').appendTo(chatHost);
			this.eSend =    $('<button>Send</button>').appendTo(this.eChatBox);

			// Setup events
			this.eSend.click((function(e) {
				var txt = this.eInput.val();
				this.eInput.val("");
				this.chat.send(txt);
			}).bind(this));
			this.eInput.keypress((function(e) {
				if (e.keyCode == 13) {
					e.preventDefault();
					e.stopPropagation();
					this.eSend.click();
				}
			}).bind(this));

			// Populate chairs
			this.eChairRows = [];
			this.eChairUsers = [];
			this.eChairUsers.push( $('<div class="chat-user"></div>' ).appendTo(this.eChairs) );
			this.eChairRows.push(  $('<div class="chat-row"></div>'  ).appendTo(this.eChairs) );
			this.eChairUsers.push( $('<div class="chat-user"></div>' ).appendTo(this.eChairs) );
			this.eChairRows.push(  $('<div class="chat-row"></div>'  ).appendTo(this.eChairs) );
			this.eChairUsers.push( $('<div class="chat-user"></div>' ).appendTo(this.eChairs) );
			this.eChairRows.push(  $('<div class="chat-row"></div>'  ).appendTo(this.eChairs) );

			// Regenerate user slots
			this.regenRows();

		}
		CourseroomScene.prototype = Object.create( C.CourseroomScene.prototype );

		/**
		 * Initialize procedural presentation video
		 */
		CourseroomScene.prototype.createExplainScreen = function() {

			var com = R.instanceComponent("explain.blackboard", this.eMonitor);

			if (!com) {
				console.warn("CourseroomScene: Unable to ininitalize explain blackboard!");
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
					if (!this.started) return;
					this.trigger('completed');
					this.trigger('sequence.next', 'completed'); // [SEQUENCING]
				}).bind(this));

			}

		}

		////////////////////////////////////////////////////////////////////
		// Helper functions
		////////////////////////////////////////////////////////////////////


		/**
		 * Load explain scene
		 */
		CourseroomScene.prototype.loadAnimation = function(id, cb) {

			// Load animations for the explain scene
			var db = DB.openDatabase("animations");
			db.get(id, (function(doc, err) {
				if (!doc) {
					// TODO: Show error
				} else {
					this.explainComponent.onAnimationUpdated( doc, cb );
					this.explainComponent.onAnimationStop();
				}
			}).bind(this));
			
		}

		/**
		 * Start screen animation
		 */
		CourseroomScene.prototype.playAnimation = function() {
			// Start animation
			this.explainComponent.onAnimationStart();
			// Hide all first-time aids previously shown
			UI.hideAllfirstTimeAids();
			// We are now started
			this.started = true;
		}

		/**
		 * Stop screen animation
		 */
		CourseroomScene.prototype.stopAnimation = function() {
			// We are now stopped
			this.started = false;
			// Stop animation
			this.explainComponent.onAnimationStop();
		}

		/**
		 * Realign rows
		 */
		CourseroomScene.prototype.realignRows = function() {
			for (var i=0; i<this.eChairRows.length; i++) {
				var w = this.eChairRows[i].width();
				this.eChairRows[i].css({
					'left': (this.width - w) / 2
				});
				this.eChairUsers[i].css({
					'left': (this.width - w) / 2
				});
			}
		}

		/**
		 * Regenerate machine layout
		 */
		CourseroomScene.prototype.regenRows = function() {
			var rows = [10,11,12],
				bottom = 64, rowW = 68, rowH = 50;

			// Reset user slots
			this.userSlots = [];

			// Create user slots
			for (var i=rows.length-1; i>=0; i--) {
				this.eChairRows[i].css({
					'width': rowW * rows[i],
					'bottom': bottom
				});
				this.eChairUsers[i].css({
					'width': rowW * rows[i],
					'bottom': bottom
				}).empty();

				// Allocate user information
				for (var j=0; j<rows[i]; j++) {
					var ref = $('<div></div>')
						.css({
							'left': rowW*j,
							'top': 0
						}).hide()
						.click((function() {
							this.showBubble( this.userSlots[parseInt(this.userSlots.length*Math.random())], "Test", "This is some long, long text that could possibly span into multiple lines. Can this thing accommodate this?");
						}).bind(this))
						.appendTo(this.eChairUsers[i])

					// Put user in the slot
					this.userSlots.push(ref);
				}
				bottom += rowH;
			}

			// Realign rows
			this.realignRows();

		}

		/**
		 * Recursively lookup element position
		 */
		CourseroomScene.prototype.elementPosition = function(ref) {
			var pos = { 'left': 0, 'top': 0 }, elm = ref;
			while (true) {
				// Get position
				var p = elm.position();
				if ((p.left == 0) && (p.top == 0)) break;
				pos.left += p.left;
				pos.top += p.top;
				elm = elm.parent();
			}
			return pos;
		}

		/**
		 * Show chat bubble
		 */
		CourseroomScene.prototype.showBubble = function(elm,title,chat) {

			// Create a new chat bubble
			var chatElm = $('<div class="chat_bubble"></div>').appendTo(this.hostDOM);
			$('<strong></strong>').text("["+title+"]: ").appendTo(chatElm);
			$('<span></span>').text(chat).appendTo(chatElm);

			// Align chat bubble
			var pos = this.elementPosition(elm),
				rw = elm.width()
				w = chatElm.width(), h = chatElm.height();
			chatElm.css({
				'left': pos.left + rw/2 - w/2 - 4,
				'top': pos.top - h - 15
			});

			setTimeout(function() {
			chatElm.fadeOut(function() {
				chatElm.dispose();
			})
			}, 5000);
		}

		/**
		 * Enable and allocate a new slot for the given user
		 */
		CourseroomScene.prototype.getUserAvatar = function(user) {
			
			// Check if a slot is already cached
			if (this.userMap[user] != undefined) 
				return this.userSlots[this.userMap[user]];

			// Pick a free slot
			var i = Math.floor( this.userSlots.length * Math.random() );
			for (var j=0; j<this.userSlots.length; j++) {
				if (!this.userSlots[i].is(":visible")) {
					this.userMap[user] = i;
					this.userSlots[i].fadeIn();
					return this.userSlots[i];
				} else {
					if (++i >= this.userSlots.length) i=0;
				}
			}

			// We ran out of space for avatars... sorry :(
			return null;

		}

		/**
		 * Release and free the user
		 */
		CourseroomScene.prototype.freeUserAvatar = function(user) {
			// Check if a slot is already cached
			if (this.userMap[user] != undefined) {
				this.userSlots[this.userMap[user]].fadeOut();
				delete this.userMap[user];
			}
		}

		/**
		 * Set timer value using seconds given
		 */
		CourseroomScene.prototype.setTimer = function(seconds) {
			var	min = String(Math.floor(seconds / 60)),
				sec = String(Math.round(seconds % 60));

			// Prepend zeroes
			if (min.length == 1) min = "0"+min;
			if (sec.length == 1) sec = "0"+sec;

			// Update counter
			this.eCountTimer.text(min+":"+sec);

		}

		/**
		 * Start course timer
		 */
		CourseroomScene.prototype.startCourseTimer = function(seconds) {

			// Set initial value
			var timeLeft = seconds;
			this.setTimer(seconds);

			// Start incrementing
			this.stopCourseTimer();
			this.courseTimer = setInterval((function() {
				timeLeft -= 1;
				this.setTimer(timeLeft);
				if (timeLeft == 0) {
					this.stopCourseTimer();
				}
			}).bind(this), 1000);
		}

		/**
		 * Stop course timer
		 */
		CourseroomScene.prototype.stopCourseTimer = function(seconds) {
			// Stop the interval
			clearInterval(this.courseTimer);
		}

		////////////////////////////////////////////////////////////////////
		// Event handlers
		////////////////////////////////////////////////////////////////////


		/**
		 * Resize courseroom
		 */
		CourseroomScene.prototype.onResize = function(w,h) {
			C.CourseroomScene.prototype.onResize.call(this, w, h);

			// Realign rows
			this.realignRows();

			// Realign viewing screen
			var pad = 5,
				h = this.height - pad*2 - 236 - 5
				w = 800*h/450,
				l = (this.width - w) / 2,
				t = 5;

			// Resize
			this.eMonitor.css({
				'left': l,
				'top': t,
				'width': w,
				'height': h
			});

			// Resize monitor component
			if (this.explainComponent) {
				this.explainComponent.onResize(w,h);
			}

		}

		/**
		 * Define course
		 */
		CourseroomScene.prototype.onCourseDefined = function(course_id) {

			// Store course ID
			// (Will be initialized onWillShow)
			this.course_id = course_id;

		}

		/**
		 * [SEQUENCING] Support sequencing
		 */
		CourseroomScene.prototype.onSequenceConfig = function(config, callback) {
			// Update our course ID
			this.course_id = config['course'];
			callback();
		}

		/**
		 * Initialize scene before showing
		 */
		CourseroomScene.prototype.onWillShow = function(cb) {

			// Reset interface
			this.userMap = {};
			this.started = false;
			for (var i=0; i<this.userSlots.length; i++) {
				this.userSlots[i].hide();
			}

			// Load animation
			this.visible = true;
			this.loadAnimation(this.course_id, (function() {

				// Stop animation
				this.stopAnimation();
				// And be forceful
				setTimeout((function() {
					this.stopAnimation();
				}).bind(this), 500);

				// If we are sure the animation is stopped, launch course config
				setTimeout((function() {

					// Open course & bind events
					var course = this.course = API.openCourse(this.course_id);
					course.on('info', (function(data) { 
						if (!this.visible) return;
						// Fetch course information
						this.startCourseTimer(data['time']);
					}).bind(this));
					course.on('sync', (function(data) { 
						if (!this.visible) return;
						// Start course
						this.eCountdown.fadeOut();
						this.playAnimation();
					}).bind(this));

					// Open chatroom & bind events
					var chat = this.chat = API.openChatroom("course-"+this.course_id);
					chat.on('join', (function(data) {
						// Allocate new avatar on join
						this.getUserAvatar(data['user']);
					}).bind(this));
					chat.on('leave', (function(data) {
						// Release avatar on exit
						this.freeUserAvatar(data['user']);
					}).bind(this));
					chat.on('chat', (function(data) {
						// Show speech bubble on chat
						var user = this.getUserAvatar(data['user']);
						if (user) this.showBubble(user, data['user'], data['message']);
					}).bind(this));

					// Fire callback
					cb();

				}).bind(this));

			}).bind(this));

		}


		/**
		 * Stop and cleanup before exit
		 */
		CourseroomScene.prototype.onWillHide = function(cb) {
			this.stopAnimation();
			this.visible = false;
			cb();
		}

		// Register home screen
		R.registerComponent( "screen.courseroom", CourseroomScene, 1 );

	}

);
