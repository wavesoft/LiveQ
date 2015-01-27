/**
 * [core/analytics/transaction] - Analytics transaction module
 */
define(["core/config", "core/analytics/transaction"], 

	function(Config, Transaction) {

		/**
		 * Analytics are initialized only on demand
		 */
		var Analytics = function() {

			// Prepare analytics stack
			this.stack = [];
			// Start by disabled
			this.enabled = false;
			// Start by being not expired
			this.expired = false;
			// Timestamp when the analytics class was initialized
			this.initializedAt = Date.now();
			// Wait 10 seconds until an analytics listener appears
			this.timeoutTime = this.initializedAt + 10000;
			// The analytics listener
			this.listener = null;

			// Timers
			this.timers = { };

			// Global properties
			this.globals = { };

			// Start probe timer
			this.probeTimer = setInterval(this.probeListener.bind(this), 100);

			// Commit past transactions
			this.commitTransactions();

		}

		/**
		 * Trigger an analytics action
		 */
		Analytics.prototype.probeListener = function() {
			// Check if we are enabled or expired
			if (this.enabled || this.expired) return;

			// Check if we expired
			if (Date.now() > this.timeoutTime) {
				clearInterval(this.probeTimer);
				this.expired = true;
				this.stack = [];
				return;
			}

			// Don't continue if there is no analytics listener
			if (!window.analyticsListener) return;

			// Stop probe timer
			clearInterval(this.probeTimer);
			// Keep reference of analytics listener
			this.listener = window.analyticsListener;
			// We are now enabled
			this.enabled = true;
			// Flush stack
			for (var i=0; i<this.stack.length; i++)
				this.send(this.stack[i][0], this.stack[i][1]);
			this.stack = [];

		}

		/**
		 * Trigger the analytics event
		 */
		Analytics.prototype.fireEvent = function( eventName, data, replace ) {

			// Check for listener
			this.probeListener();

			// Append globals
			for (k in this.globals)
				data[k] = this.globals[k];

			// Debug log
			console.log("Analytics: ", eventName, data);

			// If we are expired, exit
			if (this.expired) return;

			// Forward or stack it
			if (!data) data=[];
			if (this.enabled) {
				this.send(eventName, data);
			} else {
				// If action is already on stack, change it's data
				if (replace) {
					for (var i=0; i<this.stack.length; i++) {
						if (this.stack[i][0] == eventName) {
							this.stack[i] = [eventName, data];
							return;
						}
					}
				}
				// Otherwise, push on stack
				this.stack.push([eventName, data]);
			}

		}

		/**
		 * Send the analytics event without the stack
		 */
		Analytics.prototype.send = function( eventName, data ) {

			// Append timestamp if missing
			if (data.ts == undefined)
				data.ts = Date.now();

			// Fire the event listener
			if (this.listener) {
				try {
					// Backwards compatibility
					if (this.listener === true) {
						$(window).trigger('analytics.'+eventName, [data]);
					} else {
						// New version just calls the listener
						this.listener(eventName, data);
					}
				} catch (e) { };
			}
		}

		/**
		 * Set a global property
		 */
		Analytics.prototype.setGlobal = function( name, value ) {
			// Update global property
			this.globals[name] = value;
		}

		/**
		 * Commit all open transactions
		 */
		Analytics.prototype.commitTransactions = function() {

			// Check for old transactions
			var transValue = localStorage.getItem("analytics.transaction.list") || "[]",
				transactions = JSON.parse( transValue );

			// Commit and flush them now
			for (var i=0; i<transactions.length; i++) {

				// Restore transaction
				var T = Transaction.snapshotRestore(transactions[i]);
				if (!T) continue;

				// Flush it now
				var toSend = T.commitAndGet();
				for (var j=0; j<toSend.length; j++) {

					// Send data
					this.fireEvent( toSend[0], toSend[1] );

				}

			}

		}

		/**
		 * Begin/Continue a transaction
		 */
		Analytics.prototype.transaction = function( name ) {

			// Create a new transaction

		}


		/**
		 * Start a timer with the given name
		 */
		Analytics.prototype.startTimer = function(name) {
			// If timer is already started, don't start
			if (this.timers[name] !== undefined) return;
			// Store the current time in the given timer
			this.timers[name] = Date.now();
		}

		/**
		 * Restart a timer with the given name
		 */
		Analytics.prototype.restartTimer = function(name) {
			// If we already have a timer, get current duration
			var duration = this.stopTimer(name);
			// Replace timer start time
			this.timers[name] = Date.now();
			// Return duration
			return duration;
		}

		/**
		 * Stop a timer with the given name and return
		 * the time spent.
		 */
		Analytics.prototype.stopTimer = function(name) {
			// Check for invalid timers
			if (!this.timers[name]) return 0;
			// Stop timer and get duration
			var duration = Date.now() - this.timers[name];
			delete this.timers[name];
			// Return duration
			return duration;
		}


		// Create and return an analytics instance
		var analytics = new Analytics();
		return analytics;

	}

);