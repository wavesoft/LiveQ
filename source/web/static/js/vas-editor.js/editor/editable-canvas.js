define(

	["jquery", "fabric", "tweenjs", "core/db", "vas-editor/editor/editable-timeline"],

	function($, fabric, createjs, DB, EditableTimeline) {


		var EditableCanvas = function( canvasElement, propertiesUI, timelineUI ) {
			this.canvasElement = canvasElement;
			this.propertiesUI = propertiesUI;
			this.timelineUI = timelineUI;

			// Initialize canvas
			var canvas = this.canvas = new fabric.Canvas($(this.canvasElement)[0], {
				isDrawingMode: true
			});

			// Initialize timeline
			this.timeline = new EditableTimeline( this.canvas );
			window.c = this;

			//fabric.Object.prototype.transparentCorners = false;

			canvas.freeDrawingBrush.color = '#FFF';
			canvas.freeDrawingBrush.width = 4;

			canvas.on('object:selected', (function(ev) {

				var timelineElement = this.timeline.elementFromFabricObject( ev.target );
				this.propertiesUI.show( timelineElement, (function() {

					// Bugfix for aligning the controls
					timelineElement.__object.setCoords();

					// Update UI
					this.canvas.renderAll();

				}).bind(this) );

			}).bind(this));

			canvas.on('selection:cleared', (function(ev) {

				this.propertiesUI.show( null );

			}).bind(this));

			canvas.on('path:created', (function(obj) {

				console.log(obj);
				canvas.isDrawingMode = false;


				window.p = obj.path;

				var ow = window.ow = this.timeline.importObject( obj.path );
				this.timelineUI.add( ow );

				//window.ow.onUpdate = function() { canvas.renderAll(); };

				/*
				window.doit = function() {
					window.ow.progression = 0;

					window.timeline = new createjs.Timeline();

					var tween = createjs.Tween.get(window.ow)
							.wait(500)
							.to({progression:1}, 1000);

					window.timeline.addTween(tween);
					setInterval(function() {
						window.timeline.tick(10);
					}, 10);
				}
				*/

			}).bind(this));

		};

		EditableCanvas.prototype.start = function() {

		}

		return EditableCanvas;

	}

);