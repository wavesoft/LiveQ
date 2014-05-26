
// Where resources are located
requirejs.config({

	// Base directory is the libraries folder
    baseUrl: 'static/js/lib',

    // Explicit declaration of components
    paths: {
    	'core': 	'../vas-core.js',
    	'io': 		'../liveq-io.js',
    	'vas-3d':   '../vas-3d.js'
    }
});

// Bootstrap LiveQ Engine
requirejs(
    [
        "jquery",
        "vas-3d/modules/exp-3d",
        "core/main"
	], 
    function($, game, main) {

        $(function() {
            // Initialize & run VAS Game
            main.run(game);
        });

    }
);