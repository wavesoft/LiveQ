
define(

	// Requirements
	["core/registry", "core/base/components"],

	/**
	 * Basic version of the machine backdrop
	 *
	 * @exports basic/components/backdrop_machine
	 */
	function(R,C) {

		/**
		 * @class
		 * @classdesc The basic machine backdrop screen
		 */
		var MachineBackdrop = function( hostDOM ) {
			C.Backdrop.call(this, hostDOM);
 
			// Fetch machines
			

		}
		MachineBackdrop.prototype = Object.create( C.Backdrop.prototype );

		// Register machine backdrop screen
		R.registerComponent( "backdrop.machine", MachineBackdrop, 1 );

	}

);