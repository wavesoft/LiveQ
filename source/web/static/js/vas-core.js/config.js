
define({

	/**
	 * The DOM element where the whole game is going to be
	 * developed around.
	 */
	'dom-host' 			: '#game-frame',

	/**
	 * CouchDB Database Configuration
	 */
	'db': {
		'url' 			: 'http://test4theory.cern.ch/vas/db',
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
	'values': {
		'good-average'	: 0.2,
		'average-bad'	: 0.5,
	}

});