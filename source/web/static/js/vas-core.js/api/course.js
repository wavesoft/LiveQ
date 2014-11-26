/**
 * [core/api/chatroom] - Chatroom API
 */
define(["core/util/event_base", "core/config"], 

	function(EventBase, Config) {

		/**
		 * APISocket Chatroom
		 */
		var APICourseroom = function(apiSocket, course) {

			// Initialize superclass
			EventBase.call(this);

			// Setup properties
			this.apiSocket = apiSocket;
			this.course = course;
			this.active = true;

			// Join course
			this.apiSocket.send('course.enter', { 'course': course } );

		}

		// Subclass from EventBase
		APICourseroom.prototype = Object.create( EventBase.prototype );

		/**
		 * Handle course event
		 */
		APICourseroom.prototype.handleAction = function(action, data) {
			if (!this.active) return;
			console.log("Course action:",action,data);
			if (action == "course.info") {
				this.trigger('info', data);
			} else if (action == "course.sync") {
				this.trigger('sync', data);
			}
		}

		/**
		 * Close and lock class
		 */
		APICourseroom.prototype.close = function() {
			// Prohibit any furher usage
			if (!this.active) return;
			this.active = false;

			// Leave course
			this.apiSocket.send('course.leave');

			// Fire close event
			this.trigger('close');
		}

		// Return the Chatroom class
		return APICourseroom;

	}

);