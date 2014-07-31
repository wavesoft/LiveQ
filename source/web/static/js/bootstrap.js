
// Where resources are located
requirejs.config({

	// Base directory is the libraries folder
    baseUrl: 'static/js/lib',

    // Explicit declaration of components
    paths: {
    	'core'         : '../vas-core.js',
    	'liveq'        : '../liveq.js',
    	'vas-3d'       : '../vas-3d.js',
        'vas-basic'    : '../vas-basic.js',
        'vas-editor'   : '../vas-editor.js'
    }
});

// Bootstrap LiveQ Engine
requirejs(
    [
        
        // Core components required by bootstrap
        "jquery",
        "core/main",
        "liveq/core",

        // Game modules
        "vas-basic/main",
        "vas-3d/main",

	], 
    function($, main) {

        $(function() {

            // Initialize VAS 
            main.initialize(function() {

                // Wait until VAS is ready and run it
                main.run();

            });

        });

    }
);