define(

	["jquery", "vas-editor/runtime/timeline" ],

	function($, Timeline) {

		var VisualElementHandleDragger = function() {

		}

		var VisualTimelineElement = function( timeline, element ) {
			this.timeline = timeline;
			this.element = element;

			// Prepare & Nest DOM elements
			this.elmTimelineRow = $('<div class="tl-row"></div>');
			this.elmTitle = $('<div class="title"></div>');
			this.elmTweens = $('<div class="tweens"></div>');
			this.elmTimelineRow.append( this.elmTitle );
			this.elmTimelineRow.append( this.elmTweens );
			this.timeline.elmBody.append( this.elmTimelineRow );

			this.elmTween = $('<div class="tween">');
			this.elmTweens.append( this.elmTween );
			this.handles = [];

			// Prepare title
			this.elmTitle.html('<span class="glyphicon glyphicon-record"></span> Object');

		}

		VisualTimelineElement.prototype.regenTweens = function() {

			// Empty tween handles
			this.handles = [];
			this.elmTween.empty();
			this.elmTween.css({"width": 0, "left": 0});

			var startPos = null, lastPos = 0;
			for (var i=0; i<this.element.__keyframes.length; i++) {
				var kf = this.element.__keyframes[i],
					at = kf.at * this.timeline.scale;

				// Align tween begin position
				if (startPos == null) {
					startPos = at;
					lastPos = at;
					this.elmTween.css({
						"left": at
					});
				}

				// Create handle
				var h = $('<div class="handle"></div>');
				h.css({
					'left': at - startPos
				})
				this.elmTween.append(h);
				this.handles.push({
					'keyframe': kf,
					'handle': h
				});

				// Calculate the bounds for the dragger
				var dragger = new VisualElementHandleDragger( h, lastPos );

				// Stretch tween
				this.elmTween.css({
					'width': at - startPos
				});

				// Keep last pos
				lastPos = at;

			}
		}

		/**
		 * Interface component for editing the properties of an object
		 */
		var TimelineUI = function( hostDOM, propUI) {
			this.hostDOM = $(hostDOM);
			this.propUI = propUI;
			this.scale = 0.1; // 100 pixels -> 1 sec

			this.elmHeader = $('<div class="tl-header"></div>');
			this.elmFooter = $('<div class="tl-footer"></div>');
			this.elmBody = $('<div class="tl-body"></div>');
			this.hostDOM.append( this.elmHeader );
			this.hostDOM.append( this.elmBody );
			this.hostDOM.append( this.elmFooter );

			this.elements = [];

			window.tui = this;

		}

		TimelineUI.prototype.add = function( obj ) {
			var vte = new VisualTimelineElement( this, obj );
			this.elements.push( vte );
			return vte;
		}

		// Return the timeline UI
		return TimelineUI;

	}

);
