
define(

	// Requirements
	[ "jquery", "popcorn", "core/ui", "core/registry", "core/base/agent" ],

	/**
	 * Basic version of the home screen
	 *
	 * @exports basic/components/tvhead_agent
	 */
	function($, Popcorn, UI, R, VisualAgent) {


		/**
		 * Define custom popcorn plugin that handles the explainations I/O
		 */
		Popcorn.plugin( "maskedFocus", function( options ) {

			var isVisible = true,
				focusElement = null,
				classAdded = null;

			return {
				start: function(event, track) {
					var videoHost = options.videoHost;

					// Fire onEnter if defined
					if (options['onEnter'] !== undefined)
						options['onEnter']();

					// Tell video host to aligh with the visual aid
					videoHost.realign( options.focus );

					// Check if we have duration
					videoHost.trigger('focusVisualAid',
							options.focus,
							options['end'] - options['start'],
							options['addClass'] || "",
							options['title']
						);

				},
				end: function(event, track) {
					var videoHost = options.videoHost;

					// Check if we have duration
					videoHost.trigger('blurVisualAid');

					// Tell video host to realign without aids
					videoHost.realign( false );

					// Fire onExit
					if (options['onExit'] !== undefined)
						options['onExit']();

				}
			}

		});

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var TVhead = function( hostDOM ) {
			VisualAgent.call(this, hostDOM);

			// Hard-coded dimentions (from CSS)
			this.myWidth = 415;
			this.myHeight = 390;

			// Properties
			this.activeAid = false;

			// Prepare host dom
			this.hostDOM.addClass("tvhead");
			this.tvHead = $('<div class="head"></div>');
			this.tvBody = $('<div class="body"></div>');
			this.hostDOM.append( this.tvHead );
			this.hostDOM.append( this.tvBody );

		}
		TVhead.prototype = Object.create( VisualAgent.prototype );


		/**
		 * Aligh with the visual aid
		 */
		VisualAgent.prototype.realign = function( aid ) {
			if (!aid) {

				this.activeAid = false;
				this.hostDOM.css({
					'left': (this.width - this.myWidth)/2,
					'top': (this.height - this.myHeight)/2,
				});

			} else {

				var aidOffset = $(aid).offset();
				this.activeAid= $(aid);

			}
		}

		/**
		 * Tutorial sequence is defined
		 */
		VisualAgent.prototype.onSequenceDefined = function(sequence, cb) {

			// Validate sequence structure
			if (!sequence) {
				console.error("TVhead: Invalid sequence specified");
			}
			if (!sequence.video) {
				console.error("TVhead: Video source not defined in sequence");
				return;
			}
			if (!sequence.aids) sequence.aids = [];

			// Prepare explaination panel for the video
			this.tvHead.empty();
			var videoHost = $('<div id="misc-presentation-video"></div>').css({
				'width': 360,
				'height': 203
			});
			this.tvHead.append(videoHost);

			// Prepare video wrapper
			var videoWrapper = Popcorn.HTMLYouTubeVideoElement( "#misc-presentation-video" );
			videoWrapper.src = sequence.video;
			videoWrapper.addEventListener('loadeddata', function() {
				// Fire callback when we are loaded
				cb();
			});

			// Initialize popcorn
			this.eExplainPopcorn = Popcorn(videoWrapper);

			// Bind timeline events to the popcorn
			var timeline = sequence.aids;
			for (var i=0; i<timeline.length; i++) {
				var entry = timeline[i];

				// Find where the current frame ends
				var frameEnd = entry.at+(entry['duration'] || 10);
				if (i<timeline.length-1) frameEnd=timeline[i+1].at;

				// Check what to do
				if (entry['focus'] !== undefined) {

					// Focus to the given element
					this.eExplainPopcorn.maskedFocus({

						// Required
						'start': entry.at,
						'end': frameEnd,
						'focus': entry.focus,
						'videoHost': this,

						// Optional
						'title': entry['title'],
						'text': entry['text'],
						'placement': entry['placement'],
						'addClass': entry['addClass'],
						'onEnter': entry['onEnter'],
						'onExit': entry['onExit']

					});

				}

			}

			// Bind to ended event
			this.eExplainPopcorn.on('ended', (function() {
				this.trigger('completed');
			}).bind(this));

		}

		/**
		 * This function is called by the system when the tutorial should start.
		 */
		VisualAgent.prototype.onStart = function() {

			// Start the video
			this.eExplainPopcorn.play();

		};

		/**
		 * This function is called by the system when the tutorial should be
		 * interrupted.
		 */
		VisualAgent.prototype.onStop = function() {

			// Stop the video
			this.eExplainPopcorn.pause();

		};

		/**
		 * Put us in the middle of the screen upon display
		 */
		TVhead.prototype.onWillShow = function( cb ) {
			this.hostDOM.css({
				'left': (this.width - this.myWidth)/2,
				'top': (this.height - this.myHeight)/2,
			});
			cb();
		}

		/**
		 * The host element has changed dimentions
		 */
		TVhead.prototype.onResize = function( width, height ) {
			this.width = width;
			this.height = height;

			this.realign( this.activeAid );
		}


		// Register home screen
		R.registerComponent( "tutorial.agent", TVhead, 1 );

	}

);