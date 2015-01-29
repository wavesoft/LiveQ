/**
 * [core/analytics/behaviour] - Analytics behaviour module
 */
define(["core/config"], 

	function(Config) {

		var BehaviourIndicator = function( name ) {

			/**
			 * Indicator name
			 */
			this.name = name;

			/**
			 * Indicator metrics
			 */
			this.metrics = { };

			/**
			 * Summarization functions
			 */
			this.sumFunctions = { };

		}

		/**
		 * Define the way we are going to summarize each sample
		 *
		 * @param {object} definition - A dictionary with the metrics name and their summarization function
		 */
		BehaviourIndicator.prototype.summarizeAs = function( definition ) {

			this.sumFunctions = definition;
		}

		/**
		 * Add a sample to the indicator, using the summarization
		 * hint provided in the hint parameter.
		 *
		 * @param {string} name - The metric name
		 * @param {any} value - The metric value
		 * @param {string} hint - The summarization function to use for this metric
		 */
		BehaviourIndicator.prototype.addSample = function( name, value ) {

			// Make sure we have that metric array
			if (this.metrics[name] == undefined)
				this.metrics[name] = [];

			// Push sample
			this.metrics.push(value);

		}

		/**
		 * Summarize samples with the appropriate function and return
		 * a dictionary with their values.
		 */
		BehaviourIndicator.prototype.getSamples = function() {

		}

		/**
		 * Return a "score" for this indicator, by summarizing the metrics
		 * collected in the way they were defined.
		 */
		BehaviourIndicator.prototype.getScore = function( name, value ) {
		}

		// Return behaviour indicator
		return BehaviourIndicator;

	}

);
