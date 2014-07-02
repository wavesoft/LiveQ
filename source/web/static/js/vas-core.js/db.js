/**
 * [core/main] - Core initialization module
 */
define(["jquery", "core/config"], 

	function($, Config) {

		/**
		 * Helper function to translate response data of a single entry
		 */
		function couchdb_translate_single(callback) {
			return function(data) {
				callback(data);
			};
		}

		/**
		 * Helper function to translate response data of a multiple entries
		 */
		function couchdb_translate_many(callback) {
			return function(data) {

				// Fire invalid responses
				if (!data)
					callback(data);

				// Fetch data
				var totalRows = data['total_rows'],
					rows = data['rows'];

				// Warn for incomplete data
				if (rows.length < totalRows)
					console.warn("DB: Incomplete data arrived!");

				// Fire the callback passing rows as response
				var ans = [];
				for (var i=0; i<rows.length; i++) {
					ans.push(rows[i].doc);
				}
				callback(ans);

			};
		}

		/**
		 * Helper function to perform arbitrary couchDB API GET requests
		 */
		function couchdb_get(url,callback, type) {
			$.ajax({
				'url' 	 	: url,
				'method' 	: 'GET',
				'dataType'	: type || 'json',
				'success'	: function(data, status) { 
					callback(data); 
				},
				'error'		: function(jqXHR, status, error) { 
					callback(null, error); 
					console.warn("DB: CouchDB Error:", error, "("+status+")"); 
				}
			})
		}

		/**
		 * Helper function to perform arbitrary couchDB API POST requests
		 */
		function couchdb_post(url, payload, callback, type) {
			$.ajax({
				'url' 	 	: url,
				'data' 		: payload,
				'type'	 	: 'POST',
				'dataType'	: type || 'json',
				'success'	: function(data, status) { 
					callback(data); 
				},
				'error'		: function(jqXHR, status, error) { 
					callback(null, error); 
					console.warn("DB: CouchDB Error:", error, "("+status+")"); 
				}
			})
		}

		/**
		 * Helper function to perform arbitrary couchDB API PUT requests
		 */
		function cpuchdb_put(url, payload, callback, type) {
			$.ajax({
				'url' 	 		: url,
				'data' 			: payload,
				'type' 			: 'PUT',
				'dataType'		: type || 'json',
				'contentType' 	: 'application/json',
				'success'		: function(data, status) { 
					callback(data); 
				},
				'error'			: function(jqXHR, status, error) { 
					callback(null, error); 
					console.warn("DB: CouchDB Error:", error, "("+status+")"); 
				}
			})
		}

		/**
		 * CouchDB Database Instance
		 *
		 * This class is used for organizing the database I/O operations
		 * on the same database instance.
		 */
		var Database = function( name, prefix ) {
			this.db = name;
			this.session = { };
		}

		/**
		 * Return a JSON document from CouchDB 
		 */
		Database.prototype.get = function(doc, rev, callback) {
			
			// Check for missing fields
			if (typeof(rev) == 'function') {
				callback = rev;
				rev = false;
			}

			// Build API URL
			var url = Config.db.url + "/" + this.db + "/" + doc;
			if (rev) url += "?rev="+rev;
			// Fire the API function
			couchdb_get( url, couchdb_translate_single(callback) );

		}

		/**
		 * Put a JSON document in the CouchDB database
		 */
		Database.prototype.put = function(doc, data, callback) {
			
			// Check for missing fields
			if (typeof(rev) == 'function') {
				callback = rev;
				rev = false;
			}

			// Build API URL
			var url = Config.db.url + "/" + this.db + "/" + doc;
			if (rev) url += "?rev="+rev;
			// Fire the API function
			couchdb_put( url, JSON.stringify(data), function(response) {
				if (!response['ok']) {
					callback(false);
				} else {
					callback(data['id'], data['rev']);
				}
			});

		}

		/**
		 * Return ALL documents from the couchDB server
		 */
		Database.prototype.all = function(callback) {
			// Build API URL
			var url = Config.db.url + "/" + this.db + "/_all_docs?include_docs=true";
			// Fire the API function
			couchdb_get( url, couchdb_translate_many(callback) );
		}

		/**
		 * Return the documents filtered by the specified view
		 */
		Database.prototype.view = function(view, callback) {
			// Build API URL
			var url = Config.db.url + "/" + this.db + "/_design/" + view + "/all";
			// Fire the API function
			couchdb_get( url, couchdb_translate_many(callback) );
		}

		/**
		 * Return the attachment of the specified document
		 */
		Database.prototype.getAttachment = function(doc, rev, callback) {
			// Check for missing fields
			if (typeof(rev) == 'function') {
				callback = rev;
				rev = false;
			}

			// Build API URL
			var url = Config.db.url + "/" + this.db + "/" + doc + "/attachment";
			if (rev) url += "?rev="+rev;

			// Return plain-text response
			couchdb_get( url, couchdb_translate_single(callback), 'text' );
			
		}


		/**
		 * Database interface
		 *
		 * @class
		 * @exports core/db
		 */
		var DB = { };

		/**
		 * Database cache, used by other parts in the system
		 *
		 * @type {Object}
		 */
		DB.cache = {};

		/**
		 * Create a new user  
		 *
		 * @param {string} username - The user's name
		 * @param {string} password - The user's password
		 * @param {object} callback - The function to call when completed
		 *
		 */
		DB.createUser = function(username, password, callback) {

			// Create a UUID role for this user
			var uuid = "", chars="0123456789+abcdefghijklmnopqrstuvwxyz-ABCDEFGHIJKLMNOPQRSTUVWXYZ";
			for (var i=0; i<64; i++) {
				uuid += chars[parseInt(Math.random() * chars.length)];
			}

			// Try to allocate space
			cpuchdb_put( Config.db.url + "/_users/org.couchdb.user:" + username, JSON.stringify{

				"name" 		: username,
				"uuid"		: uuid,
				"password" 	: password,
				"roles" 	: [],
				"type" 		: "user"

			}), function(data, error) {
				if (data && data['ok']) {

					// Open the user's database
					var userDB = new Database("users");
					userDB.put( uuid, DB.cache['definitions']['new-user'], function(status) {
						if (status['ok']) {
							// Return user record
							callback(true, DB.cache['definitions']['new-user']);
						} else {
							console.error("DB: Could not allocate user record!", data['reason']);
							callback(false);
						}
					});

				} else {
					console.error("DB: Could not authenticate user!", error);
					callback(false, error);
				}
			});

		}

		/**
		 * Authenticate to couch-DB and get authentication token 
		 *
		 * @param {string} username - The user's name
		 * @param {string} password - The user's password
		 * @param {object} callback - The function to call when completed
		 *
		 */
		DB.authenticateUser = function(username, password, callback) {

			// Reset session
			this.session = {};

			// Try to open session
			couchdb_post( Config.db.url + "/_session", {
				"name" 		: username,
				"password" 	: password
			}, (function(data, error) {

				if (data && data['ok']) {

					// Update session information
					this.session['name'] = data['name'];
					this.session['roles'] = data['roles'];

					// Get user record
					var userDB = new Database("users"),
						recordID = this.session['roles'][0];
						userDB.get(recordID, function(record) {
							if (!record) {
								console.error("DB: Could not fetch record entry!");
								callback(false, "Could not fetch record entry");
							} else {
								// Fire callback
								callback(data['name'], record);
							}
						});

				} else {
					console.error("DB: Could not authenticate user!", error);
					callback(false, error);
				}

			}).bind(this));

		}

		/**
		 * Return an object for I/O operations on the specified database
		 *
		 * @param {string} name - The database name to open
		 * @returns {Database} - The database instance
		 */
		DB.openDatabase = function(name) {
			return new Database(name);
		}

		// Return the global scope
		return DB;
	}

);