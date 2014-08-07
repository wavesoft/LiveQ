/**
 * [core/main] - Core initialization module
 */
define(["jquery", "sha1", "core/config"], 

	function($, SHA1, Config) {

		/**
		 * Database-wide revision index
		 */
		var dbRevIndex = 0;

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

			// The commit process is a different function
			var commitSeq = function(rev) {

				// Place revision ID if specified
				if (rev) data['_rev'] = rev;
				console.log("Saving", data);

				// Fire the API function
				couchdb_put( url, JSON.stringify(data), function(response) {
					if (!response) {
						callback(false);
						return;
					}
					if (!response['ok']) {
						callback(false);
					} else {
						callback(data['_id'] || doc, response['rev']);
					}
				});

			}

			// Get the revision information
			couchdb_get( url+"?revs_info=true", function(data, error) {
				if (!data && (error == "Object Not Found")) {
					// First commit
					commitSeq("");
				} else if (!data || (data['_revs_info'] == undefined)) {
					// Error
					callback(false, "Could not list revisions");
				} else {
					// Replace last version
					commitSeq( data['_revs_info'][0].rev );
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
		DB.createUser = function(data, callback) {

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

			// Prepare fields
			var username = data['username'] || "",
				password = data['password'] || "";

			// Prepare user record
			var record = {
				"name" 			  : username,
				"uuid"			  : uuid,
				"password_sha" 	  : SHA1.hash( password + salt ),
				"salt"			  : salt,
				"roles" 		  : [],
				"type" 			  : "user",
				"email"			  : data['email'] || "",
				"displayName"	  : data['displayName'] || "",
				"data"			  : DB.cache['definitions']['new-user']
			};

			// Try to allocate space
			couchdb_put( Config.db.url + "/_users/org.couchdb.user:" + username, JSON.stringify(record), 
				function(data, error) {
					if (data && data['ok']) {
						DB.userRecord = record;
						if (callback) callback(true, record );
					} else {
						console.error("DB: Could not authenticate user!", error);
						if (callback) callback(false, error);
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
							if (callback) callback(false, "Could not fetch record entry");
						} else {
							// Fire callback
							DB.userRecord = record;
							if (callback) callback(data['name'], record);
						}
					});

				} else {
					console.error("DB: Could not authenticate user!", error);
					if (callback) callback(false, error);
				}

			}).bind(this));

		}

		/**
		 * Commit to couch-DB the locally-cached user record
		 *
		 * @param {object} callback - The function to call when completed
		 *
		 */
		DB.commitUserRecord = function(callback) {

			// If we don't have a user record, quit
			if (!DB.userRecord) return;

			// Put the entire user record
			var url = Config.db.url + "/_users/" + this.userRecord['_id'];
			couchdb_put( url, JSON.stringify(this.userRecord), (function(response) {
				if (!response) {
					if (callback) callback(false);
					return;
				}
				if (!response['ok']) {
					if (callback) callback(false);
				} else {

					// Update user record revision
					this.userRecord['_rev'] = response['rev'];

					// Fire success callback
					if (callback) callback(true);
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