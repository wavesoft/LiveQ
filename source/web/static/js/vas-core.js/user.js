/**
 * [core/main] - Core initialization module
 */
define(["core/config", "core/db"], 

	function(Config, DB) {

		/**
		 * Database interface
		 *
		 * @class
		 * @exports core/user
		 */
		var User = { };

		/**
		 * Login and initialize user record
		 *
		 * @param {Object} params - A dictionary that contains the 'username' and 'password' fields.
		 * @param {function(status)} callback - A callback function to fire when the login-process has completed
		 */
		User.login = function(params, callback) {

			// Try to log-in the user
			DB.authenticateUser(params['username'], params['password'], (function(status, errorMsg) {
				
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
			if (!DB.userRecord['data']['enabled_topics'])
				DB.userRecord['data']['enabled_topics'] = {};

			// Create per-task user details
			if (!DB.userRecord['data']['task_details'])
				DB.userRecord['data']['task_details'] = {};

		}

		/**
		 * Build and return the user's task information tree
		 */
		User.getTaskDetails = function( task_id ) {
			var db_task = DB.cache['tasks'][task_id],
				u_task  = DB.userRecord['data']['task_details'][task_id];

			// Check if the entire record is missing
			if (!db_task) return null;

			// Populate additional fields
			if (!u_task) {
				DB.userRecord['data']['task_details'][task_id] = u_task = {
					'enabled': false,
					'seen_intro': false,
					'save': [null,null,null,null]
				}
			}

			// Update db_task fields
			db_task['enabled'] = u_task['enabled'];
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
				taskDetails.push( User.getTaskDetails(node.tasks[i]) );
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
			var traverse_node = function(node, parent) {

				// Skip invisible nodes
				if ((parent != null) && DB.userRecord['data']['enabled_topics'][node['_id']])
					return;

				// Store to nodes & it's lookup
				var curr_node_id = nodes.length;
				node_id[node['_id']] = curr_node_id;
				nodes.push( node );

				// Check if we should make a link
				if (parent != null) {
					var parent_id = node_id[parent['_id']];
					links.push({ 'source': parent_id, 'target': curr_node_id });
				}

				// Traverse child nodes
				for (var i=0; i<node.children.length; i++) {
					traverse_node( node.children[i], node );
				}

			}

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
		User.enableTopic = function(id) {

			// Grant access to the given topic
			DB.userRecord['data']['enabled_topics'][id] = 1;

			// Commit changes
			DB.commitUserRecord();

		}

		/**
		 * Get the save slots for the tasks
		 */
		User.getTaskSaveSlots = function(task) {

			// Make sure data exist
			if (!DB.userRecord['data']['task_details'][task_id])
				DB.userRecord['data']['task_details'][task_id] = {};
			if (!DB.userRecord['data']['task_details'][task_id]['save'])
				DB.userRecord['data']['task_details'][task_id]['save'] = [null,null,null,null];

			// Return save slot info
			return DB.userRecord['data']['task_details'][task_id]['save'];

		}

		/**
		 * Update the save slot of a particular task
		 */
		User.setTaskSaveSlot = function(task, slot, data) {
			
			// Make sure data exist
			if (!DB.userRecord['data']['task_details'][task_id])
				DB.userRecord['data']['task_details'][task_id] = {};
			if (!DB.userRecord['data']['task_details'][task_id]['save'])
				DB.userRecord['data']['task_details'][task_id]['save'] = [null,null,null,null];

			// Wrap slot index
			if (slot<0) slot=0;
			if (slot>3) slot=3;

			// Update slot data
			DB.userRecord['data']['task_details'][task_id]['save'][slot] = data;

			// Commit changes
			DB.commitUserRecord();

		}

		/**
		 * Enable a task
		 */
		User.setTaskAnimationAsSeen = function(task_id) {

			// Make sure data exist
			if (!DB.userRecord['data']['task_details'][task_id])
				DB.userRecord['data']['task_details'][task_id] = {};
			if (!DB.userRecord['data']['task_details'][task_id]['save'])
				DB.userRecord['data']['task_details'][task_id]['save'] = [null,null,null,null];

			// Grant access to the given task
			DB.userRecord['data']['task_details'][task_id]['seen_intro'] = 1;

			// Commit changes
			DB.commitUserRecord();

		}

		/**
		 * Enable a task
		 */
		User.enableTask = function(task_id) {

			// Make sure data exist
			if (!DB.userRecord['data']['task_details'][task_id])
				DB.userRecord['data']['task_details'][task_id] = {};
			if (!DB.userRecord['data']['task_details'][task_id]['save'])
				DB.userRecord['data']['task_details'][task_id]['save'] = [null,null,null,null];

			// Grant access to the given task
			DB.userRecord['data']['task_details'][task_id]['enabled'] = 1;

			// Commit changes
			DB.commitUserRecord();

		}

		// Return the user scope
		return User;
	}

);