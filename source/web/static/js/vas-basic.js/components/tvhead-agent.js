
define(

	// Requirements
	["core/registry", "core/base/component"],

	/**
	 * Basic version of the home screen
	 *
	 * @exports basic/components/nav_mini
	 */
	function(R,Component) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var TVhead = function( hostDOM ) {
			Component.call(this, hostDOM);

			// Prepare host dom
			this.hostDOM.addClass("tvhead");
			this.tvHead = $('<div class="head"></div>');
			this.tvBody = $('<div class="body"></div>');
			this.hostDOM.append( this.tvHead );
			this.hostDOM.append( this.tvBody );

		}
		TVhead.prototype = Object.create( Component.prototype );

		/**
		 * Hide mini-nav when we are on home
		 */
		TVhead.prototype.onPageWillChange = function(from, to) {
			if ((to == "screen.home") || (to == "screen.progress")) {
				this.hostDOM.fadeOut();
			} else {
				this.hostDOM.fadeIn();
			}
		}

		// Register home screen
		R.registerComponent( "tutorial.agent", TVhead, 1 );

	}

);