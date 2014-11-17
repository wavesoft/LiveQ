
define({

	/**
	 * The DOM element where the whole game is going to be
	 * developed around.
	 */
	'dom-host' 			: '#game-frame',

	/**
	 * LiveQ-Specific configuration
	 */
	'liveq' : {
		'socket_url'	: 'wss://test4theory.cern.ch/vas/labsocket/'
	},

	/**
	 * Community
	 */
	'core' : {
		'socket_url'	: 'ws://test.local:8080/vas/apisocket' //'wss://test4theory.cern.ch/vas/communitysocket'
	},

	/**
	 * CouchDB Database Configuration
	 */
	'db': {
		'url' 			: '//test4theory.cern.ch/vas/db',
		'databases'		: {
			'tunables'		: 'tunables',
			'observables'	: 'observables',
			'levels'		: 'levels',
		}
	},

	/**
	 * Configurable classes for various components
	 */
	'css': {
		'nav-mini'		: 'nav-mini',
		'screen'		: 'screen',
		'overlay'		: 'overlay',
		'backdrop'		: 'backdrop',
		'foreground'	: 'foreground',
		'error-screen' 	: 'error-screen',
	},

	/**
	 * Color transition points between good-average-bad values,
	 * normalized to 1.0.
	 */
	'chi2-bounds': {
		'min'		: 0.1,
		'good'		: 1,
		'average'	: 4,
		'max'		: 500,
	},

	/**
	 * Voice API
	 */
	'voiceapi': {
		'baseURL'	: "//test4theory.cern.ch/voiceapi",
		'api_key'	: "9b7b04b2ebc87af8723d09b4123f1c8fe62dad75"
	}

});