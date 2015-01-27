/**
 * [core/analytics/transaction] - Analytics transaction module
 */
define(["core/config"], 

	function(Config) {
		'use strict';

		/**
		 * Create a new transaction ID
		 */
		function mkTransactionID() {
		    var text = "";
		    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		    for( var i=0; i < 12; i++ )
		        text += possible.charAt(Math.floor(Math.random() * possible.length));
		    return text;
		}

		/**
		 * Analytics transaction
		 */
		var Transaction = function( name ) {

			/**
			 * Timestamp when the transaction started
			 */
			this.started = Date.now();

			/**
			 * Last event timestamp
			 */
			this.lastTimestamp = Date.now();

			/**
			 * Duration of the transaction
			 */
			this.duration = 0;

			/**
			 * Flag that checks if the transaction is active
			 */
			this.active = true;

			/**
			 * Metrics collected
			 */
			this.metrics = {};

			/**
			 * Non-summarizable metrics
			 */
			this.nsMetrics = [];

			/**
			 * Calculate a unique transaction ID
			 */
			this.id = mkTransactionID();

			/**
			 * Accelerator if the snapshot was registered in the list
			 */ 
			this._isIndexed = false;

		}

		/**
		 * Restore a transaction from snapshot
		 */
		Transaction.snapshotRestore = function(id) {

			// Create a new instance
			var ans = new Transaction();

			// Get transaction data
			var snapshotData = localStorage.getItem("analytics.transaction." + this.id);
			if (!snapshotData) return null;

			// Update values
			var dat = JSON.parse(snapshotData);
			ans.id = id;
			ans.started = dat[0];
			ans.lastTimestamp = dat[1];
			ans.duration = dat[2];
			ans.active = dat[3];
			ans.metrics = dat[4];
			ans.nsMetrics = dat[5];

			// That's (probably) already in index
			ans._isIndexed = true;

			// Return answer
			return ans;

		}


		/**
		 * Save a snapshot in local store
		 */
		Transaction.prototype.snapshotSave = function() {

			// Store localStorage item
			localStorage.setItem(
				"analytics.transaction." + this.id,
				JSON.stringify([
					this.started,
					this.lastTimestamp,
					this.duration,
					this.active,
					this.metrics,
					this.nsMetrics
				])
			);

			// If not indexed, index it now
			if (!this._isIndexed) {

				// Get the current state of the list
				var currValue = localStorage.getItem("analytics.transaction.list") || "[]",
					currDB = JSON.parse( currValue );

				// Put in list if missing
				if (currDB.indexOf(this.id) == -1) {
					// Place ID in the database
					currDB.push(this.id);
					// Save
					localStorage.setItem(
						"analytics.transaction.list",
						JSON.stringify(currDB)
					);
				}

				// Mark this as indexed
				this._isIndexed = true;
			}

		}

		/**
		 * Remove snapshot from localStorage
		 */
		Transaction.prototype.snapshotRemove = function() {

			// Get the current state of the list
			var currValue = localStorage.getItem("analytics.transaction.list") || "[]",
				currDB = JSON.parse( currValue );

			// Remove from list if there
			var elmindex = currDB.indexOf(this.id);
			if (elmindex != -1) {
				// Place ID in the database
				currDB.splice(elmindex, 1);

				// If empty, remove
				if (currDB.length == 0) {
					//Remove
					localStorage.removeItem("analytics.transaction.list");
				} else {
					// Save
					localStorage.setItem(
						"analytics.transaction.list",
						JSON.stringify(currDB)
					);
				}
			}

			// Mark this as not indexed
			this._isIndexed = true;

			// Remove transaction data
			localStorage.removeItem(
				"analytics.transaction." + this.id
				);
		}

		/**
		 * Freeze the current transaction
		 *
		 * This effectively updates the duration of the transaction
		 * and disables outgoing events.
		 */
		Transaction.prototype.freeze = function() {
			// This works only on active transactions
			if (!this.active) return;
			// Freeze the transaction
			this.active = false;
			// Update current duration
			this.duration += Date.now() - this.started;
		 	// Update the last event timestamp
			this.lastTimestamp = Date.now();
			// Snapshot
			this.snapshotSave();
		}

		/**
		 * Thaw a frozen transaction
		 *
		 * This resets the started timestamp and enables recetion
		 * of events.
		 */
		 Transaction.prototype.thaw = function() {
			// This works only on inactive transactions
			if (this.active) return;
			// Thaw the transaction
			this.active = true;
			// Update timestamp
			this.started = Date.now();
		 	// Update the last event timestamp
			this.lastTimestamp = Date.now();
		 };

		 /**
		  * Send a non-summarizable metric
		  */
		 Transaction.prototype.fireEvent = function(eventName, eventData) {
		 	// Don't accept events if the session is frozen
		 	if (!this.active) return;
		 	// Collect metric
		 	this.nsMetrics.push(
		 			eventName,	// 0: Event name
		 			eventData,	// 1: Event data
		 			0,			// 3: Event value
		 			Date.now()	// 4: Timestamp
		 		);
			// Snapshot
			this.snapshotSave();
		 }

		 /**
		  * Place/update a summarizable metric
		  */
		 Transaction.prototype.sumEvent = function(eventName, eventValue, eventData) {
		 	// Don't accept events if the session is frozen
		 	if (!this.active) return;

		 	// Update the last timestamp
			this.lastTimestamp = Date.now();

		 	// Set default value to the given key
		 	if (this.metrics[eventName] == undefined) {
		 		// Reset metric
		 		this.metrics[eventName] = [
		 			eventName,	// 0: Event name
		 			eventData,	// 1: Event data
		 			0, 			// 3: Event value
		 			Date.now(),	// 4: First timestamp
		 			Date.now()	// 5: Last timestamp
		 		];
		 	}

		 	// Update metric
		 	this.metrics[eventName][2] += value;
		 	this.metrics[eventName][4] = Date.now();

			// Snapshot
			this.snapshotSave();

		 }

		 /**
		  * Commit transaction and return summarized values
		  */
		 Transaction.prototype.commitAndGet = function() {

		 	// Freeze transaction
		 	this.freeze();

		 	// Feed all the events to the delegate
		 	var ans = [];
		 	for (k in this.metrics) {
		 		// Skip invalid values
		 		if (this.metrics[k].length == undefined) continue;

		 		// Create a summarized event data
		 		var data = this.metrics[k][1];

		 		// Prepend value
		 		data.unshift( this.metrics[k][2] );

		 		// Collect summarized metrics
		 		ans.push([
		 			this.metrics[k][0],	// Event
		 			data,				// Data
		 			this.metrics[k][3],	// Timestamp
		 		]);

		 	}

		 	// Collect non-summarizable events
		 	for (var i=0; i<this.nsMetrics.length; i++) {
		 		ans.push(
		 			this.nsMetrics[i]
		 		);
		 	}

		 	// Remove snapshot, we don't need this any more
		 	this.snapshotRemove();

		 	// Return answer
		 	return ans;

		 }

		return Transaction;

	}

);