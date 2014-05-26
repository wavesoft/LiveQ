
define(

	/**
	 * This module provides the {@link EventBase} class which
	 * is used in other places in this project for forwarding events
	 * to interested parties.
	 *
	 * @exports core/util/event_base
	 */
	function() {

	/**
	 * Initialize the event class.
	 *
	 * This class provides the bare minimum functionality for
	 * event forwarding. When a receiver wants to listen for
	 * events he should register a handler with the {@link module:core/util/event_base~EventBase#on|on()}
	 * function. 
	 *
	 * After this point, any call to {@link module:core/util/event_base~EventBase#fireEvent|fireEvent()} will trigger
	 * all the listeners that are listening on this event.
	 *
	 * You can opt-out from the listening list using the {@link module:core/util/event_base~EventBase#off|off()}.
	 *
	 * @class
	 * @classdesc Base class for implementing basic event pub/sub functionality.
	 */
	var EventBase = function() {
		this.__eventCallbacks = {};
	}

	/**
	 * Register a handler that will be called when the specified
	 * named event is fired with the {@link module:core/util/event_base~EventBase#fireEvent|fireEvent()}.
	 *
	 * @param {String} name - The name of the event
	 * @param {function} handler - The handler to add to the listeners
	 */
	EventBase.prototype.on = function(name, handler) {
		if (this.__eventCallbacks[name] == undefined)
			this.__eventCallbacks[name] = [];
		this.__eventCallbacks[name].push(handler);
	}

	/**
	 * Unregister from the event list.
	 *
	 * @param {String} name - The name of the event
	 * @param {function} handler - The handler to remove from the listeners
	 */
	EventBase.prototype.off = function(name, handler) {
		if (this.__eventCallbacks[name] == undefined)
			return;
		// Remove event callback
		var i = this.__eventCallbacks[name].indexOf(handler);
		this.__eventCallbacks[name].splice(i,1);
		// Remove event if blank
		if (this.__eventCallbacks[name].length == 0)
			delete this.__eventCallbacks[name];
	}

	/**
	 * Fire an event
	 *
	 * @param {String} name - The name of the event
	 * @param {array} args - The arguments to pass to the listener handlers
	 */
	EventBase.prototype.fireEvent = function(name, args) {
		// Require existing event
		if (this.__eventCallbacks[name] == undefined)
			return;
		// Fire callbacks
		for (var i=0; i<this.__eventCallbacks[name].length; i++) {
			this.__eventCallbacks[name][i].apply(this, args);
		}
	}

	return EventBase;

});