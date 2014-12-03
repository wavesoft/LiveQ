/**
 * [core/main] - Core initialization module
 */
define(["core/config", "core/util/event_base", "core/db", "core/apisocket", "core/global"], 

	function(Config, EventBase, DB, APISocket, Global) {

		/**
		 * Database interface
		 *
		 * @class
		 * @exports core/user
		 */
		var User = function() {
			window.user = this;

			// Subclass from EventBase
			EventBase.call(this);

			/**
			 * The user profile variables
			 * @type {object}
			 */
			this.profile = { };

			/**
			 * The dynamic user variables
			 * @type {object}
			 */
			this.vars = { };

			/**
			 * The socket used for account I/O
			 * @type {object}
			 */
			this.accountIO = null;


			// On user log-in update credits
			APISocket.on('ready', (function() {

				// Open Account socket when API socket is ready
				this.accountIO = APISocket.openAccount();

				// Bind events
				this.accountIO.on('profile', (function(profile) {

					// Update profile and variables
					this.profile = profile;
					this.vars = profile['vars'];
					this.initVars();

					// Fire the profile event
					this.trigger('profile', profile);

				}).bind(this));

			}).bind(this));

		}

		// Subclass from EventBase
		User.prototype = Object.create( EventBase.prototype );

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
		User.prototype.login = function(params, callback) {

			// Try to log-in the user
			this.accountIO.login(params['username'], params['password'], (function(response) {
				
				// If something went wrong, fire error callback
				if (response['status'] != 'ok') {
					if (callback) callback(false, response['message']);
					return;
				}

				// Wait until the user profile arrives
				this.accountIO.callbackOnAction("profile", (function(profile) {

					// Let global listeners that the user is logged in
					Global.events.trigger("login", profile);

					// Handle profile
					this.profile = profile;
					this.vars = profile['vars'];
					this.initVars();					

					// Fire callback
					if (callback) callback(true);

				}).bind(this));

			}).bind(this));

		}

		/**
		 * Login and initialize user record
		 *
		 * @param {Object} params - A dictionary that contains the 'username', 'password', 'email' and 'name' fields.
		 * @param {function(status)} callback - A callback function to fire when the register-process has completed
		 */
		User.prototype.register = function(params, callback) {

			// Try to register-in the user
			this.accountIO.register(params, (function(response) {
				
				// If something went wrong, fire error callback
				if (response['status'] != 'ok') {
					if (callback) callback(false, response['message']);
					return;
				}

				// Wait until the user profile arrives
				this.accountIO.callbackOnAction("profile", (function(profile) {

					// Let global listeners that the user is logged in
					Global.events.trigger("login", profile);

					// Handle profile
					this.profile = profile;
					this.vars = profile['vars'];
					this.initVars();					

					// Fire callback
					if (callback) callback(true);

				}).bind(this));

			}).bind(this));

		}

		/**
		 * Unlock the given knowledge refered by it's ID.
		 * The server is going to perform the transaction and fire the callback when ready.
		 *
		 * @param {string} id - The knowledge ID
		 * @param {function(status)} callback - A callback function to fire when the knowledge is unlocked
		 */
		User.prototype.unlockKnowledge = function(id, callback) {

			// Try to register-in the user
			this.accountIO.sendAction("knowledge.unlock", 
				{
					'id': id
				}, 
				(function(response) {

					// Fire callback
					if (response['status'] == 'ok') {
						if (callback) callback();
					}

				}).bind(this)
			);

		}

		/**
		 * Get the values of a given save slot
		 */
		User.prototype.getSlotValues = function( index, callback ) {

			// Try to register-in the user
			this.accountIO.sendAction("save.get", 
				{
					'id': index
				}, 
				(function(response) {

					// Fire callback
					if (response['status'] == 'ok') {
						if (callback) callback(response['values']);
					}

				}).bind(this)
			);

		}

		/**
		 * Set the value to a save slot
		 */
		User.prototype.saveSlotValues = function( index, values, callback ) {

			// Try to register-in the user
			this.accountIO.sendAction("save.set", 
				{
					'id': index,
					'values': values
				}, 
				(function(response) {

					// Fire callback
					if (response['status'] == 'ok') {
						if (callback) callback(true);
					} else {
						if (callback) callback(false);
					}

				}).bind(this)
			);

		}

		/**
		 * Claim credits
		 */
		User.prototype.claimCredits = function( category, claim, reason ) {

			// Try to register-in the user
			this.accountIO.sendAction("credits.claim", 
				{
					'category': category,
					'claim': claim
				}, 
				(function(response) {

					// Fire callback
					if (response['status'] == 'ok') {
						this.trigger("notification", "You got <strong>"+response['credits']+'</strong> credit '+reason);
					}

				}).bind(this)
			);

		}

		/**
		 * Reset credit claim category
		 */
		User.prototype.resetClaimCategory = function( category ) {

			// Try to register-in the user
			this.accountIO.sendAction("credits.reset", 
				{
					'category': category
				}, 
				(function(response) {

					// Fire callback
					if (response['status'] == 'ok') {

					}

				}).bind(this)
			);

		}

		/**
		 * Initialize the user record 
		 *
		 * This function fetches the database user record and prepares the local fields.
		 */
		User.prototype.initVars = function() {

			// Create enabled_topics if missing
			if (!this.vars['enabled_topics'])
				this.vars['enabled_topics'] = {};

			// Create the explored_knowledge grid
			if (!this.vars['explored_knowledge'])
				this.vars['explored_knowledge'] = {};

			// Create per-task user details
			if (!this.vars['task_details'])
				this.vars['task_details'] = {};

			// Create first-time pop-up status
			if (!this.vars['first_time'])
				this.vars['first_time'] = {};

		}

		/**
		 * Build and return a flat version of the knowledge tree.
		 */
		User.prototype.getKnowledgeList = function() {
			// Prepare answer array
			var ans = [];

			// Iterate over the knowledge grid
			for (var i=0; i<DB.cache['knowlege_grid_list'].length; i++) {
				var item = DB.cache['knowlege_grid_list'][i];
				// Check it item is explored
				item['enabled'] = !!(this.vars['explored_knowledge'][item['_id']]);
				if (item['parent'] == null) item['enabled']=true;
				ans.push(item);
			}
			return ans;
		}

		/**
		 * Build and return the enabled tunables and enabled observables
		 * by traversing the knowledge grid and the relevant databases.
		 */
		User.prototype.getTuningConfiguration = function() {
			var config = {
				// The enabled machine configurations (ex. ee, ppbar)
				'configurations': [],
				// The machine groups and their tunables
				'machineParts': [],
				// The list of observables under consideration
				'observables': []
			};

			// Get some useful databases
			var dbMachineParts = DB.cache['definitions']['machine-parts'],
				dbTunables = DB.getAll("tunables"),
				dbObservables = DB.getAll("observables");

			// Tunable group index and prefix-to-machine parts lookup table
			var tunableGroupIndex = {},
				prefixToMachinePart = {};

			// Populate prefix-to-machine part index
			for (k in dbMachineParts) {
				if (k[0] == "_") continue;
				if (!dbMachineParts[k]['prefixes']) continue;
				for (var i=0; i<dbMachineParts[k]['prefixes'].length; i++) {
					// Map this prefix to machine part ID
					prefixToMachinePart[dbMachineParts[k]['prefixes'][i]] = k;
				}
			}

			// Get the knowledge list
			var knowledge = this.getKnowledgeList();
			for (var i=0; i<knowledge.length; i++) {
				if (knowledge[i].enabled || (knowledge[i].parent == null)) {
					// This knowledge topic is enabled (or the root one)!

					// Collect configurations
					for (var j=0; j<knowledge[i].configurations.length; j++) {
						var cfgName = knowledge[i].configurations[j];
						if (config.configurations.indexOf(cfgName) == -1)
							config.configurations.push(cfgName);
					}

					// Store observable names
					for (var j=0; j<knowledge[i].observables.length; j++) {
						var obsName = knowledge[i].observables[j],
							obs = dbObservables[obsName];
						if (!obs) {
							console.warn("Could not find observable '",obsName,"' provided by knowledge node '", knowledge[i]['_id'],"'");
							continue;
						}
						config.observables.push(obsName);
					}

					//
					// Look for enabled tunables and place them on the 
					// appropriate machine part that they relate to.
					//
					for (var j=0; j<knowledge[i].tunables.length; j++) {
						var tunName = knowledge[i].tunables[j],
							tun = dbTunables[tunName];
						if (!tun) {
							console.warn("Could not find tunable '",tunName,"' provided by knowledge node '", knowledge[i]['_id'],"'");
							continue;
						}

						// Find tunable prefix
						var tunPrefix = tunName.split(":")[0],
							machinePart = prefixToMachinePart[tunPrefix];

						// Check if we have a machine part with this prefix
						if (machinePart == undefined) {
							console.warn("Could not find machine part for tunable '",tunName,"' provided by knowledge node '", knowledge[i]['_id'],"'");
							continue;
						}

						// Get/Place group
						var machineGroup = tunableGroupIndex[machinePart];
						if (!machineGroup) {
							machineGroup = { "part": machinePart, "tunables": [] };
							tunableGroupIndex[machinePart] = machineGroup;
							config.machineParts.push(machineGroup);
						}

						// Append tunable on the machine tunables
						machineGroup.tunables.push( tun );

					}

				}
			}

			return config;
		}

		/**
		 * Build and return the user's knowledge information tree
		 */
		User.prototype.getKnowledgeTree = function( showEdgeNode ) {

			// Prepare nodes and links
			var nodes = [],
				links = [],
				node_id = {},
				showEdge = (showEdgeNode == undefined) ? false : showEdgeNode;

			// Traverse nodes
			var traverse_node = (function(node, parent, show_edge) {

				// Skip invisible nodes
				if ((parent != null) && !this.vars['explored_knowledge'][node['_id']]) {
					if (show_edge) {
						show_edge = false;
					} else {
						return;
					}
				}

				// Store to nodes & it's lookup
				var curr_node_id = nodes.length;
				node_id[node['_id']] = curr_node_id;
				node.edge = !show_edge;
				node.enabled = !!this.vars['explored_knowledge'][node['_id']];
				nodes.push( node );

				// Check if we should make a link
				if (parent != null) {
					var parent_id = node_id[parent['_id']];
					links.push({ 'source': curr_node_id, 'target': parent_id });
				}

				// Traverse child nodes
				for (var i=0; i<node.children.length; i++) {
					traverse_node( node.children[i], node, show_edge );
				}

			}).bind(this);

			// Start node traversal
			traverse_node( DB.cache['knowlege_grid'], null, showEdge );

			// Return the tree data
			return {
				'nodes': nodes,
				'links': links
			};

		}
















		/**
		 * Commit user variables to the database
		 */
		User.prototype.commitUserRecord = function() {
			// Commit user variables
			this.accountIO.sendVariables(this.vars);
		}

		/**
		 * Build and return the user's task information tree
		 */
		User.prototype.getTaskDetails = function( task_id ) {
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
		User.prototype.getTopicDetails = function( topic_id ) {
			var topic = DB.cache['topic_index'][topic_id];
			if (!topic) return;

			// Fetch task information for this topic
			var taskDetails = [];
			for (var i=0; i<topic.tasks.length; i++) {
				// Collect task details
				taskDetails.push( this.getTaskDetails(topic.tasks[i]) );
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
		User.prototype.getTopicTree = function() {

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
		User.prototype.enableChildTopics = function(topic_id) {

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
		User.prototype.getTaskSaveSlots = function(task) {

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
		User.prototype.setTaskSaveSlot = function(task_id, slot, data) {
			
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
		User.prototype.setTaskAnimationAsSeen = function(task_id) {

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
		User.prototype.enableTask = function(task_id) {

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
		User.prototype.markTaskCompleted = function(task_id, topic_id) {

			// Fetch topic information
			var topic = this.getTopicDetails(topic_id);

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
		User.prototype.hasCompletedTopic = function(topic_id) {

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
		User.prototype.getFirstTimeDetails = function() {
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
		 * Check if first-time is seen
		 */
		User.prototype.isFirstTimeSeen = function(aid_id) {
			return !!this.vars['first_time'][aid_id];
		}

		/**
		 * Mark a first-time aid as seen
		 */
		User.prototype.markFirstTimeAsSeen = function(aid_id) {

			// Update first_time aid status
			this.vars['first_time'][aid_id] = 1;

			// Commit changes
			this.commitUserRecord();

		}






		// Return the user scope
		var user = new User();
		return user;
	}

);