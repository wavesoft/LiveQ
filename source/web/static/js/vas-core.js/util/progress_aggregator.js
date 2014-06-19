
define(["core/util/event_base", "core/config"], 

	/**
	 * This module provides the ProgressAggregator class wich can be used to slice
	 * and group arbitrary progress events into a unified view.
	 *
	 * @exports core/util/progress_aggregator
	 */
	function (EventBase, config) {

		/**
		 * Instantiate a new ProgressAggregator
		 *
		 * @class
		 * @classdesc The ProgressAggregator class which organizes progress events.
		 * @see {@link module:core/util/event_base~EventBase|EventBase} (Parent class)
		 */
		var ProgressAggregator = function(parent, max) {

			// Initialize superclass
			EventBase.call(this);

			// Initialize parameters
			this._parent = parent;
			this._children = [];
			this._value = 0;

			this.max = max || 0;
			this.value = 0;

		}

		// Subclass from EventBase
		ProgressAggregator.prototype = Object.create( EventBase.prototype );

		/**
		 * Update the value of this node
		 * 
		 * @private
		 */
		ProgressAggregator.prototype._updateValue = function() {

			// Firstly, update value based on children
			this._value = 0;
			for (var i=0; i<this._children.length; i++) {
				this._children[i]._updateValue();
				this._value += this._children[i]._value;
			}

			// Then update value based on our current progress
			if (this.max) {
				this._value += (Math.min(this.value, this.max) / this.max);
				this._value /= (this._children.length+1);
			} else {
				this._value /= this._children.length;
			}

		}

		/**
		 * Notify update all the way down to the root
		 *
		 * @private
		 * @param {string} message - The message of the notification event
		 */
		ProgressAggregator.prototype._notifyUpdate = function(message) {
			if (!this._parent) {
				this._updateValue();
				this.trigger("progress", this._value, message);
				if ( Math.floor(this._value) == 1 )
					this.trigger("completed");
			} else {
				this._parent._notifyUpdate(message);
			}
		}

		/**
		 * Notify an error all the way to root
		 *
		 * @private
		 * @param {string} message - The error message for the notification
		 */
		ProgressAggregator.prototype._notifyError = function(message) {
			if (!this._parent) {
				this.trigger("error", message);
			} else {
				this._parent._notifyUpdate(message);
			}
		}

		/**
		 * Start a sub-task
		 *
		 * @param {int} max - The maximum number of steps this task contains
		 * @returns {ProgressAggregator} - Returns a new progress aggregator object.
		 */
		ProgressAggregator.prototype.begin = function(max) {
			var c = new ProgressAggregator(this, max || 1);
			this._children.push(c);
			return c;
		}

		/**
		 * Forward a task as completed
		 */
		ProgressAggregator.prototype.ok = function(message) {
			if (this.value < this.max) {
				this.value++;
				this._notifyUpdate(message);
			}
		}
		
		/**
		 * Mark the task as failed
		 */
		ProgressAggregator.prototype.fail = function(message) {
			this._notifyError(message);
		}

		/**
		 * Complete all possible tasks
		 */
		ProgressAggregator.prototype.complete = function(message) {
			this.value = this.max;
			this._notifyUpdate(message);
		}

		// Return progress aggreegator class
		return ProgressAggregator;

	}

);