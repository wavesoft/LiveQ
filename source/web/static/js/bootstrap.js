
// Where resources are located
requirejs.config({

	// Base directory is the libraries folder
    baseUrl: 'static/js/lib',

    // Explicit declaration of components
    paths: {
    	'core': 	'../vas-core.js',
    	'io': 		'../liveq-io.js',
    	'vas-3d':   '../vas-3d.js',
        'vas-basic':'../vas-basic.js',
    }
});

// Bootstrap LiveQ Engine
requirejs(
    [
        
        // Core components required by bootstrap
        "jquery",
        "core/main",

        // Game modules
        "vas-basic/main",
        "vas-3d/modules/exp-3d",

	], 
    function($, main) {

        $(function() {

            // Initialize VAS 
            main.initialize();

            // Run
            main.run();

        });

    }
);