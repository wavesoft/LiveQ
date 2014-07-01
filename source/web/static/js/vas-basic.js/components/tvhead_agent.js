
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
			this.myHandsOffset = 300;

			// Properties
			this.activeAid = false;
			this.lastAid = false;
			this.lastSeed = Math.random();

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
			this.activeAid = aid;

			// Reset fancy classes
			this.hostDOM.removeClass("left");
			this.hostDOM.removeClass("right");

			// Re-seed random number when aid changes
			// (Used for picking a random side when showing the TV-Head)
			if (aid != this.lastAid) {
				this.lastSeed = Math.random();
				this.lastAid = aid;
			}

			if (!aid) {

				// When we have no element, center ourselves
				this.hostDOM.css({
					'left': (this.width - this.myWidth)/2,
					'top': (this.height - this.myHeight)/2,
				});

				// Remove fancy classes
				this.hostDOM.removeClass("left");
				this.hostDOM.removeClass("right");

			} else {

				// Fetch aid object if we have the ID
				var aid = R.getVisualAid(aid);
				if (!aid) {

					// When no valid element is found, do the same as false
					this.activeAid = false;
					this.hostDOM.css({
						'left': (this.width - this.myWidth)/2,
						'top': (this.height - this.myHeight)/2,
					});

					return;
				}

				// Tollerances that might be hidden outside screen
				var tol_L = 26, tol_R = 26, tol_T = 21, tol_B = 156,
					pad = 10;

				// Get aid dimentions
				var aidOffset = $(aid).offset(),
					aidW = $(aid).width(), aidH = $(aid).height();

				// Align vertically
				var tY = aidOffset.top + aidH/2 - this.myHandsOffset;
				if (tY + tol_T < 0) {
					tY = -tol_T;
				} else if (tY + this.myHeight - tol_B > this.height) {
					tY = this.height - this.myHeight + tol_B;
				}

				// Align horizontally
				var tX = aidOffset.left + pad + aidW,
					posRight = aidOffset.left + pad + aidW,
					fitRight = (aidOffset.left + pad + aidW + this.myWidth - tol_R < this.width),
					posLeft = aidOffset.left - pad - this.myWidth,
					fitLeft = (aidOffset.left - pad - this.myWidth + tol_L > 0);

				// If we have both choices, pick one
				if (fitLeft && fitRight) {
					if (this.lastSeed > 0.5) {
						tX = posRight;
						this.hostDOM.addClass("left");
					} else {
						tX = posLeft;
						this.hostDOM.addClass("right");
					}
				} else if (!fitLeft && fitRight) {
					tX = posRight;
					this.hostDOM.addClass("left");
				} else if (fitLeft && !fitRight) {
					tX = posLeft;
					this.hostDOM.addClass("right");
				} else {

					// Check from which side we should squeeze
					var worseLeft = -tol_L, worseRight = this.width - this.myWidth + tol_R,
						distLeft = (worseLeft + this.myWidth) - aidOffset.left,
						distRight = (aidOffset.left + aidW) - worseRight;

					if (distLeft < distRight) {
						tX = worseLeft;
						this.hostDOM.addClass("right");
					} else {
						tX = worseRight;
						this.hostDOM.addClass("left");
					}

				}

				// Apply position
				this.hostDOM.css({ 'left': tX, 'top': tY });				

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

			// Remove fancy classes
			this.hostDOM.removeClass("left");
			this.hostDOM.removeClass("right");

			// Center view
			this.hostDOM.css({
				'left': (this.width - this.myWidth)/2,
				'top': (this.height - this.myHeight)/2,
			});

			// We are ready
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