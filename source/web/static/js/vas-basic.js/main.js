
define([
	
	// Screens
	'vas-basic/components/screen_explain',
	'vas-basic/components/screen_home2',
	'vas-basic/components/screen_running',
	'vas-basic/components/screen_tuning',
	'vas-basic/components/screen_progress',
	'vas-basic/components/screen_login',
	'vas-basic/components/screen_results',
	'vas-basic/components/screen_cinematic',
	'vas-basic/components/screen_bsod',
	'vas-basic/components/screen_ipide',
	'vas-basic/components/screen_tutorial_stats',

	// Other components
	'vas-basic/components/nav_mini',
	'vas-basic/components/tvhead_agent',

	// Backdrops
	'vas-basic/components/backdrop_explain',
	'vas-basic/components/backdrop_home',
	'vas-basic/components/backdrop_running',
	'vas-basic/components/backdrop_tuning',
	'vas-basic/components/backdrop_progress',
	'vas-basic/components/backdrop_login',
	'vas-basic/components/backdrop_results',

	// Tuning-related
	"vas-basic/components/tuning/tunable", 
	"vas-basic/components/tuning/observable",
	"vas-basic/components/tuning/status-tune",
	"vas-basic/components/tuning/status-observe",
	"vas-basic/components/tuning/pin",
	"vas-basic/components/tuning/pin_widget",

	// Running-related
	"vas-basic/components/running/observable",
	"vas-basic/components/running/status",

	// Misc components
	"vas-basic/components/onscreen",	

	// Explain screen details
	'vas-basic/components/explain/blackboard',
	'vas-basic/components/explain/machine',
	'vas-basic/components/explain/physics',
	'vas-basic/components/explain/book',

	// Information blocks
	'vas-basic/infoblock/tunable',
	'vas-basic/infoblock/observable',
	'vas-basic/infoblock/book',

	// Data vizualization
	'vas-basic/dataviz/histogram',
	'vas-basic/dataviz/histogram_plain',
	'vas-basic/dataviz/histogram_ratio',

	// Data
	'vas-basic/data/trainhisto',

	// Overlays
	'vas-basic/overlays/book',

]);
