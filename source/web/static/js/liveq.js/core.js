
define(

	[ "liveq/LiveQ", "liveq/LabSocket" ]

	/**
	 * Initialize LiveQ subsystem
	 *
	 * @exports liveq/main
	 */
	function( LiveQ, LabSocket ) {

		/**
		 * LiveQ Core namespace
		 */
		var Core = { };

		/**
		 * Connect, initialize and return a lab socket instance
		 */
		Core.openLabSocket = function( labID ) {

		}


		// Return core class
		return Core;

	}

);
