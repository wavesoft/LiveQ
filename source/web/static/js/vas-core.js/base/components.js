
define(["core/config", "core/base/component" ], 

	/**
	 * This module provides the base classes for various root
	 * components used in Virtual Atom Smasher.
	 * 
	 * If you are writing your own component, you must subclass them
	 * from the root components defined in this module.
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
	 *       R.registerComponent('screen.tuning', MyTuningScreen);
	 *
	 *
     *    }
     * );
 	 * @exports core/base/components
	 */
	function(config, Component) {


		////////////////////////////////////////////////////////////

		/**
		 * Initializes a new TuningScreen Component.
		 *
		 * This component is displayed when the user is tuning the Monte-Carlo
		 * generator. Before calling the component's {@link module:core/base/component~Component#focus|focus()} function
		 * the functions setTunables and setObservables are fired.
		 *
		 * For further dynamic updates, each tunable and observable class provide a dynamic
		 * feedback mechanism.
		 *
		 * @class
		 * @classdesc Abstract class for the tuning screen where the user can tune the configuration.
		 * @param {DOMElement} hostDOM - The DOM element where the component should be hosted in
		 * @see {@link module:core/base/component~Component|Component} (Parent class)
		 *
		 */
		var TuningScreen = function( hostDOM ) {

			// Initialize base class
			Component.call(this, hostDOM);

		}

		// Subclass from Component
		TuningScreen.prototype = Object.create( Component.prototype );

		/**
		 * Define the tunable parameters
		 *
		 * Each parameter has the following format, as shown in the example:
		 * @example <caption>Tunable configuration</caption>
		 * myDashboard.setTunables([
		 *    {
	     *           id: 'num-01', // The index ID of the tunable
	     *         type: 'num',    // One of: num,str,list,bool
	     *          def: 0,        // The default value for this element
	     *         value: {        // Value metadata, for 'num' type:
	     *            min: 0,      //   The minimum value
	     *            max: 10,     //   The maximum value
	     *            dec: 2       //   The decimals on the number
	     *         },
	     *         info: {         // Information for the user:
		 *           name: '...',  //   The visible name for this parameter
		 *          short: 'N01',  //   A short (iconic) name for this parameter
		 *           book: 'r-01', //   Reference ID for providing more explaination 
	     *         },
	     *         corr: {         // Correlation information
		 *            obs: [       // Correlation to objservables 
		 *               {
	     *                  id: '.',    // The objservable ID
	     *                   w: 1,      // The correlation weight between 0 (unimportant) and 3 (most important)
	     *                info: {       // The same as the previous 'info' entry
	     *                    ...
	     *                   },
	     *                auto: {       // Automation information (not used yet)
	 	 *                    ...
	     *                   }
		 *               }
		 *            ],
		 *            tun: [ .. ]	// Correlation to other tunables (same as above)
	     *         }
		 *    },
		 *    ...
		 * ]);
		 * @abstract
		 * @param {array} tunables - The tunable parameters
		 */
		TuningScreen.prototype.onTunablesDefined = function(tunables) {
		};

		/**
		 * Define the observable parameters
		 *
		 * Each parameter has the following format, as shown in the example:
		 * @example <caption>Tunable configuration</caption>
		 * myDashboard.setObservables([
		 *    {
	     *           id: 'obs-01', // The index ID of the observable
	     *         type: 'h2',	   // One of: h1 (Histo 1D), h2 (Histo 2D), 
	     *         meta: {         // Metadata for the histogram (dependant per type)
	     *            ...
	     *         }
	     *         info: {         // Information for the user:
		 *           name: '...',  //   The visible name for this parameter
		 *          short: 'N01',  //   A short (iconic) name for this parameter
		 *           book: 'r-01', //   Reference ID for providing more explaination 
	     *         },
	     *         corr: {         // Correlation information
		 *            obs: [       // Correlation to other objservables 
		 *               {
	     *                  id: '.',    // The objservable ID
	     *                   w: 1,      // The correlation weight between 0 (unimportant) and 3 (most important)
	     *                info: {       // The same as the previous 'info' entry
	     *                    ...
	     *                   },
	     *                auto: {       // Automation information (not used yet)
	 	 *                    ...
	     *                   }
		 *               }
		 *            ],
		 *            tun: [ .. ]	// Correlation to tunables (same as above)
	     *         }
		 *    },
	     *    ...
		 * ]);
		 * @abstract
		 * @param {array} observabes - The tunables record, as before
		 */
		TuningScreen.prototype.onObservablesDefined = function(observables) {
		};

		/**
		 * Define the level structure information
		 *
		 * The structure is explaine in the following example:
		 * @example <caption>Level configuration</caption>
		 * myDashboard.setLevelStructure([
		 *    {
		 *       tun: [ 'num-01', ... ],  // List of tunables to use
		 *       obs: [ 'obs-01', ... ],  // List of observables to use
		 *     feats:                     // Machine features available in this level
		 *        [                       // this information updates the machine diagram.
		 *           'beam', 'event'
		 *        ]
		 *     train: [                   // Training packages required in order
		 *        {                       // to play in this level
	     *           id: 'train-01',      // The reference to the training package
		 *        },
		 *        ...
		 *     ]
		 *    },
	     *    ...
		 * ]);
		 * @abstract
		 * @param {array} observabes - The tunables record, as before
		 */
		TuningScreen.prototype.onLevelsDefined = function(observables) {
		};

		/**
		 * Select and enable interface controls for the specified level
		 *
		 * @abstract
		 * @param {int} targetLevel - A zero-based index of the level to activate
		 */
		TuningScreen.prototype.onSelectLevel = function( targetLevel ) {
		}

		////////////////////////////////////////////////////////////
		/**
		 * Initializes a new LoginScreen Component.
		 *
		 * This component is displayed during application startup and it's used to log the user
		 * in the game.
		 *
		 * @class
		 * @classdesc User log-in screen component.
		 * @param {DOMElement} hostDOM - The DOM element where the component should be hosted in
		 * @see {@link module:core/base/component~Component|Component} (Parent class)
		 *
		 */
		var LoginScreen = function( hostDOM ) {

			// Initialize base class
			Component.call(this, hostDOM);

		}

		// Subclass from Component
		LoginScreen.prototype = Object.create( Component.prototype );

		/**
		 * An error occured while trying to log the user in.
		 *
		 * @abstract
		 * @param {int} status - The log-in status (0=idle, 1=logging-in, 2=failed)
		 * @param {string} message - The reason behind this error.
		 */
		LoginScreen.prototype.onLoginStatus = function( status, message ) {
		};


		////////////////////////////////////////////////////////////
		/**
		 * Initializes a new RunningScreen Component.
		 *
		 * This component is displayed when the user submits his/her tune and the machinery
		 * infrastructure is set-up for him/her.
		 *
		 * @class
		 * @classdesc Abstract class for the running screen where the user can see the run results.
		 * @param {DOMElement} hostDOM - The DOM element where the component should be hosted in
		 * @see {@link module:core/base/component~Component|Component} (Parent class)
		 *
		 */
		var RunningScreen = function( hostDOM ) {

			// Initialize base class
			Component.call(this, hostDOM);

		}

		// Subclass from Component
		RunningScreen.prototype = Object.create( Component.prototype );

		/**
		 * Define the tunable configuration.
		 *
		 * @abstract
		 * @param {array} tunables - A list of Tunable classes, one for each tunable.
		 */
		RunningScreen.prototype.onTunablesDefined = function(tunables) {
		};

		/**
		 * Define the observable configuration.
		 *
		 * @abstract
		 * @param {array} observables - A list of Observable classes, one for each observable.
		 */
		RunningScreen.prototype.onObservablesDefined = function(observables) {
		};

		/**
		 * Add information regarding a new machine.
		 *
		 * @abstract
		 * @param {Machine} machine - A machine instance which contains additional information regarding the computing node.
		 */
		RunningScreen.prototype.onMachineAdded = function(machine) {
		};

		/**
		 * Remove information regarding a running machine
		 *
		 * @abstract
		 * @param {Machine} machine - A machine instance which contains additional information regarding the computing node.
		 */
		RunningScreen.prototype.onMachineRemoved = function(machine) {
		};


		////////////////////////////////////////////////////////////
		/**
		 * Initializes a new ExplainScreen Component.
		 *
		 * This component is displayed when the user is being explained a particular parameter
		 * of the generator.
		 *
		 * This should be an easy-to-understand component, from which the user might
		 * inquire to get more information. The navigation and presentation of the additiona
		 * information relies solely on the component.
		 *
		 * **Note:** This component might be shown as picture-in-picture, so make sure it can 
		 * squeeze into smaller resolutions without loosing information.
		 *
		 * @class
		 * @classdesc Abstract clas for the running screen where the user can tune the configuration.
		 * @param {DOMElement} hostDOM - The DOM element where the component should be hosted in
		 * @see {@link module:core/base/component~Component|Component} (Parent class)
		 *
		 */
		var ExplainScreen = function( hostDOM ) {

			// Initialize base class
			Component.call(this, hostDOM);

		}

		// Subclass from Component
		ExplainScreen.prototype = Object.create( Component.prototype );

		/**
		 * Define the tunable configuration.
		 *
		 * @abstract
		 * @param {array} tunables - A list of Tunable classes, one for each tunable.
		 */
		ExplainScreen.prototype.onTunablesDefined = function(tunables) {
		};

		/**
		 * Define the observable configuration.
		 *
		 * @abstract
		 * @param {array} observables - A list of Observable classes, one for each observable.
		 */
		ExplainScreen.prototype.onObservablesDefined = function(observables) {
		};

		/**
		 * Define the scene configuration.
		 *
		 * @abstract
		 * @param {array} scenes - A list of scene timelines, one for each observable.
		 */
		ExplainScreen.prototype.onScenesDefined = function(scenes) {
		};

		/**
		 * Define the machine layout configuration.
		 *
		 * @abstract
		 * @param {array} layout - A list of nodes to link in order to render the machine layout.
		 */
		ExplainScreen.prototype.onMachineLayoutDefined = function(layout) {
		};

		/**
		 * Focus to the particular parameter
		 *
		 * @abstract
		 * @param {string} name - The name of the parameter to focus upon
		 */
		ExplainScreen.prototype.onParameterFocus = function(name) {
			
		};

		////////////////////////////////////////////////////////////
		/**
		 * Initializes a new HomeScreen Component.
		 *
		 * This component is displayed as an introduction to the game. This is where the user gets
		 * introduced, and a dashboard is displayed.
		 *
		 * @class
		 * @classdesc Abstract clas for the home screen where the user sees an overview.
		 * @param {DOMElement} hostDOM - The DOM element where the component should be hosted in
		 * @see {@link module:core/base/component~Component|Component} (Parent class)
		 *
		 */
		var HomeScreen = function( hostDOM ) {

			// Initialize base class
			Component.call(this, hostDOM);

		}

		// Subclass from Component
		HomeScreen.prototype = Object.create( Component.prototype );

		/**
		 * Set the user statistics.
		 *
		 * @abstract
		 * @param {array} tunables - A list of Tunable classes, one for each tunable.
		 */
		HomeScreen.prototype.onUserStatistics = function(tunables) {
		};

		////////////////////////////////////////////////////////////
		/**
		 * Initializes a new Progress Screen Component.
		 *
		 * This component is used for keeping the user busy while a long-lasting event is in progress.
		 *
		 * @class
		 * @classdesc Abstract class for defining backdrop images.
		 * @param {DOMElement} hostDOM - The DOM element where the component should be hosted in
		 * @see {@link module:core/base/component~Component|Component} (Parent class)
		 *
		 */
		var ProgressScreen = function( hostDOM ) {

			// Initialize base class
			Component.call(this, hostDOM);

		}

		// Subclass from Component
		ProgressScreen.prototype = Object.create( Component.prototype );

		/**
		 * Set the current progress status.
		 *
		 * @abstract
		 * @param {float} position - A number indicating the progress position (between 0.0 and 1.0)
		 * @param {string} message - A string representing the current task in action
		 */
		ProgressScreen.prototype.onProgress = function(position, message) {
		};

		/**
		 * Mark the progress as completed
		 *
		 * @abstract
		 */
		ProgressScreen.prototype.onProgressCompleted = function() {
		};

		/**
		 * Mark a progress error
		 *
		 * @abstract
		 */
		ProgressScreen.prototype.onProgressError = function() {
		};


		////////////////////////////////////////////////////////////
		/**
		 * Initializes a new Nav Component.
		 *
		 * This component is used for letting the user navigate around the game.
		 *
		 * @class
		 * @classdesc Abstract class for navigation controls.
		 * @param {DOMElement} hostDOM - The DOM element where the component should be hosted in
		 * @see {@link module:core/base/component~Component|Component} (Parent class)
		 *
		 */
		var Nav = function( hostDOM ) {

			// Initialize base class
			Component.call(this, hostDOM);

		}

		// Subclass from Component
		Nav.prototype = Object.create( Component.prototype );

		/**
		 * This function is called when the user starts to navigate navigates to the specified page.
		 *
		 * @abstract
		 * @param {string} newPage - The name of the new page
		 * @param {string} oldPage - The name of the old page
		 */
		Nav.prototype.onPageWillChange = function(newPage, oldPage) {

		};

		/**
		 * This function is called when the user navigates to the specified page.
		 *
		 * @abstract
		 * @param {string} newPage - The name of the new page
		 * @param {string} oldPage - The name of the old page
		 */
		Nav.prototype.onPageChanged = function(newPage, oldPage) {

		};

		////////////////////////////////////////////////////////////
		/**
		 * Initializes a new Backdrop Component.
		 *
		 * This component is used as background (backdrop) for other components.
		 *
		 * @class
		 * @classdesc Abstract class for defining backdrop images.
		 * @param {DOMElement} hostDOM - The DOM element where the component should be hosted in
		 * @see {@link module:core/base/component~Component|Component} (Parent class)
		 *
		 */
		var Backdrop = function( hostDOM ) {

			// Initialize base class
			Component.call(this, hostDOM);

		}

		// Subclass from Component
		Backdrop.prototype = Object.create( Component.prototype );

		////////////////////////////////////////////////////////////
		//             Event definitions for JSDoc                //
		////////////////////////////////////////////////////////////

		/**
		 * This event is fired by the home screen in order to focus on another
		 * screen.
		 *
		 * @event module:core/base/components~HomeScreen#changeScreen
		 */

		/**
		 * This event is fired by the home screen in order to start playing
		 * a level of a particular ID
		 *
		 * @param {int} level - A zero-based index of the level
		 * @event module:core/base/components~HomeScreen#playLevel
		 */

		/**
		 * This event should be fired when the user wants to abort the running
		 * simulation.
		 *
		 * @event module:core/base/components~RunningScreen#abortRun		
		 */

		/**
		 * This event should be fired when the tunable parameters are changed.
		 * In principle this event will trigger the interpolation and therefore
		 * will fire the respective updates on the tunable histograms.
		 *
		 * @param {object} parameters - A key/value pair with the tunable name and it's value.
		 * @event module:core/base/components~TuningScreen#changeParameters		
		 */

		/**
		 * This event should be fired when the user wants to submit the values.
		 *
		 * @param {object} parameters - A key/value pair with the tunable name and it's value.
		 * @event module:core/base/components~TuningScreen#submitParameters		
		 */

		/**
		 * This event should be fired when the user wants more information regarding a particular parameter.
		 *
		 * @param {string} parameter - The name of the parameter to request explaination for
		 * @event module:core/base/components~TuningScreen#explainParameter		
		 */

		/**
		 * This event should be fired when more information should be displayed regarding
		 * another parameter.
		 *
		 * @param {string} parameter - The name of the parameter to request explaination for
		 * @event module:core/base/components~ExplainScreen#explainParameter		
		 */

		/**
		 * This event should be fired when more information should be displayed regarding
		 * another parameter.
		 *
		 * @param {string} game_id - The ID of the game to launch
		 * @event module:core/base/components~ExplainScreen#openGame		
		 */

		/**
		 * This event should be fired when more information should be displayed, but rely
		 * on an external domain. This will open a smaller window-in-window instead of
		 * redirecting the user.
		 *
		 * @param {string} url - The URL to navigate to
		 * @event module:core/base/components~ExplainScreen#openURL		
		 */

		/**
		 * This event should be fired by the LoginScreen when the usre attempts to log-in.
		 *
		 * @param {string} username - The user name
		 * @param {string} password - The user password
		 * @event module:core/base/components~LoginScreen#login		
		 */

		////////////////////////////////////////////////////////////

		// Expose components
		var components = {
			'TuningScreen'		: TuningScreen,
			'RunningScreen'		: RunningScreen,
			'ExplainScreen' 	: ExplainScreen,
			'HomeScreen'		: HomeScreen,
			'ProgressScreen'	: ProgressScreen,
			'Nav'				: Nav,
			'Backdrop'			: Backdrop,
			'LoginScreen'		: LoginScreen
		};

		return components;

	}
);