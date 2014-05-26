
define(["core/config", "core/util/component"], 

	function(config, Component) {

		/**
		 * The VAS Registry module.
		 *
		 * This module is the shared resource between the VAS Core and the VAS Implementation
		 * sides. It allows components and screens to be registered and then processed by the
		 * VAS core when needed.
		 *
		 * @exports core/registry
		 */
		var registry = {};

		/**
		 * This is a dictionary that contains the registered components,
		 * indexed by their name.
		 *
		 * This is where the user-provided modules should override defaults
		 * provided by the game core.
		 *
		 * @example <caption>Example of creating a custom component</caption>
		 * // my_module.js
		 * define(["core/registry", "core/components"],
		 *    function(R, C) {
		 *    
		 *       //
		 *       // Define a custom component, subclassing
		 *       // from a system component.
		 *       //
		 *       var MyTuningScreen = function() {
		 *          C.TuningScreen.call(this);
		 *       }
		 *       MyTuningScreen.prototype = Object.create(C.TuningScreen.prototype);
		 * 
		 *       // Put my custom component on registry, under the ID 'tuning_screen'
		 *       R.registerComponent('tuning_screen', MyTuningScreen);
		 *
		 *
	     *    }
	     * );
		 * @type {object}
		 */
		registry.components = {};

		/**
		 * Register a component under the given name.
		 *
		 * @param {string} name - The name of the component to register for
		 * @param {Component} component - The class of the component to register
		 */
		registry.registerComponent = function(name, component) {
			registry.components[name] = component;
		}

		/**
		 * Create an instance of the component defined by the given name.
		 * If the component does not exist, it creates an error component.
		 *
		 * @param {string} name - The name of the component to instance (from the registry)
		 * @returns {Component} - Returns a component instance
		 */
		registry.instanceComponent = function(name) {

			// Lookup the component
			var componentClass = registry.components[name];
			if (componentClass == undefined) {
				componentClass = Component;
			}

			// Instantiate
			var inst = new componentClass();
			inst.getDOMElement().addClass( config.css['screen'] );

			// Return instance
			return inst;

		}

		return registry;
	}

);