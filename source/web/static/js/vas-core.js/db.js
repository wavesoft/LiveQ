/**
 * [core/main] - Core initialization module
 */
define(["jquery", "sha1", "core/config"], 

	function($, SHA1, Config) {

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
		function couchdb_put(url, payload, callback, type) {
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
			if (rev != false)
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
			// Fire the API function
			couchdb_put( url, JSON.stringify(data), function(response) {
				if (!response['ok']) {
					callback(false);
				} else {
					callback(data['_id'], data['_rev']);
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
		 * The currently connected user session record
		 *
		 * @type {Object}
		 */
		DB.userRecord = null;

		/**
		 * Create a new user  
		 *
		 * @param {string} username - The user's name
		 * @param {string} password - The user's password
		 * @param {object} callback - The function to call when completed
		 *
		 */
		DB.createUser = function(username, password, callback) {

			// Create a UUID role for this user, used for various indexing purposes
			var uuid = "", chars="0123456789+abcdefghijklmnopqrstuvwxyz-ABCDEFGHIJKLMNOPQRSTUVWXYZ";
			for (var i=0; i<64; i++) {
				uuid += chars[parseInt(Math.random() * chars.length)];
			}

			// Calculate salt
			var salt = "", chars="0123456789abcdef";
			for (var i=0; i<32; i++) {
				salt += chars[parseInt(Math.random() * chars.length)];
			}

			// Prepare user record
			var record = {
				"name" 			  : username,
				"uuid"			  : uuid,
				"password_sha" 	  : SHA1.hash( password + salt ),
				"salt"			  : salt,
				"roles" 		  : [],
				"type" 			  : "user",
				"data"			  : DB.cache['definitions']['new-user']
			};

			// Try to allocate space
			couchdb_put( Config.db.url + "/_users/org.couchdb.user:" + username, JSON.stringify(record), 
				function(data, error) {
					if (data && data['ok']) {
						callback(true, record );
						DB.userRecord = record;
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

			// Try to open session
			couchdb_post( Config.db.url + "/_session", {
				"name" 		: username,
				"password" 	: password
			}, (function(data, error) {

				if (data && data['ok']) {

					// Get the entire user record
					var userDB = new Database("_users");
					userDB.get("org.couchdb.user:"+username, function(record) {

						if (!record) {
							console.error("DB: Could not fetch record entry!");
							callback(false, "Could not fetch record entry");
						} else {
							// Fire callback
							callback(data['name'], record);
							DB.userRecord = record;
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