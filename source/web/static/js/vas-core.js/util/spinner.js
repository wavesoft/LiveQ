
define(

	function() {

		/**
		 * A helper spinner class, used to implement click-and-hold spinning
		 * for the values.
		 *
		 * The config object must have the following fields:
		 *
		 *    {
		 *      value: 0.0,   // The starting value of the spinner
		 *      dec: 4,       // The number of decimals in the value
		 *      min: 0.0,     // The minimum value
		 *      max: 1.0      // The maximum value
		 *    }
		 *
		 *
		 * @param {object} config - The configuration and initial value of the spinner
		 * @param {function(value)} - A callback that will be fired when the value is changed
		 */
		var Spinner = function(config, callback) {

		  // Reference
		  this.value = config.value || 0.0;
		  this.decimals = config.dec || 4;
		  this.min = config.min || 0.0;
		  this.max = config.max || 1.0;
		  this.callback = callback;

		  // Values
		  this.stepDecimals = this.decimals;
		  this.timerStep = null;
		  this.timerIncrease = null; 
		  this.timerForward = null;

		  // Function to perform a step
		  var self = this;
		  this.doStep = function(direction) {

		    // Update value according to current step
		    var step = Math.pow(10, -self.stepDecimals);
		    self.value += direction * step;

		    // Skip decimal bunches
		    self.value = parseFloat( self.value.toFixed(self.stepDecimals) );

		    // Wrap bounds
		    if (self.value < self.min) self.value = self.min;
		    if (self.value > self.max) self.value = self.max;

		    // Callback
		    if (self.callback)
		      self.callback(self.value);
		  }

		}

		/**
		 * Start the spinner (mouse down)
		 *
		 * @param {int} direction - Should be 1 for spinning upwards or -1 for spinning downwards
		 *
		 */
		Spinner.prototype.start = function(direction) {
		  var self = this;

		  // Reset decimal counter
		  this.stepDecimals = this.decimals;

		  // Immediately do a ste
		  self.doStep(direction);

		  // Delaied initialization of fast spinners
		  self.timerForward = setTimeout(function() {

		    // Step timer
		    self.timerStep = setInterval(function() {
		      self.doStep(direction);
		    }, 100);

		    // Timer for increasing step
		    self.timerIncrease = setInterval(function() {

		      // Increse steps every 1.5 seconds
		      if (self.stepDecimals > 1) {
		        self.stepDecimals -= 1;
		      }

		    }, 1500);

		  }, 250);

		}

		/**
		 * Stop the spinner
		 */
		Spinner.prototype.stop = function() {

		  // Clear timers to stop the spinner
		  if (this.timerStep != null) {
		    clearInterval(this.timerStep);
		    this.timerStep = null;
		  };
		  if (this.timerIncrease != null) {
		    clearInterval(this.timerIncrease);
		    this.timerIncrease = null;
		  };
		  if (this.timerForward != null) {
		    clearInterval(this.timerForward);
		    this.timerForward = null;
		  };

		}

		// Return spinner instance
		return Spinner;

	}
	
);