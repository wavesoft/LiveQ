define(

	["jquery", "core/db", "vas-editor/editor/editable-canvas", "vas-editor/editor/ui-properties",  "vas-editor/editor/ui-timeline" ],

	function($, DB, EditableCanvas, PropertiesUI, TimelineUI ) {

		var Main = { };

		Main.initialize = function(cb) {

			this.propUI = new PropertiesUI( $("#properties") );
			this.timelineUI = new TimelineUI( $("#editor-timeline"), this.propUI );
			this.canvas = new EditableCanvas( $('#editor-canvas > canvas'), this.propUI, this.timelineUI );
			cb();

			// bind to events
			$("#editor-freehand").click((function(e) {
				this.canvas.startFreeDrawing();
			}).bind(this));
		}


		Main.run = function() {
		}

		return Main;

	}

);