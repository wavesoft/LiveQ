/**
 * [core/analytics/behaviour] - Analytics behaviour module
 */
define(["core/config"], 

	function(Config) {

		var BehaviourCounter = function() {
			this.metrics = { };
		}

		/**
		 * Sum the value
		 */
		BehaviourCounter.prototype.addSample = function( name, value, hint ) {
			if (this.metrics[name] == undefined)
				this.metrics[name] = [[], hint || 'sum'];
			this.metrics[0].push(value);
		}

		/**
		 * Behaviour analyzer
		 */
		var BehaviourMatrix = function() {

			// Analyzers bound
			this.analyzers = [];

		};

		// Return behaviour analyzer class
		return BehaviourMatrix;

	}

);
