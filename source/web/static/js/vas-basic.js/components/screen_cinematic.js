

define(

	// Requirements
	["jquery", "popcorn", "core/db", "core/ui", "core/config", "core/registry", "core/base/components", "core/user"],

	/**
	 * Basic version of the home screen
	 *
	 * @exports basic/components/explain_screen
	 */
	function($, Popcorn, DB, UI, config, R,C, User) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var CinematicScreen = function( hostDOM ) {
			C.CinematicScreen.call(this, hostDOM);

			// Prepare the video element for the cinematic screen
			this.videoElm = null;

			// Mark host screen for cinematic
			this.hostDOM.addClass("cinematic");

			// Prepare the container for the video
			this.videoContainer = $('<div class="video-container" id="cinematic-video-host"></div>').appendTo(this.hostDOM);
			this.videoBlocker = $('<div class="video-blocker"></div>').appendTo(this.hostDOM);
			this.skipVideo = $('<a href="javascript:;" class="video-skip">Skip</a>').appendTo(this.hostDOM);

			// Set a null completed callback
			this.completedCallback = null;
			this.popcorn = null;

			// Handle skip video
			this.skipVideo.click((function(e) {
				e.stopPropagation();
				e.preventDefault();

				this.trigger('completed');
				if (this.completedCallback)
					this.completedCallback();
			}).bind(this));

		}
		CinematicScreen.prototype = Object.create( C.CinematicScreen.prototype );

		/**
		 * Override the completed callback
		 */
		CinematicScreen.prototype.onCallbackDefined = function( cb_ready ) {
			this.completedCallback = cb_ready;
		}

		/**
		 * Setup cinematic video
		 */
		CinematicScreen.prototype.onCinematicDefined = function( video, cb_ready ) {

			// Dispose previous video
			this.videoContainer.empty();

			// Create a popcorn video wrapper
			var videoWrapper = Popcorn.HTMLYouTubeVideoElement( "#cinematic-video-host" );
			videoWrapper.src = video;
			videoWrapper.addEventListener('loadeddata', function() {
				cb_ready();
			});

			// Create a popcorn instance
			this.popcorn = Popcorn( videoWrapper );
			this.popcorn.on('ended', (function() {
				this.trigger('completed');
				if (this.completedCallback)
					this.completedCallback();
			}).bind(this));

		}

		/**
		 * Resize video
		 */
		CinematicScreen.prototype.onResize = function(w,h) {
			this.width = w;
			this.height = h;
		}

		/**
		 * Start video when to be shown
		 */
		CinematicScreen.prototype.onWillShow = function(cb) {
			if (this.popcorn) this.popcorn.play();
			cb();
		}

		/**
		 * Start video when to be hidden
		 */
		CinematicScreen.prototype.onWillHide = function(cb) {
			if (this.popcorn) this.popcorn.pause();
			cb();
		}

		// Register screen component on the registry
		R.registerComponent( 'screen.cinematic', CinematicScreen, 1 );

	}

);