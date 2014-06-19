
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
		 * Helper function to perform arbitrary couchDB API requests
		 */
		function couchdb_api(url,callback, type) {
			$.ajax({
				'url' 	 	: url,
				'method' 	: 'GET',
				'dataType'	: type || 'json',
				'success'	: function(data, status) { callback(data); },
				'error'		: function(jqXHR, status, error) { 
					callback(null); 
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
		var Database = function( name ) {
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
			if (rev) url += "?rev="+rev;
			// Fire the API function
			couchdb_api( url, couchdb_translate_single(callback) );

		}

		/**
		 * Return ALL documents from the couchDB server
		 */
		Database.prototype.all = function(callback) {
			// Build API URL
			var url = Config.db.url + "/" + this.db + "/_all_docs?include_docs=true";
			// Fire the API function
			couchdb_api( url, couchdb_translate_many(callback) );
		}

		/**
		 * Return the documents filtered by the specified view
		 */
		Database.prototype.view = function(view, callback) {
			// Build API URL
			var url = Config.db.url + "/" + this.db + "/_design/" + view + "/all";
			// Fire the API function
			couchdb_api( url, couchdb_translate_many(callback) );
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
			couchdb_api( url, couchdb_translate_single(callback), 'text' );
			
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