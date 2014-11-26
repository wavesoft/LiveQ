
define(

	// Requirements
	["jquery", "core/ui", "core/config", "core/registry", "core/base/components", "core/apisocket"],

	/**
	 * Basic version of the courseroom screen
	 *
	 * @exports basic/components/screem_courseroom
	 */
	function($, UI, config, R,C, API) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var CourseroomScene = function( hostDOM ) {
			C.CourseroomScene.call(this, hostDOM);

			// Prepare host
			hostDOM.addClass("courseroom");

			// Prepare amphitheater
			this.eMonitor = $('<div class="monitor"></div>').appendTo(hostDOM);
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
			},1000);
		}

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

		}

		/**
		 * 
		 */
		CourseroomScene.prototype.onCourseDefined = function(course_id) {

			// Open course & bind events
			var course = this.course = API.openCourse(course_id);
			course.on('info', (function(details) { 

			}).bind(this));
			course.on('sync', (function(details) { 

			}).bind(this));

			// Open chatroom & bind events
			var chat = this.chat = API.openChatroom("course-"+course_id);
			chat.on('join', (function(details) { 

			}).bind(this));
			chat.on('leave', (function(details) { 

			}).bind(this));
			chat.on('chat', (function(details) { 

			}).bind(this));

		}

		// Register home screen
		R.registerComponent( "screen.courseroom", CourseroomScene, 1 );

	}

);
