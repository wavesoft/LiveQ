
define(

	// Requirements
	["jquery", "d3", "core/db", "core/ui", "core/config", "core/registry", "core/base/components"],

	/**
	 * Basic version of the home screen
	 *
	 * @exports basic/components/explain_screen
	 */
	function($, d3, DB, UI, config, R,C) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var HomeScreen = function( hostDOM ) {
			C.HomeScreen.call(this, hostDOM);

			// Prepare host
			hostDOM.addClass("home");

			// Create a machine
			var machineDOM = $('<div class="fullscreen"></div>').appendTo(hostDOM);
			this.machine = R.instanceComponent("backdrop.machine", machineDOM);
			this.forwardVisualEvents( this.machine, { 'left':0, 'top': 0, 'width': '100%', 'height': '100%' } );
			
			// Create a description vrame
			var descFrame = this.descFrame = $('<div class="description-frame"></div>').appendTo(hostDOM);
			this.descTitle = $('<h1>This is a header</h1>').appendTo(descFrame);
			this.descBody = $('<div>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent ornare eu ex consectetur feugiat. Pellentesque quis dolor sed lacus pellentesque euismod lacinia eget urna. Vestibulum ipsum lorem, posuere in dignissim ac, sollicitudin eu odio. Suspendisse ac porta turpis. Etiam nec consequat mauris, at placerat urna. Nam suscipit nisl eget nisi semper, quis aliquet sem interdum. Proin condimentum nunc vel imperdiet vehicula.</div>').appendTo(descFrame);

			// Bind listeners
			this.machine.on('hover', (function(id) {
				var details = DB.cache['definitions']['machine-parts'][id];
				if (details == undefined) {
					this.descTitle.text("Quantum Machine");
					this.descBody.html("Move your mouse over a component in order to see more details.");
				} else {
					this.descTitle.text(details['description']['title']);
					this.descBody.html(details['description']['body']);
				}
			}).bind(this));
			this.machine.on('click', (function(id) {
				this.trigger('changeScreen', 'screen.tuning');
			}).bind(this));

		}
		HomeScreen.prototype = Object.create( C.HomeScreen.prototype );


		// Register home screen
		R.registerComponent( "screen.home", HomeScreen, 1 );

	}

);
