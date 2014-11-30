/**
 * [core/api/chatroom] - Chatroom API
 */
define(["core/api/interface", "core/config"], 

	function(APIInterface, Config) {

		/**
		 * APISocket Chatroom
		 *
		 * @see {@link module:core/api/interface~APIInterface|APIInterface} (Parent class)
		 * @exports core/api/course
		 */
		var APICourseroom = function(apiSocket, course) {

			// Initialize superclass
			APIInterface.call(this, apiSocket);

			// Setup properties
			this.course = course;
			this.active = true;

			// Join course
			this.sendAction('enter', { 'course': course } );

		}

		// Subclass from APIInterface
		APICourseroom.prototype = Object.create( APIInterface.prototype );

		/**
		 * Handle course event
		 */
		APICourseroom.prototype.handleAction = function(action, data) {
			if (!this.active) return;
			console.log("Course action:",action,data);
			if (action == "info") {
				this.trigger('info', data);

			} else if (action == "sync") {
				this.trigger('sync', data);
				
			}
		}

		/**
		 * Close and lock class
		 */
		APICourseroom.prototype.handleClose = function() {
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