/**
 * [core/analytics/behaviour] - Analytics behaviour module
 */
define(["core/config"], 

	function(Config) {

		var BehaviourIndicator = function() {
			this.metrics = { };
		}

		/**
		 * Sum the value
		 */
		BehaviourIndicator.prototype.addSample = function( name, value, hint ) {
			if (this.metrics[name] == undefined)
				this.metrics[name] = [[], hint || 'sum'];
			this.metrics[0].push(value);
		}

		/**
		 * Behaviour analyzer
		 */
		var BehaviourTracker = function() {

			// Behaviour indicators
			this.analyzers = [];

		};

		// Return behaviour analyzer class
		return BehaviourTracker;

	}

);
