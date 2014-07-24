
// Where resources are located
requirejs.config({

	// Base directory is the libraries folder
    baseUrl: 'static/js/lib',

    // Explicit declaration of components
    paths: {
    	'core': 	'../vas-core.js',
    	'liveq': 	'../liveq.js',
    	'vas-3d':   '../vas-3d.js',
        'vas-basic':'../vas-basic.js',
        'editor':   '../vas-editor.js',
    }
});

// Bootstrap LiveQ Engine
requirejs(
    [
        
        // Core components required by bootstrap
        "jquery",
        "editor/main",
        "liveq/core",

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