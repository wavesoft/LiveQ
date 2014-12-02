/**
 * [core/api/account] - Account API
 */
define(["core/api/interface", "core/config"], 

	function(APIInterface, Config) {

		/**
		 * APISocket Account
		 *
		 * This socket manages the user account information, such as session management,
		 * profile information and progress-state information.
		 *
		 * @see {@link module:core/api/interface~APIInterface|APIInterface} (Parent class)
		 * @exports core/api/account
		 */
		var APIAccount = function(apiSocket) {

			// Initialize superclass
			APIInterface.call(this, apiSocket);

		}

		// Subclass from APIInterface
		APIAccount.prototype = Object.create( APIInterface.prototype );

		/**
		 * Perform login 
		 */
		APIAccount.prototype.login = function(username, password, callback) {

			// Log-in user and fire callback when logged in
			this.sendAction("login", {
				'username': username,
				'password': password
			}, callback);
			
		}

		/**
		 * Perform login 
		 */
		APIAccount.prototype.register = function(profile, callback) {

			// Log-in user and fire callback when logged in
			this.sendAction("register", {
				'profile': profile
			}, callback);
			
		}

		/**
		 * Send user variables 
		 */
		APIAccount.prototype.sendVariables = function(vars) {

			// Log-in user and fire callback when logged in
			this.sendAction("variables", {
				'vars': vars
			});
			
		}

		/**
		 * Handle chatroom event
		 */
		APIAccount.prototype.handleAction = function(action, data) {
			if (!this.active) return;
			console.log("Profile action:",action,data);

			if (action == "profile") { /* Profile information arrived */
				this.trigger('profile', data);

			}
		}

		// Return the Chatroom class
		return APIAccount;

	}

);