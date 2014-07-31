define(

	["jquery", "fabric", "tweenjs", "core/db", "vas-editor/editor/editable-timeline"],

	function($, fabric, createjs, DB, EditableTimeline) {


		var EditableCanvas = function( canvasElement, propertiesUI, timelineUI ) {
			this.canvasElement = canvasElement;
			this.propertiesUI = propertiesUI;
			this.timelineUI = timelineUI;

			// Initialize fabric canvas
			fabric.Object.prototype.transparentCorners = false;
			var canvas = this.canvas = new fabric.Canvas($(this.canvasElement)[0]);

			// Initialize timeline
			this.timeline = new EditableTimeline( this.canvas );
			timelineUI.setTimeline( this.timeline );
			timelineUI.setCanvas( this );
			window.c = this;

			// Initialize variables
			this.propertiesClipboard = [];

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
				console.log("### Mouse Down");
				if (this.canvas.getActiveObject() != null) {
					console.log("### ... on selected");
					this.__objectSelected( this.canvas.getActiveObject() );
				}
			}).bind(this));

			canvas.on('object:modified', (function(ev) {
				console.log("### Modified");
				var timelineElement = this.timeline.elementFromFabricObject( ev.target );
				this.timeline.setKeyframe( timelineElement );
				console.log("Setting keyframe on ", timelineElement);
			}).bind(this));

			canvas.on('object:selected', (function(ev) {
				console.log("### Object Selected");
				this.timelineUI.selectByCanvasObject( ev.target );
				this.__objectSelected( ev.target );
			}).bind(this));

			canvas.on('selection:cleared', (function(ev) {
				this.timelineUI.selectByCanvasObject( null );
				this.propertiesUI.show( null );
			}).bind(this));

			canvas.on('path:created', (function(obj) {

				// A free-hand path created
				canvas.isDrawingMode = false;

				// Import path to timeline
				var path = obj.path;
				var element = this.timeline.importObject( path );
				this.timelineUI.add( element );

				// Select
				this.selectObject( path );

			}).bind(this));

		};

		/**
		 * Clear everything
		 */
		EditableCanvas.prototype.clear = function() {
			this.timeline.clear();
			this.timelineUI.clear();
			this.canvas.clear();
		}

		/**
		 * Load the stage information from a JSON object
		 */
		EditableCanvas.prototype.loadJSON = function( json ) {

			// Helper function to initialize tweens
			var initTweens = (function() {

				// Initialize timeline with json
				this.timeline.initWithJSON( this.canvas.getObjects(), json['tweens'] );

				// Place all the editable elements on timeline
				for (var i=0; i<this.timeline.editableObjects.length; i++) {
					this.timelineUI.add( this.timeline.editableObjects[i] );
				}

				// Redraw canvas
				this.canvas.renderAll();

			}).bind(this);

			// Reset everything
			this.clear();

			// Load canvas & then init tweens
			this.canvas.loadFromJSON(json['canvas'], initTweens);

		}

		/**
		 * Dump the canvas & timeline configuration to a reusable JSON object
		 */
		EditableCanvas.prototype.toJSON = function() {
			return this.timeline.toJSON( this.canvas );
		}

		EditableCanvas.prototype.remove = function( elm ) {
			if (!elm) return;

			// If this was an active object, unselect properties
			var ao = this.canvas.getActiveObject();
			if (elm.__object == ao) {
				this.propertiesUI.show( null );
				this.canvas.discardActiveObject();
			}

			// If this was part of an active group, disband group
			var ag = this.canvas.getActiveGroup();
			if (ag != null) {
				if (ag.objects.indexOf(elm.__object) > -1)
					this.canvas.discardActiveGroup();
			}

			// Remove objects
			elm.__object.remove();
			this.timeline.remove(elm);

			// Redraw
			this.canvas.renderAll();

		}

		/**
		 * Copy the current properties of the selected objects
		 */
		EditableCanvas.prototype.copyProperties = function()  {
			this.propertiesClipboard = [];
			var sel = this.getSelection();
			for (var i=0; i<sel.length; i++) {

				// Copy the properties of the selected object
				var prop = {}, refObj = sel[i];
				for (var j=0; j<refObj.__propertyNames.length; j++) {
					prop[refObj.__propertyNames[j]] = refObj[refObj.__propertyNames[j]];
				}

				// Store it on the clipboard
				this.propertiesClipboard.push(prop);
			}

		}

		/**
		 * Paste the current properties to the selected objects
		 */
		EditableCanvas.prototype.pasteProperties = function()  {
			if (!this.propertiesClipboard) return;
			var sel = this.getSelection();
			var k=0;
			for (var i=0; i<sel.length; i++) {

				// Copy properties back to object
				var prop = this.propertiesClipboard[k], refObj = sel[i];
				for (var j=0; j<refObj.__propertyNames.length; j++) {
					refObj[refObj.__propertyNames[j]] = prop[refObj.__propertyNames[j]];
				}

				// Set keyframe of that object
				this.timeline.setKeyframe( refObj );

				// Bugfix for aligning the controls
				refObj.__object.setCoords();

				// Increment & Wrap clipboard index
				if (++k>=this.propertiesClipboard.length) k=0;
			}

			// Redraw
			this.canvas.renderAll();

		}

		EditableCanvas.prototype.getSelection = function() {
			var ag = this.canvas.getActiveGroup(),
				ao = this.canvas.getActiveObject(),
				list = [];

			if (!ag && !ao) return [];
			if (ag) list=ag.objects;
			if (ao) list=[ao];

			var elements = [];
			for (var i=0; i<list.length; i++) {
				var elm = this.timeline.elementFromFabricObject( list[i] );
				if (elm) elements.push(elm);
			}

			return elements;

		}

		EditableCanvas.prototype.selectObject = function(o) {

			// Discard selection
			this.canvas.discardActiveGroup();
			if (o == null) {
				this.canvas.discardActiveObject();
				return;
			}

			// Select object
			this.canvas.setActiveObject(o);
			if (this.canvas.getActiveObject()) {
				this.__objectSelected(o);
			}

		}

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

		EditableCanvas.prototype.addImage = function(src) {
			fabric.Image.fromURL(src, (function(obj) {

				// Add to canvas
				this.canvas.add( obj );

				// Import path to timeline
				var element = this.timeline.importObject( obj );
				this.timelineUI.add( element );

				// Select
				this.selectObject( obj );

			}).bind(this));
		}

		EditableCanvas.prototype.addText = function( text, size, family ) {

			// Create font
			var obj = new fabric.Text( text, {
				'fontSize': size,
				'fontFamily': family || "Comic Sans",
				'fill': '#FFF'
			});

			// Add to canvas
			this.canvas.add( obj );

			// Import path to timeline
			var element = this.timeline.importObject( obj );
			this.timelineUI.add( element );

			// Select
			this.selectObject( obj );

		}

		EditableCanvas.prototype.addShape = function( shapeName ) {

			// Create font
			var obj = new fabric[shapeName]({
				'stroke': '#FFF',
				'fill': '',
				'radius': 50,
				'width': 100,
				'height': 100,
				'strokeWidth': 4,
				'originX': 'center',
				'originY': 'center'
			});

			// Add to canvas
			this.canvas.add( obj );

			// Import path to timeline
			var element = this.timeline.importObject( obj );
			this.timelineUI.add( element );

			// Select
			this.selectObject( obj );

		}

		EditableCanvas.prototype.play = function() {
			this.timeline.gotoAndPlay(0);
		}

		return EditableCanvas;

	}

);