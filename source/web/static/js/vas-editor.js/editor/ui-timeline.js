define(

	["jquery", "vas-editor/runtime/timeline" ],

	function($, Timeline) {

		/**
		 * Interface component for editing the properties of an object
		 */
		var TimelineUI = function( hostDOM, propUI ) {
			this.hostDOM = $(hostDOM);
			this.propUI = propUI;
			this.scale = 0.1; // 100 pixels -> 1 sec

			// Configuration
			this.config = {

				lineHeight 		: 25,
				padLeft			: 10,
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

			// Prepare header/footer canvases
			var canvasHost = $('<div class="tl-right"></div>');
			this.elmHeader.append(canvasHost);

			this.canvasWidth = $(this.elmCanvas).width() - parseInt(this.elmCanvas.css("margin-left"));
			this.canvasHeadHeight = $(this.elmHeader).height();
			this.canvasHead = $('<canvas></canvas>');
			this.canvasHead.attr({
				'class'	 : 'tl-right',
				'width'  : this.canvasWidth,
				'height' : this.canvasHeadHeight
			});
			canvasHost.append( this.canvasHead );
			this.contextHead = this.canvasHead[0].getContext("2d");

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

			// Setup header
			this.canvasHead.mousemove((function(e) {
				var mouseY = e.offsetY,
					mouseX = e.offsetX;

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
						this.mouseDragX = mouseX;
						this.mouseDragValue = cursorPos;
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
					this.timeline.scrollPosition( time );

				}

			}).bind(this));

			this.canvasHead.mousedown((function(e) {
				// Just enable the possible drag mode
				this.mouseDragMode = this.mousePossibleDragMode;
			}).bind(this));

			// Setup mouse
			this.canvasBody.mousemove((function(e) {
				var mouseY = e.offsetY,
					mouseX = e.offsetX;

				//
				// NO DRAGGING : Lookup possible drag modes
				//
				if (!this.mouseDragMode) {

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
							this.mouseDragX = mouseX;
							this.mouseDragValue = anchors[i];
							this.canvasBody.css('cursor', 'pointer');

						} else {

							// Otherwise check if we are just inside bounds
							if ((mouseX >= anchors[0]) && (mouseX <= anchors[anchors.length-1])) {

								// Possible to drag the entire row
								this.mousePossibleDragMode = 2;
								this.mouseDragX = mouseX;
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

					console.log(delta);

					// Prohibit invalid positions of anchor
					var minPos = 0;
					if ( this.hoverAnchor > 0 ) {
						minPos = this.hoverElementAnchors[ this.hoverAnchor - 1 ];
					}
					if (pos+this.config.padLeft < minPos) pos = minPos-this.config.padLeft;
					if ( this.hoverAnchor < this.hoverElementAnchors.length-1 ) {
						var maxPos = this.hoverElementAnchors[ this.hoverAnchor + 1 ];
						if (pos+this.config.padLeft > maxPos) pos = maxPos-this.config.padLeft;
					}

					// Update item keyframes
					console.log("=== Element: ", elm, "===");
					console.log("  - Updating anchor #" + this.hoverAnchor + " from", elm.__keyframes[ this.hoverAnchor ].at );
					elm.__keyframes[ this.hoverAnchor ].at = this.pixels2time( this.snapPixels(pos, this.config.padLeft) );
					console.log("  - To ", elm.__keyframes[ this.hoverAnchor ].at );
					console.log("  - Updating reflection" );
					elm.updateReflection();
					console.log("  - Updating canvas" );
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

				}


			}).bind(this));

			this.canvasBody.mousedown((function(e) {
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
					this.timeline.scrollPosition( this.pixels2time( this.mouseDragValue ) );
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

				// Stop dragging
				this.mouseDragMode = 0;
				this.canvasHead.css('cursor', 'default');

			}).bind(this));

			// Start animation
			this.animate();

			window.tui = this;

		}

		TimelineUI.prototype.animate = function() {
			this.redraw();
			setTimeout((function() {
				requestAnimationFrame(this.animate.bind(this));
			}).bind(this), 25);
		}

		TimelineUI.prototype.time2pixels = function( tValue ) {
			return tValue * this.timeScale + this.config.padLeft;
		}

		TimelineUI.prototype.pixels2time = function( pValue ) {
			return (pValue - this.config.padLeft) / this.timeScale;
		}

		TimelineUI.prototype.snapPixels = function( xPos, offset ) {
			if (!this.timeline) return xPos;
			if (offset === undefined) offset = 0;
			var timePos = this.timeline.snapTime( (xPos - offset) / this.timeScale );
			return (timePos * this.timeScale) + offset;
		}

		TimelineUI.prototype.redraw = function() {

			// Update canvas maximum height
			var elementHeight = this.config.lineHeight * this.elements.length + 1;
			this.canvasBody.attr('height', Math.max(this.canvasMinHeight, elementHeight) );

			// Redraw canvas components
			this.drawGrid		( this.context );
			this.drawElements	( this.context );
			this.drawTimeline	( this.context );

			this.drawHeader		( this.contextHead );

		}

		TimelineUI.prototype.drawGrid = function(ctx) {
			if (!this.timeline) return;

			// Calculate step
			var step = this.timeline.timeStep * this.timeScale;

			// Grid lines
			ctx.strokeStyle = '#DDD';
			ctx.lineWidth = 1;
			ctx.beginPath();
			for (var x=this.config.padLeft; x<this.canvasBody.width()+step; x+=step) {
				ctx.moveTo(x,0);
				ctx.lineTo(x,this.canvasBody.height());
			}
			ctx.stroke();
	
		}

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

		TimelineUI.prototype.drawElements = function(ctx) {

			ctx.strokeStyle = '#ddd';
 			ctx.lineCap="butt";
 			ctx.lineWidth = 1;

			var y = 0, rowHeight = this.config.lineHeight;
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
			var y = 0, rowHeight = this.config.lineHeight;
			for (var i=0; i<this.elements.length; i++) {
				var elmBottom = y + rowHeight - 0.5,
					elmTop = y + 1.5;
				if ((yPos >= elmTop) && (yPos <= elmBottom))
					return i;
				y += rowHeight;
			}
			return -1;
		}

		TimelineUI.prototype.selectRow = function( id ) {

			// Activate DOM elements
			for (var i=0; i<this.elements.length; i++) {
				if (i == id) {
					this.elements[i].__timelineHandle.addClass("active");
				} else {
					this.elements[i].__timelineHandle.removeClass("active");
				}
			}

			// Activate canvas element
			this.selectedRow = id;
			this.redraw();

		}

		TimelineUI.prototype.setTimeline = function( timeline ) {
			this.timeline = timeline;
			this.redraw();
		}

		TimelineUI.prototype.setCanvas = function( canvas ) {
			this.canvas = canvas;
		}

		TimelineUI.prototype.add = function( obj ) {

			// Push element on the list
			this.elements.push( obj );

			// Create handle
			var elmHandle = obj.__timelineHandle =  $('<div class="tl-handle"></div>');
			this.elmSide.append( elmHandle );

			// Prepare handle
			elmHandle.html('<span class="glyphicon glyphicon-picture"></span> Object');
			elmHandle.click((function(index) {
				return function(e) {
					this.selectRow( index );
				};
			})(this.elements.length-1).bind(this));

			// Redraw
			this.redraw();

		}

		/**
		 * Request canvas update
		 */
		TimelineUI.prototype.updateCanvas = function() {
			if (!this.canvas) return;

			console.log("     - Calling timeline.update()" );
			this.timeline.update();

			console.log("     - Calling renderAll()" );
			this.canvas.canvas.renderAll();
		}

		/**
		 * Tween properties wrapper, used by the property editor
		 */
		TimelineUI.TweenPropertiesWrapper = function( tui, elm, keyframeIndex ) {
			this.elm = elm;
			this.kfIndex = keyframeIndex;

			Object.defineProperties(this, {
				'ease': {
					get: (function() {
						return this.elm.__keyframes[this.kfIndex]._easing || 'linear';
					}).bind(this),
					set: (function(v) {
						this.elm.__keyframes[this.kfIndex]._easing = v;
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
			this.kfIndex = keyframeIndex;

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
