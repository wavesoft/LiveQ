/**
 * [core/main] - Core initialization module
 */
define(["core/config", "core/db", "core/apisocket"], 

	function(Config, DB, APISocket) {

		/**
		 * Database interface
		 *
		 * @class
		 * @exports core/user
		 */
		var User = {
			// Static profile variables
			'profile' 	: { },
			// Dynamic variables
			'vars' 		: { }
		};

		/**
		 * Enable/disable editing of the interface
		 */
		//User.enableIPIDE = true;
		//$("body").addClass("enable-ipide")

		/**
		 * Login and initialize user record
		 *
		 * @param {Object} params - A dictionary that contains the 'username' and 'password' fields.
		 * @param {function(status)} callback - A callback function to fire when the login-process has completed
		 */
		User.login = function(params, callback) {

			// Try to log-in the user
			APISocket.login(params['username'], params['password'], (function(profile, errorMsg) {
				
				// If something went wrong, fire error callback
				if (!profile) {
					if (callback) callback(false, errorMsg);
					return;
				}

				// Otherwise process uer record
				this.profile = profile;
				this.vars = profile['vars'];
				this.initialize();

				// Fire callback
				if (callback) callback(true);

			}).bind(this));

		}

		/**
		 * Login and initialize user record
		 *
		 * @param {Object} params - A dictionary that contains the 'username', 'password', 'email' and 'name' fields.
		 * @param {function(status)} callback - A callback function to fire when the register-process has completed
		 */
		User.register = function(params, callback) {

			// Try to register-in the user
			DB.createUser(params, (function(status, errorMsg) {
				
				// If something went wrong, fire error callback
				if (!status) {
					if (callback) callback(false, errorMsg);
					return;
				}

				// Otherwise process uer record
				this.initialize();

				// Fire callback
				if (callback) callback(true);

			}).bind(this));

		}

		/**
		 * Initialize the user record 
		 *
		 * This function fetches the database user record and prepares the local fields.
		 */
		User.initialize = function() {

			// Create enabled_topics if missing
			if (!this.vars['enabled_topics'])
				this.vars['enabled_topics'] = {};

			// Create per-task user details
			if (!this.vars['task_details'])
				this.vars['task_details'] = {};

			// Create first-time pop-up status
			if (!this.vars['first_time'])
				this.vars['first_time'] = {};

		}

		/**
		 * Commit user variables to the database
		 */
		User.commitUserRecord = function() {
			// Commit user variables
			APISocket.send( "user.variables", {
				'vars': this.vars
			});
		}

		/**
		 * Build and return the user's task information tree
		 */
		User.getTaskDetails = function( task_id ) {
			var db_task = DB.cache['tasks'][task_id],
				u_task  = this.vars['task_details'][task_id];

			// Check if the entire record is missing
			if (!db_task) return null;

			// Populate additional fields
			if (!u_task) {
				this.vars['task_details'][task_id] = u_task = {
					'enabled': false,
					'seen_intro': false,
					'save': [null,null,null,null]
				}
			}

			// Update db_task fields
			db_task['enabled'] = u_task['enabled'];
			db_task['seen_intro'] = u_task['seen_intro'];
			db_task['save'] = u_task['save'];

			// Return data
			return db_task;

		}

		/**
		 * Build and return the user's topic information
		 */
		User.getTopicDetails = function( topic_id ) {
			var topic = DB.cache['topic_index'][topic_id];
			if (!topic) return;

			// Fetch task information for this topic
			var taskDetails = [];
			for (var i=0; i<topic.tasks.length; i++) {
				// Collect task details
				taskDetails.push( User.getTaskDetails(topic.tasks[i]) );
				// The first one is always enabled
				if (i==0) taskDetails[0].enabled = true;
			}

			// Update task details
			topic.taskDetails = taskDetails;
			return topic;
		}

		/**
		 * Build and return the user's topic information tree
		 */
		User.getTopicTree = function() {

			// Prepare nodes and links
			var nodes = [],
				links = [],
				node_id = {};

			// Traverse nodes
			var traverse_node = (function(node, parent) {

				// Skip invisible nodes
				if ((parent != null) && !this.vars['enabled_topics'][node['_id']])
					return;

				// Store to nodes & it's lookup
				var curr_node_id = nodes.length;
				node_id[node['_id']] = curr_node_id;
				nodes.push( node );

				// Check if we should make a link
				if (parent != null) {
					var parent_id = node_id[parent['_id']];
					links.push({ 'source': curr_node_id, 'target': parent_id });
				}

				// Traverse child nodes
				for (var i=0; i<node.children.length; i++) {
					traverse_node( node.children[i], node );
				}

			}).bind(this);

			// Start node traversal
			traverse_node( DB.cache['topic_root'], null );

			// Return the tree data
			return {
				'nodes': nodes,
				'links': links
			};

		}

		/**
		 * Grant user access to the specified topic
		 */
		User.enableChildTopics = function(topic_id) {

			// Lookup children
			var topic = DB.cache['topic_index'][topic_id];
			for (var i=0; i<topic.children.length; i++) {
				// Grant access to the given topic
				this.vars['enabled_topics'][topic.children[i]['_id']] = 1;
			}

			// Commit changes
			this.commitUserRecord();

		}

		/**
		 * Get the save slots for the tasks
		 */
		User.getTaskSaveSlots = function(task) {

			// Make sure data exist
			if (!this.vars['task_details'][task_id])
				this.vars['task_details'][task_id] = {};
			if (!this.vars['task_details'][task_id]['save'])
				this.vars['task_details'][task_id]['save'] = [null,null,null,null];

			// Return save slot info
			return this.vars['task_details'][task_id]['save'];

		}

		/**
		 * Update the save slot of a particular task
		 */
		User.setTaskSaveSlot = function(task_id, slot, data) {
			
			// Make sure data exist
			if (!this.vars['task_details'][task_id])
				this.vars['task_details'][task_id] = {};
			if (!this.vars['task_details'][task_id]['save'])
				this.vars['task_details'][task_id]['save'] = [null,null,null,null];

			// Wrap slot index
			if (slot<0) slot=0;
			if (slot>3) slot=3;

			// Update slot data
			this.vars['task_details'][task_id]['save'][slot] = data;

			// Commit changes
			this.commitUserRecord();

		}

		/**
		 * Enable a task
		 */
		User.setTaskAnimationAsSeen = function(task_id) {

			// Make sure data exist
			if (!this.vars['task_details'][task_id])
				this.vars['task_details'][task_id] = {};
			if (!this.vars['task_details'][task_id]['save'])
				this.vars['task_details'][task_id]['save'] = [null,null,null,null];

			// Grant access to the given task
			this.vars['task_details'][task_id]['seen_intro'] = 1;

			// Commit changes
			this.commitUserRecord();

		}

		/**
		 * Enable a task
		 */
		User.enableTask = function(task_id) {

			// Make sure data exist
			if (!this.vars['task_details'][task_id])
				this.vars['task_details'][task_id] = {};
			if (!this.vars['task_details'][task_id]['save'])
				this.vars['task_details'][task_id]['save'] = [null,null,null,null];

			// Grant access to the given task
			this.vars['task_details'][task_id]['enabled'] = 1;

			// Commit changes
			this.commitUserRecord();

		}

		/**
		 * Mark a task as completed, by selecting the next one
		 */
		User.markTaskCompleted = function(task_id, topic_id) {

			// Fetch topic information
			var topic = User.getTopicDetails(topic_id);

			// Check which tasks are handled by the user
			for (var i=0; i<topic.taskDetails.length; i++) {
				var task = topic.taskDetails[i];
				if (task['_id'] == task_id) {
					// Did we reach the end?
					if (i == topic.taskDetails.length-1) {
						// Enable next topic
						this.enableChildTopics(topic_id);
						return;
					} else {
						// Enable next task
						this.enableTask(topic.taskDetails[i+1]['_id']);
						return;
					}
				}
			}

		}


		/**
		 * Check if a topic is complete
		 */
		User.hasCompletedTopic = function(topic_id) {

			// Fetch topic information
			var topic = DB.cache['topic_index'][topic_id];

			// Check which tasks are handled by the user
			for (var i=0; i<topic.tasks.length; i++) {
				var task = this.vars['task_details'][topic.tasks[i]];
				// Found at least one not completed
				if (!task || !task.enabled)
					return false;
			}

			// Everything was completed!
			return true;

		}

		/**
		 * Get first-time aids detail
		 */
		User.getFirstTimeDetails = function() {
			if (!DB.cache['first_time']) return [];

			var details = {};
			for (var k in DB.cache['first_time']) {
				var ft = DB.cache['first_time'][k];

				// Check if this first-time is shown
				if (!this.vars['first_time'][k]) {
					ft.shown = false;
				} else {
					ft.shown = this.vars['first_time'][k];
				}

				// Store details
				details[k] = ft;
			}

			return details;
		}

		/**
		 * Mark a first-time aid as seen
		 */
		User.markFirstTimeAsSeen = function(aid_id) {

			// Update first_time aid status
			this.vars['first_time'][aid_id] = 1;

			// Commit changes
			this.commitUserRecord();

		}

		// Return the user scope
		return User;
	}

);