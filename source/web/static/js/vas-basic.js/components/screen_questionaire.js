
define(

	// Requirements
	["jquery", "core/db", "core/ui", "core/config", "core/registry", "core/base/components", "core/apisocket"],

	/**
	 * Basic version of the questionaire screen
	 *
	 * @exports basic/components/questionaire
	 */
	function($, DB, UI, config, R,C, API) {

		/**
		 * @class
		 * @classdesc The basic team screen
		 */
		var QuestionaireScreen = function( hostDOM ) {
			C.QuestionaireScreen.call(this, hostDOM);


		}
		QuestionaireScreen.prototype = Object.create( C.QuestionaireScreen.prototype );


		// Register questionaire screen
		R.registerComponent( "screen.questionaire", QuestionaireScreen, 1 );

	}

);
