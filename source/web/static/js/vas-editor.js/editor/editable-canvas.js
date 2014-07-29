define(

	["jquery", "fabric", "tweenjs", "core/db", "vas-editor/editor/editable-timeline"],

	function($, fabric, createjs, DB, EditableTimeline) {


		var EditableCanvas = function( canvasElement, propertiesUI, timelineUI ) {
			this.canvasElement = canvasElement;
			this.propertiesUI = propertiesUI;
			this.timelineUI = timelineUI;

			// Initialize canvas
			var canvas = this.canvas = new fabric.Canvas($(this.canvasElement)[0]);

			// Initialize timeline
			this.timeline = new EditableTimeline( this.canvas );
			timelineUI.setTimeline( this.timeline );
			timelineUI.setCanvas( this );
			window.c = this;

			//fabric.Object.prototype.transparentCorners = false;

			canvas.freeDrawingBrush.color = '#FFF';
			canvas.freeDrawingBrush.width = 4;

			// Redraw canvas on timeline change
			this.timeline.addEventListener('change', (function() {
				console.log("*** Timeline changed");
				var activeElm = this.canvas.getActiveObject();
				if (activeElm)
					activeElm.setCoords();
				this.canvas.renderAll();
			}).bind(this));

			canvas.on('mouse:down', (function(ev) {
				if (this.canvas.getActiveObject() != null) {
					this.__objectSelected( this.canvas.getActiveObject() );
				}
			}).bind(this));

			canvas.on('object:modified', (function(ev) {
				var timelineElement = this.timeline.elementFromFabricObject( ev.target );
				this.timeline.setKeyframe( timelineElement );
				console.log("Setting keyframe on ", timelineElement);
			}).bind(this));

			canvas.on('object:selected', (function(ev) {
				this.__objectSelected( ev.target );
			}).bind(this));

			canvas.on('selection:cleared', (function(ev) {

				this.propertiesUI.show( null );

			}).bind(this));

			canvas.on('path:created', (function(obj) {

				canvas.isDrawingMode = false;


				window.p = obj.path;

				var ow = window.ow = this.timeline.importObject( obj.path );
				this.timelineUI.add( ow );

			}).bind(this));

		};

		EditableCanvas.prototype.__objectSelected = function(o) {

			var timelineElement = this.timeline.elementFromFabricObject( o );
			this.propertiesUI.show( timelineElement, (function() {

				// Bugfix for aligning the controls
				timelineElement.__object.setCoords();

				// Update UI
				this.canvas.renderAll();

				// Take keyframe
				this.timeline.setKeyframe( timelineElement );

			}).bind(this) );

		}

		EditableCanvas.prototype.startFreeDrawing = function() {
			this.canvas.isDrawingMode = true;
		}

		EditableCanvas.prototype.play = function() {
			this.timeline.gotoAndPlay(0);
		}

		return EditableCanvas;

	}

);