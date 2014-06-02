
define(["three"], 

	/**
	 * This module provides the {@link EventBase} class which
	 * is used in other places in this project for forwarding events
	 * to interested parties.
	 *
	 * @exports vas-3d/com/explain_scene
	 */
	function(THREE) {
	
		/**
		 * @class
		 */
		var ExplainScene = function() {

			/**
			 * Initialize the scene object which is going to host
			 * the rest of the components.
			 */
			this.scene = new THREE.Scene();

			/**
			 * The suggested focal z-index of the camera
			 */
			this.focalDepth = 1800;

			/**
			 * The opacity of the materials
			 */
			this.opacity = 1.0;

		};

		/**
		 * Upate the elements on the scene
		 * @param {integer} delta - The time (in milliseconds) since the last update
		 */
		ExplainScene.prototype.update = function(delta) {
		}

		/**
		 * Change the opacity of all the materials in the scene
		 * @param {float} opacity - The opacity of the scene
		 */
		ExplainScene.prototype.setOpacity = function(opacity) {
			this.opacity = opacity;
		}

		// Return scene
		return ExplainScene;

	}

);