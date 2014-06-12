
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
        'test':     '../test.js',
    }
});

// Bootstrap LiveQ Engine
requirejs(
    [
        
        // Core components required by bootstrap
        "jquery",

        // Tests
        "test/machine-diagram",

	], 
    function($, MachineDiagram) {

        $(function() {
            var md = new MachineDiagram($(".game-scr-nav > .icons"));
            md.setLayout([
                {
                    'parent'    : '',
                    'id'        : 'beam',
                    'short'     : 'Beam',
                    'title'     : 'Incoming Beam',
                    'shortdesc' : 'Description not available yet',
                    'icon'      : 'icon01',
                    'invert'    : true,
                },
                {
                    'parent'    : 'beam',
                    'id'        : 'pdfs',
                    'short'     : 'PDFs',
                    'title'     : 'Parton Distribution Functions',
                    'shortdesc' : 'Description not available yet',
                    'icon'      : 'icon02',
                },
                {
                    'parent'    : 'pdfs',
                    'id'        : 'i-shower',
                    'short'     : 'Initial Shower',
                    'title'     : 'Initia-State Shower',
                    'shortdesc' : 'Description not available yet',
                    'icon'      : 'icon04',
                },
                {
                    'parent'    : 'pdfs',
                    'id'        : 'remnant',
                    'short'     : 'Remnant',
                    'title'     : 'Beam Remnants',
                    'shortdesc' : 'Description not available yet',
                    'icon'      : 'icon03',
                    'to'        : 'hadronization',
                },
                {
                    'parent'    : 'pdfs',
                    'id'        : 'mpis',
                    'short'     : 'MPIs',
                    'title'     : 'Multi-Parton Interactions',
                    'shortdesc' : 'Description not available yet',
                    'icon'      : 'icon05',
                    'to'        : 'hadronization',
                },
                {
                    'parent'    : 'i-shower',
                    'id'        : 'hard',
                    'short'     : 'Hard Process',
                    'title'     : 'Hard Process',
                    'shortdesc' : 'Description not available yet',
                    'icon'      : 'icon05',
                },
                {
                    'parent'    : 'hard',
                    'id'        : 'f-shower',
                    'short'     : 'Final Shower',
                    'title'     : 'Final-State Shower',
                    'shortdesc' : 'Description not available yet',
                    'icon'      : 'icon04',
                },
                {
                    'parent'    : 'f-shower',
                    'id'        : 'hadronization',
                    'short'     : 'Hadronization',
                    'title'     : 'String Fragmentation',
                    'shortdesc' : 'Description not available yet',
                    'icon'      : 'icon06',
                },
                {
                    'parent'    : 'hadronization',
                    'id'        : 'unstable-decay',
                    'short'     : 'Unstable Decay',
                    'title'     : 'Decay of unstable particles',
                    'shortdesc' : 'Description not available yet',
                    'icon'      : 'icon07',
                },
                {
                    'parent'    : 'unstable-decay',
                    'id'        : 'event',
                    'short'     : 'Event',
                    'title'     : 'Final Generated Event',
                    'shortdesc' : 'Description not available yet',
                    'icon'      : 'icon08',
                    'invert'    : true,
                },


            ]);
        });

    }
);