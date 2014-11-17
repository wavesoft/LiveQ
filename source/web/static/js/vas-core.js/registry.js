
define(["core/config", "core/base/component"], 

	function(config, Component) {

		/**
		 * The VAS Registry module.
		 *
		 * This module is the shared resource between the VAS Core and the VAS Implementation
		 * sides. It allows components and screens to be registered and then processed by the
		 * VAS core when needed.
		 *
		 * The Virtual Atom Smasher core engine uses the following component IDs. If you want
		 * to override the default component you should register a custom component with the 
		 * same ID
		 *
		 * The following table enumerates the components 
		 * <table class="table">
		 *   <tr><th> Name </th><th> Module.Class </th><th> Weight </th><th> Used on </th></tr>
		 *   <tr>
		 *      <th> home_screen </th><td>{@link module:core/base/components~HomeScreen|core/base/components.HomeScreen}</td><td>1</td>
		 *      <td> This is a screen component (full-screen) which hosts the game's home screen. </td>
		 *   </tr>
		 *   <tr>
		 *      <th> explain_screen </th><td>{@link module:core/base/components~ExplainScreen|core/base/components.ExplainScreen}</td><td>1</td>
		 *      <td> This is a screen component where the user can browse descriptions for the tunable/observable parameters. </td>
		 *   </tr>
		 *   <tr>
		 *      <th> tuning_screen </th><td>{@link module:core/base/components~TuningScreen|core/base/components.TuningScreen}</td><td>1</td>
		 *      <td> This is a screen component that renders the user input screen. </td>
		 *   </tr>
		 *   <tr>
		 *      <th> running_screen </th><td>{@link module:core/base/components~RunningScreen|core/base/components.RunningScreen}</td><td>1</td>
		 *      <td> This is a screen component that displays the progress of the simulation. </td>
		 *   </tr>
		 *   <tr>
		 *      <th> nav_mini </th><td>{@link module:core/base/components~Nav|core/base/components.Nav}</td><td>1</td>
		 *      <td> This is a mini-bar for navigating the user. This component stays always on top and allows the user to change location. </td>
		 *   </tr>
		 * </table>
		 *
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
		 * define(["core/registry", "core/base/components"],
		 *    function(R, C) {
		 *    
		 *       //
		 *       // Define a custom component, subclassing
		 *       // from a system component.
		 *       //
		 *       var MyTuningScreen = function(hostDOM) {
		 *          C.TuningScreen.call(this, hostDOM);
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
		 * This is a dictionary that contains arbitrary data objects,
		 * indexed by their name.
		 *
		 * This can be used for defining scenes, timelines and other overridable
		 * objects in the game. Like with the components, the data dictionary
		 * also contain a priority attribute.
		 *
		 * @type {object}
		 */
		registry.data = {};

		/**
		 * This dictionary keeps a reference of all the DOM objects that
		 * are assisting the guided presentation of the interface through
		 * a VisualAgent.
		 *
		 * Any DOM object of interest can be registered to be presented by
		 * the current VisualAgent. Each object has a unique name, and if at any
		 * time you try to re-register the object in the registry, only the latest
		 * object will be reflected.
		 *
		 * @type {object}
		 */
		registry.visualAids = {};

		/**
		 * Register a component under the given name.
		 *
		 * If you are loading multiple modules and some of them are overloading others,
		 * it's not easy to track their load sequence. Therefore, you can provide the optional
		 * third parameter, which defines the **weight** of the component.
		 *
		 * Components with bigger weight override components with less weight. By default, the
		 * core components of the Virtual Atom Smasher have weight 1, so you can create your
		 * own customizations by having a weight bigger than or equal to 2.
		 *
		 * @param {string} name - The name of the component to register for
		 * @param {Component} component - The class of the component to register
		 * @param {integer} weight - The weight of this component (default: 5)
		 */
		registry.registerComponent = function(name, component, weight) {
			var w = weight || 5;

			// Check if we already have a component
			if (registry.components[name] != undefined) {
				if (registry.components[name].__weight >= w)
					return;
			}

			// Store component and it's weight
			component.__weight = w;
			component.prototype.__registryID = name;
			registry.components[name] = component;
			
		}

		/**
		 * Register a component for visual aid
		 *
		 * This function is used to register an arbitrary DOM element for use by the VisualAgent
		 * component which is introducing the user to the interface.
		 *
		 * @param {string} name - The name of the visual aid to register under.
		 * @param {DOMElement|Component} element - The DOM Element to focus when this visual aid is fired, or the hostDOM of the component.
		 * @param {object} elmMeta - (Optional) Additional metadata for this element such as classes to add, the screen it belongs, callbacks etc.
		 */
		registry.registerVisualAid = function(name, element, elmMeta) {
			var config = elmMeta || {};

			// Prepare config
			config.classes = config.classes || "";
			config.screen = config.screen || "";
			config.onBeforeFocus = config.onBeforeFocus || function(cb) { cb(); };
			config.onFocus = config.onFocus || function() {};
			config.onBeforeBlur = config.onBeforeBlur || function(cb) { cb(); };
			config.onBlur = config.onBlur || function() {};

			// Prepare element
			if (element instanceof Component) {
				config['element'] = element.hostDOM;
				config['component'] = element;
			} else {
				config['element'] = element;
				config['component'] = false;
			}

			// Store on visual aids
			registry.visualAids[name] = config;

		}

		/**
		 * Return the visual aid DOM element by it's ID
		 *
		 * @param {string} name - The name of the visual aid to fetch.
		 * @returns {DOMElement|undefined}
		 */
		registry.getVisualAid = function(name) {
			if (!registry.visualAids[name]) {
				console.warn("Registry: No visual aid with name '"+name+"' was registered!");
				return undefined;
			} else {
				return registry.visualAids[name].element;
			}
		}

		/**
		 * Return the visual aid metadata record by it's ID
		 *
		 * @param {string} name - The name of the visual aid to fetch.
		 * @returns {object|undefined}
		 */
		registry.getVisualAidMeta = function(name) {
			if (!registry.visualAids[name]) {
				console.warn("Registry: No visual aid with name '"+name+"' was registered!");
				return undefined;
			} else {
				return registry.visualAids[name]
			}
		}

		/**
		 * Create an instance of the component defined by the given name.
		 * If the component does not exist, it creates an error component.
		 *
		 * @param {string} name - The name of the component to instance (from the registry)
		 * @param {DOMElement} hostDOM - The DOM element where the component should be hosted in
		 * @returns {Component} - Returns a component instance or undefined if it was not found.
		 */
		registry.instanceComponent = function(name, hostDOM) {

			// Lookup the component
			var componentClass = registry.components[name];
			if (componentClass == undefined) {
				console.error("Registry: Could not instantiate component '"+name+"'. Not in registry!");
				return undefined;
			}

			// Instantiate
			var inst = undefined;
			//try {
				inst = new componentClass(hostDOM);

				// Prepare component
				var ofs = $(hostDOM).offset();
				inst.onResize( $(hostDOM).width(), $(hostDOM).height() );
				inst.onMove( ofs.left, ofs.top );
				inst.hide();

			//} catch (e) {
			//	console.error("Registry: Could not instantiate component '"+name+"'. Exception: ",e);
			//}

			// Return instance
			return inst;

		}

		/**
		 * Place a data object under the given name and weight.
		 *
		 * If you are loading multiple modules and some of them are overloading others,
		 * it's not easy to track their load sequence. Therefore, you can provide the optional
		 * third parameter, which defines the **weight** of the component.
		 *
		 * Components with bigger weight override data objects with less weight. By default, the
		 * core data objects of the Virtual Atom Smasher have weight 4, so you can create your
		 * own customizations by having a weight bigger than or equal to 5.
		 *
		 * @param {string} category - The general category of this data object
		 * @param {string} name - The name of the data object to register for
		 * @param {Object} data - The data payload to place in registry
		 * @param {integer} weight - The weight of this data entry (default: 5)
		 */
		registry.setData = function(category, name, data, weight) {
			var w = weight || 5;

			// Check for category
			if (registry.data[category] == undefined)
				registry.data[category] = {};

			// Check if we already have a component with
			// bigger weight than us.
			if (registry.data[category][name] != undefined) {
				if (registry.data[category][name].w >= w)
					return;
			}

			// Store data object and it's weight
			registry.data[category][name] = {
				'w': w,
				'o': data
			};
			
		}

		/**
		 * Fetch a data object previously registered with setData
		 *
		 * @param {string} category - The general category of this data object
		 * @param {string} name - The name of the data object to fetch
		 * @param {object} defaultValue - The default value to return if the object is missing
		 */
		registry.getData = function(category, name, defaultValue) {

			// Check for missing category
			if (registry.data[category] == undefined)
				return defaultValue;

			// Check for missing item
			if (registry.data[category][name] == undefined)
				return defaultValue;

			// Return data object
			return registry.data[category][name].o;

		}

		return registry;
	}

);