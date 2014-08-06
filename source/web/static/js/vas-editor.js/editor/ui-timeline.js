define(

	["jquery", "vas-editor/runtime/timeline", "core/config" ],

	function($, Timeline, Config) {

		/**
		 * Interface component for editing the properties of an object
		 */
		var TimelineUI = function( hostDOM, propUI ) {
			this.hostDOM = $(hostDOM);
			this.propUI = propUI;
			this.scale = 0.1; // 100 pixels -> 1 sec
			this.lockUpdate = false;
			window.tui = this;

			// Configuration
			this.config = {

				padLeft			: 10,
				padTop			: 10,
				audioHeight		: 25,

				lineHeight 		: 25,
				handleWidth		: 10,
				handleTrim      : 5,
				cursorHandleR	: 8,

				bandFill		: '#3498DB',
				bandStroke		: '#2980B9',
				bandHoverFill	: '#F1C40F',
				handleFill		: '#34495E',
				handleStroke	: '#2C3E50',

				selectionFill	: '#FFFF99',

			};

			// Prepare basic grid (Header/Footer/Body)
			this.elmHeader = $('<div class="tl-header"></div>');
			this.elmFooter = $('<div class="tl-footer"></div>');
			this.elmBody = $('<div class="tl-body"></div>');
			this.hostDOM.append( this.elmHeader );
			this.hostDOM.append( this.elmBody );
			this.hostDOM.append( this.elmFooter );

			// Prepare Body division (Side/Canvas)
			this.elmSide = $('<div class="tl-side"></div>')
			this.elmBody.append( this.elmSide );
			this.elmCanvas = $('<div class="tl-canvas"></div>');
			this.elmBody.append( this.elmCanvas );

			// Prepare controls
			var elmControls = $('<div class="tl-left tl-controls"></div>');
			this.elmHeader.append(elmControls);

				var rewindBtn = $('<button class="btn btn-default btn-xs"><span class="glyphicon glyphicon-fast-backward"></span></button>');
				elmControls.append( rewindBtn );
				rewindBtn.click((function() {
					if (!this.timeline) return;
					this.timeline.gotoAndStop(0);
				}).bind(this));

				var stepBackBtn = $('<button class="btn btn-default btn-xs"><span class="glyphicon glyphicon-step-backward"></span></button>');
				elmControls.append( stepBackBtn );
				stepBackBtn.click((function() {
					if (!this.timeline) return;
					var pos = this.timeline.snapTime( this.timeline.position - this.timeline.timeStep );
					if (pos < 0) pos = 0;
					this.timeline.gotoAndStop(pos);
				}).bind(this));

				var playBtn = $('<button class="btn btn-success btn-xs"><span class="glyphicon glyphicon-play"></span></button>');
				elmControls.append( playBtn );
				playBtn.click((function() {
					if (!this.timeline) return;
					if (this.timeline.position >= this.timeline.duration) {
						this.timeline.gotoAndPlay(0);
					} else {
						this.timeline.setPaused(false);
					}
				}).bind(this));

				var stopBtn = $('<button class="btn btn-default btn-xs"><span class="glyphicon glyphicon-stop"></span></button>');
				elmControls.append( stopBtn );
				stopBtn.click((function() {
					if (!this.timeline) return;
					this.timeline.setPaused(true);
				}).bind(this));

				var stepFwBtn = $('<button class="btn btn-default btn-xs"><span class="glyphicon glyphicon-step-forward"></span></button>');
				elmControls.append( stepFwBtn );
				stepFwBtn.click((function() {
					if (!this.timeline) return;
					var pos = this.timeline.snapTime( this.timeline.position + this.timeline.timeStep );
					if (pos <= this.timeline.duration)
						this.timeline.gotoAndStop(pos);
				}).bind(this));

				var rewindBtn = $('<button class="btn btn-default btn-xs"><span class="glyphicon glyphicon-fast-forward"></span></button>');
				elmControls.append( rewindBtn );
				rewindBtn.click((function() {
					if (!this.timeline) return;
					this.timeline.gotoAndStop(this.timeline.duration);
				}).bind(this));

			// Prepare status bar elements
			this.elmStatus = $('<div class="tl-left tl-status"></div>');
			this.elmFooter.append(this.elmStatus);

			// Prepare header/footer canvases
			var canvasHost = $('<div class="tl-right"></div>');
			this.elmHeader.append(canvasHost);

			this.canvasWidth = $(this.elmCanvas).width() - parseInt(this.elmCanvas.css("margin-left"));
			this.canvasHeadHeight = $(this.elmHeader).height();
			this.canvasHead = $('<canvas></canvas>');
			this.canvasHead.attr({
				'width'  : this.canvasWidth,
				'height' : this.canvasHeadHeight
			});
			canvasHost.append( this.canvasHead );
			this.contextHead = this.canvasHead[0].getContext("2d");

			var canvasHost = $('<div class="tl-right"></div>');
			this.elmFooter.append(canvasHost);
			this.canvasFooterHeight = $(this.elmFooter).height();
			this.canvasFooter = $('<canvas></canvas>');
			this.canvasFooter.attr({
				'width'  : this.canvasWidth,
				'height' : this.canvasFooterHeight
			});
			canvasHost.append( this.canvasFooter );
			this.contextFooter = this.canvasFooter[0].getContext("2d");

			// Prepare body canvas 
			this.canvasMinHeight = $(this.elmBody).height();
			this.canvasBody = $('<canvas></canvas>');
			this.canvasBody.attr({
				'width'  : this.canvasWidth,
				'height' :this.canvasMinHeight
			});
			this.elmCanvas.append( this.canvasBody );
			this.context = this.canvasBody[0].getContext("2d");

			// Setup properties
			this.elements = [];
			this.selectedRow = -1;
			this.timeScale = 0.5;
			this.timeline = null;
			this.canvas = null;
			this.activeAnchor = -1;

			this.hoverElement = null;
			this.hoverAnchor = null;
			this.hoverElementAnchors = [];
			this.mouseDragMode = 0;
			this.mousePossibleDragMode = 0;
			this.mouseDragX = 0;
			this.mouseDragValue = 0;

			this.scrollX = 0;
			this.maxX = 0;

			// Setup audio
			this.narration = {
				'available' : false,
				'duration'  : 0,
				'words'     : [],
				'id'		: null,
				'text'		: null,
				'voice'		: null,
				'del_prev'	: true
			};
			this.resetNarration();

			// Setup header
			this.canvasHead.mousemove((function(e) {
				var target = e.target || e.srcElement,
					rect = target.getBoundingClientRect(),
					mouseX = e.clientX - rect.left,
					mouseY = e.clientY - rect.top;

				// This only functions when we have a timeline
				if (!this.timeline) return;

				//
				// NOT DRAGGING : Cursor & DragMode selection
				//
				if (this.mouseDragMode == 0) {
					var cursorPos = this.snapPixels( this.time2pixels( this.timeline.position ), this.config.padLeft );
					if ((mouseX >= cursorPos-this.config.cursorHandleR) && (mouseX <= cursorPos+this.config.cursorHandleR)) {
						// Possible to drag the time cursor
						this.mousePossibleDragMode = 3;
						this.canvasHead.css('cursor', 'pointer');
					} else {
						this.mousePossibleDragMode = 0;
						this.canvasHead.css('cursor', 'default');
					}
				}

				//
				// DRAGGING #3 : Dragging cursor
				//
				else if (this.mouseDragMode == 3) {
					var delta = (mouseX - this.mouseDragX),
						pos = delta + this.mouseDragValue,
						time = this.pixels2time( pos );

					// Update position
					if (!this.timeline) return;
					this.lockUpdate = true;
					this.timeline.gotoAndStop( time );
					this.redraw();

				}

			}).bind(this));

			this.canvasHead.mousedown((function(e) {
				var target = e.target || e.srcElement,
					rect = target.getBoundingClientRect(),
					mouseX = e.clientX - rect.left,
					mouseY = e.clientY - rect.top;


				// This only functions when we have a timeline
				if (!this.timeline) return;

				// Keep current drag values
				this.mouseDragValue = this.snapPixels( mouseX, this.config.padLeft );
				this.mouseDragX = mouseX;

				// Update timeline position
				this.lockUpdate = true;
				this.timeline.gotoAndStop( this.pixels2time( this.mouseDragValue ) );

				// Switch to timeline drag
				this.mouseDragMode = 3;

			}).bind(this));

			this.canvasFooter.mousemove((function(e) {
				var target = e.target || e.srcElement,
					rect = target.getBoundingClientRect(),
					mouseX = e.clientX - rect.left,
					mouseY = e.clientY - rect.top;

				// Calculate position frame bounds					
				var w = this.canvasFooter.width() - this.config.padLeft - this.config.handleWidth,
					sceneWidthMs = Math.max(this.timeline.duration, w / this.timeScale),
					sceneWidthPx = sceneWidthMs * this.timeScale,
					wScalePx = w / sceneWidthPx,
					pFrameLeft = -this.scrollX * wScalePx + this.config.padLeft,
					pFrameWidth = w * wScalePx;
					if (pFrameWidth+pFrameLeft > w) pFrameWidth = w-pFrameLeft;

				// 
				// NOT DRAGGING : Cursor & DraggingMode selection
				//
				if (this.mouseDragMode == 0) {

					// Change cursor accordingly
					if ((mouseX >= pFrameLeft) && (mouseX <= pFrameLeft+pFrameWidth)) {
						this.mousePossibleDragMode = 5;
						this.mouseDragX = mouseX;
						this.mouseDragValue = this.scrollX;
						this.canvasFooter.css('cursor', 'move');
					} else {
						this.mousePossibleDragMode = 0;
						this.canvasFooter.css('cursor', 'default');
					}

				//
				// DRAGGING #3 : Dragging cursor
				//
				} else if (this.mouseDragMode == 3) {
					var delta = (mouseX - this.mouseDragX),
						pos = delta + this.mouseDragValue,
						time = this.pixels2time( pos );

					// Update position
					if (!this.timeline) return;
					this.lockUpdate = true;
					this.timeline.gotoAndStop( time );


				//
				// DRAGGING #5 : Sliding scroll frame
				//
				} else if (this.mouseDragMode == 5) {

					this.scrollX = this.snapPixels( this.mouseDragValue - (mouseX - this.mouseDragX) / wScalePx );
					if (this.scrollX > 0) this.scrollX = 0;

					// Redraw
					this.redraw();

				}

			}).bind(this));

			this.canvasFooter.mousedown((function(e) {
				var target = e.target || e.srcElement,
					rect = target.getBoundingClientRect(),
					mouseX = e.clientX - rect.left,
					mouseY = e.clientY - rect.top;

				if (e.button == 0) {
					this.mouseDragMode = this.mousePossibleDragMode;
				}

			}).bind(this));

			// Setup mouse
			this.canvasBody.mousemove((function(e) {
				var target = e.target || e.srcElement,
					rect = target.getBoundingClientRect(),
					mouseX = e.clientX - rect.left,
					mouseY = e.clientY - rect.top;

				//
				// NO DRAGGING : Lookup possible drag modes
				//
				if (!this.mouseDragMode) {

					// Update mouse X position
					this.mouseDragX = mouseX;

					// Lookup hover element
					var hoverElement = this.hoverElement = this.elementIndexFromY( mouseY );
					if (hoverElement < 0) {

						// No possible drag modes
						this.mousePossibleDragMode = 0;
						this.canvasBody.css('cursor', 'default');
						return;

					}

					// Fetch element anchors (keyframe positions)
					var anchors = this.hoverElementAnchors = this.getElementAnchors( this.elements[hoverElement] );
					if (anchors.length > 0) {

						// Check if mouse is over an anchor
						this.hoverAnchor = null;
						for (var i=0; i<anchors.length; i++) {
							if ((mouseX >= anchors[i]-this.config.handleWidth/2) && (mouseX <= anchors[i]+this.config.handleWidth/2)) {
								this.hoverAnchor = i;
								break;
							}
						}

						// If we found something, switch cursor
						if (this.hoverAnchor != null) {

							// Possible to drag the anchor
							this.mousePossibleDragMode = 1;
							this.mouseDragValue = anchors[i];
							this.canvasBody.css('cursor', 'pointer');

						} else {

							// Otherwise check if we are just inside bounds
							if ((mouseX >= anchors[0]) && (mouseX <= anchors[anchors.length-1])) {

								// Possible to drag the entire row
								this.mousePossibleDragMode = 2;
								this.mouseDragValue = anchors.slice(0);
								this.canvasBody.css('cursor', 'move');

							} else {

								// No possible drag modes
								this.mousePossibleDragMode = 0;
								this.canvasBody.css('cursor', 'default');

							}

						}

					}

				//
				// DRAGGING #1 : Anchor
				//
				} else if (this.mouseDragMode == 1) {
					var elm = this.elements[ this.hoverElement ],
						delta = (mouseX - this.mouseDragX),
						pos = delta + this.mouseDragValue;

					// Prohibit invalid positions of anchor
					var minPos = this.hoverElementAnchors[0];
					if ( this.hoverAnchor > 0 ) {
						minPos = this.hoverElementAnchors[ this.hoverAnchor - 1 ];
					}
					if (pos < minPos) pos = minPos;
					if ( this.hoverAnchor < this.hoverElementAnchors.length-1 ) {
						var maxPos = this.hoverElementAnchors[ this.hoverAnchor + 1 ];
						if (pos > maxPos) pos = maxPos;
					}

					// Update item keyframes
					elm.__keyframes[ this.hoverAnchor ].at = this.timeline.snapTime( this.pixels2time(pos) );
					elm.updateReflection();
					this.updateCanvas();

					// Redraw
					this.redraw();

				//
				// DRAGGING #2 : Entire Element
				//
				} else if (this.mouseDragMode == 2) {
					var elm = this.elements[ this.hoverElement ],
						delta = this.snapPixels(mouseX - this.mouseDragX);

					// Make sure delta never shifts data below 0
					if (this.mouseDragValue[0] + delta < this.config.padLeft)
						delta = this.config.padLeft - this.mouseDragValue[0];

					// Shift all anchors
					for (var i=0; i<this.hoverElementAnchors.length; i++) {
						elm.__keyframes[ i ].at = this.pixels2time( this.mouseDragValue[i] + delta );
					}
					elm.updateReflection();
					this.updateCanvas();

					// Redraw
					this.redraw();

				//
				// DRAGGING #3 : Dragging cursor
				//
				} else if (this.mouseDragMode == 3) {
					var delta = (mouseX - this.mouseDragX),
						pos = delta + this.mouseDragValue,
						time = this.pixels2time( pos );

					// Update position
					if (!this.timeline) return;
					this.lockUpdate = true;
					this.timeline.gotoAndStop( time );


				//
				// DRAGGING #4 : Panning
				//
				} else if (this.mouseDragMode == 4) {

					this.scrollX = this.snapPixels( this.mouseDragValue + (mouseX - this.mouseDragX) );
					if (this.scrollX > 0) this.scrollX = 0;
					this.redraw();

				}


			}).bind(this));

			this.canvasBody.mousedown((function(e) {
				e.preventDefault();
				e.stopPropagation();

				// On left click check for dragging
				if (e.button == 0) {

					// Just enable the possible drag mode
					this.mouseDragMode = this.mousePossibleDragMode;

					// Select row on click
					if ((this.mouseDragMode == 1) || (this.mouseDragMode == 2)) {
						this.selectRow( this.hoverElement );
					}

					// If we clicked an anchor, update timeline
					if (this.mouseDragMode == 1) {

						// Update position
						if (!this.timeline) return;
						this.activeAnchor = -1;
						this.lockUpdate = true;
						this.timeline.gotoAndStop( this.pixels2time( this.mouseDragValue ) );
						this.propUI.show( new TimelineUI.KeyframeWrapper( this, this.elements[this.hoverElement], this.hoverAnchor ) );

					} else if (this.mouseDragMode == 2) {

						// Check in which anchor we are currently in
						this.activeAnchor = -1;
						for (var i=1; i<this.hoverElementAnchors.length; i++) {
							if ((this.mouseDragX >= this.hoverElementAnchors[i-1]) && (this.mouseDragX <= this.hoverElementAnchors[i])) {
								this.activeAnchor = i;
								this.propUI.show( new TimelineUI.TweenPropertiesWrapper( this, this.elements[this.hoverElement], i ) );
								break;
							}
						}
					}

				}

				// Middle click starts panning
				else if (e.button == 1) {

					// Switch directly to panning
					this.mouseDragMode = 4;
					this.mouseDragValue = this.scrollX;
					this.canvasBody.css('cursor', 'move');

				}

			}).bind(this));

			this.canvasBody.on('mousewheel DOMMouseScroll', (function(e) {

				var delta = e.originalEvent.deltaY || e.originalEvent.detail;
				if (delta != 0) {
					if (delta > 0) {
						delta = -0.01;
					} else {
						delta = 0.01;
					}

					e.stopPropagation();
					e.preventDefault();

					this.timeScale += delta;
					if (this.timeScale < 0.1) this.timeScale = 0.1;
					if (this.timeScale > 1) this.timeScale = 1;
				}

			}).bind(this));

			$("body").mouseup((function(e) {

				// If we were dagging anchors, do optimiziation
				if (this.mouseDragMode == 1) {
					var elm = this.elements[ this.hoverElement ];
					for (var i=1; i<elm.__keyframes.length; i++) {
						if (elm.__keyframes[i-1].at == elm.__keyframes[i].at) {
							elm.__keyframes.splice(i,1);
							this.redraw();
							break; // There can be onl 1 collision
						}
					}

				}

				// If we are dragging the timeline cursor, snap to time
				else if (this.mouseDragMode == 3) {
					this.lockUpdate = true;
					this.timeline.gotoAndStop( this.timeline.snapTime( this.timeline.position ) );					
				}

				// Stop dragging
				this.mouseDragMode = 0;
				this.canvasHead.css('cursor', 'default');

			}).bind(this));

			// Start animation
			this.animate();

			window.tui = this;

		}

		TimelineUI.prototype.clear = function() {
			this.elements = [];
			this.elmSide.empty();
			this.resetNarration();
			this.redraw();
		}

		TimelineUI.prototype.resetNarration = function() {
			// Create handle
			this.elmAudioHandle = $('<div class="tl-handle"><span class="glyphicon glyphicon-volume-up"></span> Narration</div>');
			this.elmSide.append( this.elmAudioHandle );

			// Reset narration data
			this.narration = {
				'available' : false,
				'duration'  : 0,
				'words'     : [],
				'id'		: null,
				'voice'		: null,
				'text'		: null,
				'del_prev'	: true
			};
		}

		TimelineUI.prototype.setupNarration = function( data, text, voice ) {

			// Reset if no data
			if (!data) {
				// Remove audio from timeline
				this.timeline.setupAudio(null);
				// Narration is not available
				this.narration.available = false;
				this.redraw();
				return;				
			}

			// Update narration record
			this.narration.words = data['words'];
			this.narration.duration = data['duration'];
			this.narration.available = true;

			// Update additional info
			this.narration.id = data['id'];
			this.narration.base_url = data['base_url'];
			if (voice) this.narration.voice = voice;
			if (text) this.narration.text = text;

			// Setup audio on timeline
			this.timeline.setupAudio(data['base_url']);

			// Redraw
			this.redraw();

		}

		/**
		 * This function is called when saving the scene. This prohibits
		 * the deletion of the previous narration object before regeneration.
		 */
		TimelineUI.prototype.preserveNarrationRevision = function() {
			this.narration.del_prev = false;
		}

		TimelineUI.prototype.narrationToJSON = function() {
			if (this.narration.available) {
				return {
					'id' 		: this.narration.id,
					'voice' 	: this.narration.voice,
					'text' 		: this.narration.text,
					'audio_url' : this.narration.base_url
				};
			} else {
				return null;
			}
		}

		/** 
		 * Setup narration from JSON
		 */
		TimelineUI.prototype.narrationFromJSON = function(json, cb) {
			if (!json) {
				this.narration.available = false;
				return;
			}

			// Setup local info parameters
			this.narration.id = json['id'];
			this.narration.voice = json['voice'];
			this.narration.text = json['text'];

			// Do not delete this narration when regenerating
			// (That's important for preserving the revision data)
			this.narration.del_prev = false;

			// Load narration (will populate the rest)
			this.loadNarration( json['id'], cb );

		}

		TimelineUI.prototype.loadNarration = function(id, cb) {

			// Fetch narration record by ID
			$.ajax({
				type: "GET",
				url: Config['voiceapi'].baseURL+"/index.php",
				dataType: 'json',
				data: {
					'get': id,
					'api_key': Config['voiceapi'].api_key
				}
			})
			.done((function( data, textStatus, jqXHR ) {
				this.setupNarration(data);
				if (cb) cb(true);
			}).bind(this))
			.fail((function( jqXHR, textStatus, errorThrown ) {
				this.setupNarration(false);
				if (cb) cb(false);
			}).bind(this));

		}


		TimelineUI.prototype.regenNarration = function(text, voice, cb) {

			// Prepare request data
			var req_data = {
				'text': text,
				'voice': voice,
				'api_key': Config['voiceapi'].api_key
			};

			// If we have a previously allocated ID and we are ok to delete
			// it, include the delete parameter
			if (this.narration.del_prev && this.narration.id) {
				req_data['del'] = this.narration.id;
			}

			// Request narration through VoiceAPI
			$.ajax({
				type: "GET",
				url: Config['voiceapi'].baseURL+"/index.php",
				dataType: 'json',
				data: req_data
			})
			.done((function( data, textStatus, jqXHR ) {

				// This was generated by the user, until he saves it
				// delete all previous narrations
				this.narration.del_prev = true;

				// Setup naration with the response
				this.setupNarration(data, text, voice);

				if (cb) cb(true);
			}).bind(this))
			.fail((function( jqXHR, textStatus, errorThrown ) {
				this.setupNarration(false);
				if (cb) cb(false);
			}).bind(this));

		}

		TimelineUI.prototype.animate = function() {
			this.redraw();
			setTimeout((function() {
				requestAnimationFrame(this.animate.bind(this));
			}).bind(this), 25);
		}

		TimelineUI.prototype.time2pixels = function( tValue ) {
			return tValue * this.timeScale + this.config.padLeft + this.scrollX;
		}

		TimelineUI.prototype.pixels2time = function( pValue ) {
			return (pValue - this.config.padLeft - this.scrollX) / this.timeScale;
		}

		TimelineUI.prototype.snapPixels = function( xPos, offset ) {
			if (!this.timeline) return xPos;
			if (offset === undefined) offset = 0;
			var timePos = this.timeline.snapTime( (xPos - offset) / this.timeScale );
			return (timePos * this.timeScale) + offset;
		}

		/**
		 * Calculate element anchor positions in the current time-scale
		 */
		TimelineUI.prototype.getElementAnchors = function( element ) {
			var anchors = [];
			for (var i=0; i<element.__keyframes.length; i++) {
				anchors.push( this.time2pixels(element.__keyframes[i].at) );
			}
			return anchors;
		}

		/**
		 * Return the element on the given Y coordinates
		 */
		TimelineUI.prototype.elementIndexFromY = function( yPos ) {
			var y = this.config.padTop + this.config.audioHeight, rowHeight = this.config.lineHeight;
			for (var i=0; i<this.elements.length; i++) {
				var elmBottom = y + rowHeight - 0.5,
					elmTop = y + 1.5;
				if ((yPos >= elmTop) && (yPos <= elmBottom))
					return i;
				y += rowHeight;
			}
			return -1;
		}

		TimelineUI.prototype.selectByCanvasObject = function( o ) {
			for (var i=0; i<this.elements.length; i++) {
				if (this.elements[i].__object == o) {
					this.selectRow(i, false);
					return;
				}
			}
			this.selectRow(-1);
			this.activeAnchor = -1;
		}

		TimelineUI.prototype.selectByElement = function( elm, fireUpdate ) {
			for (var i=0; i<this.elements.length; i++) {
				if (this.elements[i] == elm) {
					this.selectRow(i, (fireUpdate==undefined) ? true : fireUpdate );
					return;
				}
			}
			this.selectRow(-1);
			this.activeAnchor = -1;
		}

		TimelineUI.prototype.selectRow = function( id, focusCanvas ) {

			// Activate DOM elements
			for (var i=0; i<this.elements.length; i++) {
				if (i == id) {
					this.elements[i].__timelineHandle.addClass("active");
				} else {
					this.elements[i].__timelineHandle.removeClass("active");
				}
			}

			// Focus canvas object
			if (this.canvas && (id>=0) && ((focusCanvas == undefined) || (focusCanvas == true))) {
				this.canvas.selectObject( this.elements[id].__object );
			}

			// Activate canvas element
			this.selectedRow = id;
			this.redraw();

		}

		TimelineUI.prototype.wrapView = function(wrapPos) {

			// Calculate position frame bounds					
			var w = this.canvasFooter.width() - this.config.padLeft - this.config.handleWidth,
				sceneWidthMs = Math.max(this.timeline.duration, w / this.timeScale),
				sceneWidthPx = sceneWidthMs * this.timeScale,
				wScaleMs = w / sceneWidthMs,
				wScalePx = w / sceneWidthPx,
				pFrameLeft = -this.scrollX * wScalePx + this.config.padLeft,
				pFrameWidth = w * wScalePx;
				if (pFrameWidth+pFrameLeft > w) pFrameWidth = w-pFrameLeft;

			// Check if we have gone out of frame
			var currLeft = this.timeline.position * wScaleMs,
				wrapLeft = pFrameLeft + pFrameWidth * wrapPos;
				wrapRight = pFrameLeft + pFrameWidth * (1-wrapPos);
			if ((currLeft > wrapLeft) || (currLeft < wrapRight)) {
				this.scrollX = (this.config.padLeft - currLeft + pFrameWidth * (1-wrapPos)) / wScalePx;
				if (this.scrollX > 0) this.scrollX = 0;
			}


		}

		TimelineUI.prototype.setTimeline = function( timeline ) {
			this.timeline = timeline;
			this.timeline.addEventListener('change', (function() {

				// Ignore changes that we triggered
				if (this.lockUpdate) {
					this.lockUpdate = false;
				} else {
					// If timeline has gone out of view, wrap it
					this.wrapView(0.5);
				}

			}).bind(this));

			this.redraw();
		}

		TimelineUI.prototype.setCanvas = function( canvas ) {
			this.canvas = canvas;
		}

		TimelineUI.prototype.add = function( elm ) {

			// Push element on the list
			this.elements.push( elm );

			// Create handle
			var elmHandle = elm.__timelineHandle =  $('<div class="tl-handle"></div>');
			this.elmSide.append( elmHandle );

			// Prepare handle
			propInfo = this.propUI.getPropInfo( elm );
			elmHandle.html( propInfo.name );
			elmHandle.click((function(elm) {
				return function(e) {
					this.selectByElement( elm );
				};
			})(elm).bind(this));

			// Redraw
			this.redraw();

		}

		/**
		 * Remove an object (Eleemen)
		 */
		TimelineUI.prototype.remove = function( elm ) {

			// Remove element from list
			var i = this.elements.indexOf( elm );
			if (i<0) return;
			this.elements.splice(i,1);

			// Remove element
			elm.__timelineHandle.remove();

			// Redraw
			this.redraw();

		}

		/**
		 * Request canvas update
		 */
		TimelineUI.prototype.updateCanvas = function() {
			if (!this.canvas) return;
			this.timeline.update();
			this.canvas.canvas.renderAll();
		}

		///////////////////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////////////////
		////                                                                                   ////
		////                            RENDERING FUNCTIONS                                    ////
		////                                                                                   ////
		///////////////////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////////////////

		/**
		 * Format ms to min/sec
		 */
		TimelineUI.prototype.formatTime = function(timeInMs) {
			var ms = parseInt(timeInMs),
				sec = Math.floor(ms/1000),
				min = Math.floor(sec/60),
				ms = ms % 1000;

			// Add leading zeros
			if (sec < 10) sec = "0"+sec;
			if (min < 10) min = "0"+min;
			ms = String(ms);

			// Add leading zeros
			var z = 3 - ms.length;
			for (var i=0; i<z; i++)
				ms = "0"+ms;

			return min+":"+sec+"."+ms;
		}

		/**
		 * Redraw all canvases
		 */
		TimelineUI.prototype.redraw = function() {
			setTimeout((function() {

				// Update canvas maximum height
				var elementHeight = this.config.padTop + this.config.audioHeight + this.config.lineHeight * this.elements.length + 1;
				this.canvasBody.attr('height', Math.max(this.canvasMinHeight, elementHeight) );

				// Clear canvases
				this.contextHead.clearRect( 0, 0, this.canvasHead.width(), this.canvasHead.height() );
				this.contextFooter.clearRect( 0, 0, this.canvasFooter.width(), this.canvasFooter.height() );

				// Redraw canvas components
				this.drawGrid		( this.context );
				this.drawElements	( this.context ); // <- maxX gets updated here
				this.drawNarration	( this.context );
				this.drawTimeline	( this.context );
				this.drawHeader		( this.contextHead );
				this.drawPreview 	( this.contextFooter );

				// Update status label
				if (this.timeline)
					this.elmStatus.html( "<strong>"+this.formatTime(this.timeline.position) + "</strong> / " + this.formatTime(this.timeline.duration) );

			}).bind(this), 1);
		}

		/**
		 * Draw the narration information
		 */
		TimelineUI.prototype.drawNarration = function(ctx) {
			if (!this.narration.available) return;

			// Draw chunk
			var colors = [ '#9b59b6', '#8e44ad' ], c = 0;
			var drawChunk = (function(tStart, tEnd, text) {
				var pxStart = this.time2pixels( tStart ),
					pxEnd = this.time2pixels( tEnd ),
					cBack = colors[c],
					cBorder = '#8e44ad',
					cFront = '#999';

				if ((this.timeline.position >= tStart) && (this.timeline.position <= tEnd)) {
					cBack = '#f39c12';
					cBorder = '#e67e22';
					cFront = '#FFF';
				}

				// Draw rect
				ctx.fillStyle = cBack;
				ctx.strokeStyle = cBorder;
				ctx.beginPath();
				ctx.rect(pxStart, this.config.padTop, pxEnd - pxStart, this.config.audioHeight );
				ctx.fill();
				ctx.stroke();

				// Draw text
				ctx.fillStyle = cFront;
				ctx.font = "10px sans-serif";
				ctx.fillText( text, pxStart+2, this.config.padTop+this.config.audioHeight-4 );

				// Iterate colors
				if (++c>1) c=0;

			}).bind(this);

			// Draw the Narration word chunks
			var startX=0, endX=0, first=true, lastWord="";
			for (var i=0; i<this.narration.words.length; i++) {
				var w = this.narration.words[i];
					endX = parseInt(w[0]);

				if (first) {
					first = false;
				} else {
					drawChunk(startX, endX, lastWord);
					startX = endX;
				}

				lastWord = w[1];

			}

			// Draw last word
			drawChunk(startX, this.narration.duration, lastWord);

		}

		/**
		 * Draw the background gridlines
		 */
		TimelineUI.prototype.drawGrid = function(ctx) {
			if (!this.timeline) return;

			// Calculate step
			var step = this.timeline.timeStep * this.timeScale;

			// Grid lines
			ctx.lineWidth = 1;
			for (var x=this.config.padLeft; x<this.canvasBody.width()+step; x+=step) {

				var t = this.pixels2time(x);
				if (((t+this.timeScale) % 1000) <= this.timeScale*2) {
					ctx.strokeStyle = '#6699FF';
					ctx.fillStyle = '#6699FF';
					ctx.font = "8px sans-serif";
					ctx.fillText( parseInt((t+this.timeScale)/1000) + " sec", x+2, 8);

				} else {
					ctx.strokeStyle = '#DDD';
					if (this.timeScale < 0.2) continue;
				}

				ctx.beginPath();
				ctx.moveTo(x,0);
				ctx.lineTo(x,this.canvasBody.height());
				ctx.stroke();
			}
	
		}

		/**
		 * Draw header timeline
		 */
		TimelineUI.prototype.drawHeader = function(ctx) {

			// Background
			ctx.fillStyle = '#FFF';
			ctx.fillRect(0,0,this.canvasWidth,this.canvasHeadHeight);

			// Border line
			ctx.strokeStyle = '#DDD';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(0,this.canvasHeadHeight-0.5);
			ctx.lineTo(this.canvasWidth,this.canvasHeadHeight-0.5);
			ctx.stroke();

			// Timeline bar background
			ctx.strokeStyle = '#BDC3C7';
			ctx.lineCap="round";
			ctx.lineWidth = 10;
			ctx.beginPath();
			ctx.moveTo( this.config.padLeft ,this.canvasHeadHeight/2);
			ctx.lineTo(this.canvasWidth-5,this.canvasHeadHeight/2);
			ctx.stroke();

			// Do not continue
			if (!this.timeline) return;

			// Get timeline cursor position
			var cursorPos = this.snapPixels( this.time2pixels( this.timeline.position ), this.config.padLeft );

			// Draw timeline
			ctx.strokeStyle = '#F00';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(cursorPos,this.canvasHeadHeight/2);
			ctx.lineTo(cursorPos,this.canvasHeadHeight);
			ctx.stroke();

			// Timeline bar foreground
			ctx.strokeStyle = '#2ECC71';
			ctx.lineCap="round";
			ctx.lineWidth = 10;
			ctx.beginPath();
			ctx.moveTo( this.config.padLeft, this.canvasHeadHeight/2);
			ctx.lineTo( cursorPos, this.canvasHeadHeight/2);
			ctx.stroke();

			// Draw handle
			ctx.strokeStyle = '#CCC';
			ctx.fillStyle = '#FFF';
			ctx.shadowColor = '#333';
			ctx.shadowOffsetY = 2;
			ctx.shadowBlur = 4;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(
				cursorPos,
				this.canvasHeadHeight/2,
				this.config.cursorHandleR,
				0,2*Math.PI)
			ctx.fill();
			ctx.shadowColor = '';
			ctx.shadowBlur = 0;
			ctx.shadowOffsetY = 0;
			ctx.stroke();

			// Draw inner part
			ctx.fillStyle = '#2ECC71';
			ctx.strokeStyle = '#AAA';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(
				cursorPos,
				this.canvasHeadHeight/2,
				5,0,2*Math.PI)
			ctx.fill();
			ctx.stroke();

		}

		/**
		 * Draw the cursor on the timeline
		 */
		TimelineUI.prototype.drawTimeline = function(ctx) {
		
			// Do not continue
			if (!this.timeline) return;

			// Get timeline cursor position
			var cursorPos = this.snapPixels( this.time2pixels( this.timeline.position ), this.config.padLeft );

			// Draw timeline
			ctx.strokeStyle = '#F00';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(cursorPos,0);
			ctx.lineTo(cursorPos,this.canvasBody.height());
			ctx.stroke();

		}

		/**
		 * Draw elements
		 */
		TimelineUI.prototype.drawElements = function(ctx) {

			ctx.strokeStyle = '#ddd';
			ctx.lineCap="butt";
			ctx.lineWidth = 1;

			// Also calculate maxX
			this.maxX = 0;

			var y = this.config.padTop + this.config.audioHeight, rowHeight = this.config.lineHeight;
			for (var i=0; i<this.elements.length; i++) {

				var elmBottom = y + rowHeight - 0.5,
					elmTop = y + 1.5;

				// Selected background
				if (this.selectedRow == i) {
					ctx.globalAlpha = 0.5;
					ctx.fillStyle = this.config.selectionFill;
					ctx.fillRect( 0, elmTop, this.canvasWidth, elmBottom-elmTop )
					ctx.globalAlpha = 1;
				}

				// Lower & Upper background lines
				ctx.strokeStyle = '#ddd';
				ctx.beginPath();
				ctx.moveTo(0, elmTop );
				ctx.lineTo(this.canvasWidth, elmTop );
				ctx.moveTo(0, elmBottom );
				ctx.lineTo(this.canvasWidth, elmBottom );
				ctx.stroke();

				// Get anchor information
				var anchors = this.getElementAnchors( this.elements[i] );
				if (anchors.length > 0) {

					// Update maxX
					if (anchors[anchors.length-1] > this.maxX)
						this.maxX = anchors[anchors.length-1];

					// Overall Band
					ctx.fillStyle = this.config.bandFill;
					ctx.strokeStyle = this.config.bandStroke;
					ctx.beginPath();
					ctx.rect( 
						anchors[0], 
						elmTop, 
						anchors[anchors.length-1] - anchors[0], 
						elmBottom-elmTop 
						);
					ctx.fill();
					ctx.stroke();

					// Active anchor
					if ((this.activeAnchor > -1) && (this.selectedRow == i)) {
						var aBegin = anchors[this.activeAnchor-1],
							aEnd = anchors[this.activeAnchor];

						ctx.fillStyle = this.config.bandHoverFill;
						ctx.strokeStyle = this.config.bandStroke;
						ctx.beginPath();
						ctx.rect( 
							aBegin, 
							elmTop, 
							aEnd-aBegin, 
							elmBottom-elmTop 
							);
						ctx.fill();
						ctx.stroke();

					}

					// Align anchors
					ctx.fillStyle = this.config.handleFill;
					ctx.strokeStyle = this.config.handleStroke;
					ctx.beginPath();
					for (var j=0; j<anchors.length; j++) {

						// Anchor vertical line
						ctx.moveTo( anchors[j]+0.5, elmTop+0.5 );
						ctx.lineTo( anchors[j], elmBottom );

						// Anchor rect
						ctx.rect( 
							anchors[j]-this.config.handleWidth/2+0.5, 
							elmTop+this.config.handleTrim+0.5, 
							this.config.handleWidth, 
							elmBottom-elmTop-this.config.handleTrim*2
							);

					}
					ctx.fill();
					ctx.stroke();

				}

				y += rowHeight;
			}

		}

		/**
		 * Draw all elements as preview
		 */
		TimelineUI.prototype.drawPreview = function(ctx) {
			if (!this.timeline) return;

			var w = ctx.canvas.width - this.config.padLeft - this.config.handleWidth, 
				h = ctx.canvas.height - 8,
				sceneWidthMs = Math.max(this.timeline.duration, w / this.timeScale),
				sceneWidthPx = sceneWidthMs * this.timeScale,
				wScaleMs = w / sceneWidthMs,
				wScalePx = w / sceneWidthPx;

			// Draw elements preview
			ctx.strokeStyle = '#333';
			ctx.lineWidth = 1;
			ctx.beginPath();
			var y = 4;
			for (var i=0; i<this.elements.length; i++) {
				var a = this.elements[i];
				if (a.__keyframes.length > 1) {
					var t0 = a.__keyframes[0].at * wScaleMs,
						t1 = a.__keyframes[a.__keyframes.length-1].at * wScaleMs;

					ctx.moveTo( t0 + this.config.padLeft, y);
					ctx.lineTo( t1 + this.config.padLeft, y );
					y += 2;
					if (y>h) break;
				}
			}
			ctx.stroke();

			// Draw position frame
			var pFrameLeft = -this.scrollX * wScalePx + this.config.padLeft,
				pFrameWidth = w * wScalePx;
			if (pFrameWidth+pFrameLeft > w) pFrameWidth = w-pFrameLeft;

			ctx.fillStyle = '#2ecc71';
			ctx.strokeStyle = '#2ecc71';
			ctx.globalAlpha = 0.4;
			ctx.beginPath();
			ctx.rect(pFrameLeft+0.5,2.5,pFrameWidth,h+2);
			ctx.fill();
			ctx.globalAlpha = 1;
			ctx.stroke();

			// Draw cursor
			var cursorPos = this.timeline.position * wScaleMs + this.config.padLeft;
			ctx.strokeStyle = '#F00';
			ctx.beginPath();
			ctx.moveTo(cursorPos+0.5,2.5);
			ctx.lineTo(cursorPos+0.5,h+4);
			ctx.stroke();

		}

		///////////////////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////////////////
		////                                                                                   ////
		////                      WRAPPER CLASSES USED FOR PROPERTY PAGES                      ////
		////                                                                                   ////
		///////////////////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////////////////

		/**
		 * Tween properties wrapper, used by the property editor
		 */
		TimelineUI.TweenPropertiesWrapper = function( tui, elm, keyframeIndex ) {
			this.elm = elm;
			this.kfIndex = keyframeIndex;
			this.__object = this;

			Object.defineProperties(this, {
				'easing': {
					get: (function() {
						return this.elm.__keyframes[this.kfIndex].easing || 'linear';
					}).bind(this),
					set: (function(v) {
						this.elm.__keyframes[this.kfIndex].easing = v;
						this.elm.updateReflection();
						tui.updateCanvas();
						tui.redraw();
					}).bind(this)
				},
				'duration': {
					get: (function() {
						var kfB = this.elm.__keyframes[this.kfIndex-1],
							kfE = this.elm.__keyframes[this.kfIndex];

						return kfE.at - kfB.at;

					}).bind(this),
					set: (function(v) {
						var kfB = this.elm.__keyframes[this.kfIndex-1],
							kfE = this.elm.__keyframes[this.kfIndex];

						if (this.kfIndex < this.elm.__keyframes.length-1) {
							var kfN = this.elm.__keyframes[this.kfIndex+1];
							if (kfB.at + v > kfN.at)
								v = kfN.at - kfB.at;
						}

						this.elm.__keyframes[this.kfIndex].at = kfB.at + v;
						this.elm.updateReflection();

					}).bind(this)
				}
			});
		} 

		/**
		 * Anchor properties wrapper, used by the property editor
		 */
		TimelineUI.KeyframeWrapper = function( tui, elm, keyframeIndex ) {
			this.elm = elm;
			this.tui = tui;
			this.kfIndex = keyframeIndex;
			this.__object = this;

			Object.defineProperties(this, {
				'position': {
					get: (function() {
						return this.elm.__keyframes[this.kfIndex].at;
					}).bind(this),
					set: (function(v) {
						this.elm.__keyframes[this.kfIndex].at = v;
						this.elm.updateReflection();
						tui.updateCanvas();
						tui.redraw();
					}).bind(this)
				}
			});
		} 

		// Return the timeline UI
		return TimelineUI;

	}

);
