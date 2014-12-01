
define(["core/config"], 

	/**
	 * This module provides mathematical functions to be used in various locations.
	 *
	 * @exports core/util/math
	 */
	function (config) {

		/**
		 * Instantiate a new ProgressAggregator
		 *
		 * @class
		 * @classdesc The core math class which provides advanced mathematical operations.
		 */
		var CoreMath = { };

		/**
		 * Logarithmic mapping of a chi-square value using the bounds
		 * from the configuration
		 */
		CoreMath.mapChiSq = function( chiSq, min, max, mapFn ) {
			// Set default map function
			if (!mapFn) 
//				mapFn = function(v) { return v; };
				mapFn = function(v) { return Math.log(v) / Math.log(10); };

			// Check for basic bases
			var bMin = config['chi2-bounds']['min'],
				bMax = config['chi2-bounds']['max'];
			if (chiSq < bMin) return min;
			if (chiSq > bMax) return max;
			if ((chiSq == null) || (chiSq == undefined) || isNaN(chiSq)) return max;

			// Map values using the map function provided
			var lgMin = mapFn(bMin), lgMax = mapFn(bMax),
				lgV = mapFn(chiSq);

			// Linear interpolation on the scales
			return (max-min) / (lgMax-lgMin) * (lgV-lgMin) + min;

		}

		// Return progress aggreegator class
		return CoreMath;

	}

);