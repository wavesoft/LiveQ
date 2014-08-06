define(

	["jquery", "core/db", "vas-editor/editor/editable-canvas", "vas-editor/editor/ui-properties",  "vas-editor/editor/ui-timeline", "vas-editor/editor/editable-hotspots" ],

	function($, DB, EditableCanvas, PropertiesUI, TimelineUI, EditableHotspots ) {

		var Main = { };

		Main.loadFromDB = function(filename, cb) {
			var db = DB.openDatabase("animations");
			db.get(filename, (function(doc, err) {
				if (!doc) {
					alert("Unable to load the specified file!");
					if (cb) cb(false);
				} else {
					
					// Populate objects
					this.canvas.loadJSON(doc['scene']);
					this.hotspots.loadJSON(doc['spots']);
					this.timelineUI.narrationFromJSON(doc['narration']);

					// Update narration UI
					var narration = doc['narration'];
					if (narration) {
						$("#editor-speech-text").val( narration['text'] );
						$("#editor-speech-voice").val( narration['voice'] );
					}

					if (cb) cb(true);
				}
			}).bind(this));
		}

		Main.saveToDB = function(filename, cb) {
			var db = DB.openDatabase("animations");

			// Prepare save record
			var record = {
				'scene' 	: this.canvas.toJSON(),
				'spots' 	: this.hotspots.toJSON(),
				'narration'	: this.timelineUI.narrationToJSON()
			};
			console.log("Saving:", JSON.stringify(record));

			db.put(filename, record, (function(doc) {
				if (!doc) {
					alert("Unable to save the specified file!");
					if (cb) cb(false);
				} else {

					// Prohibit narration from being deleted
					this.timelineUI.preserveNarrationRevision();

					if (cb) cb(true);
				}
			}).bind(this));
		}

		Main.initialize = function(cb) {

			this.propUI = new PropertiesUI( $("#properties") );
			this.timelineUI = new TimelineUI( $("#editor-timeline"), this.propUI );
			this.canvas = new EditableCanvas( $('#editor-canvas > canvas'), this.propUI, this.timelineUI );
			this.hotspots = new EditableHotspots( $('#editor-canvas > .hotspots'), $('#hotspots') );

			// Helper to create icon
			var createIcon = (function(url) {
				var a = $('<a href="javascript:;"></a>');
				a.css({
					'background-image': 'url(' + url + ')'
				});
				a.click((function(imageURL) {
					return function() {
						this.canvas.addImage( imageURL );
						jQuery("#editor-modal-image").modal('hide');
					}
				})(url).bind(this));
				$("#editor-modal-images-host").append(a);
			}).bind(this);

			// bind to events
			$("#editor-new").click((function(e) {
				this.canvas.clear();
				this.hotspots.clear();
			}).bind(this));
			$("#editor-freehand").click((function(e) {
				this.canvas.startFreeDrawing();
			}).bind(this));
			$("#editor-delete").click((function(e) {
				var sel = this.canvas.getSelection();
				for (var i=0; i<sel.length; i++) {
					this.timelineUI.remove(sel[i]);
					this.canvas.remove(sel[i]);
				}
			}).bind(this));
			$("#editor-keyframe").click((function(e) {
				var sel = this.canvas.getSelection();
				if (sel.length == 0) {
					this.canvas.timeline.setKeyframe();
				} else {
					for (var i=0; i<sel.length; i++) {
						this.canvas.timeline.setKeyframe(sel[i]);
					}
				}
			}).bind(this));
			$("#editor-select-none").click((function(e) {
				this.canvas.selectObject(null);
			}).bind(this));

			$("#editor-save").click((function(e) {
				var file = $("#editor-save-filename").val();
				this.saveToDB(file, function(ok) {
					if (ok) $("#editor-modal-save").modal('hide');
				});
			}).bind(this));
			$("#editor-open").click((function(e) {
				var file = $("#editor-open-filename").val();
				this.loadFromDB(file, function(ok) {
					if (ok) $("#editor-modal-open").modal('hide');
				});
			}).bind(this));

			$("#editor-copy-prop").click((function(e) {
				this.canvas.copyProperties();
			}).bind(this));
			$("#editor-paste-prop").click((function(e) {
				this.canvas.pasteProperties();
			}).bind(this));

			$("#editor-add-image").click((function(e) {
				var imageURL = $("#editor-image-url").val();

				$.ajax({
					'url'       : 'imageapi.php?a=import&url='+escape(imageURL),
					'method' 	: 'GET',
					'dataType'	: 'json',				
					success: (function(data) {
						if (data['res'] == 'ok') {
							createIcon( data['file'] );
							this.canvas.addImage( data['file'] );
							jQuery("#editor-modal-image").modal('hide');
						}
					}).bind(this)
				});

			}).bind(this));
			$("#editor-add-text").click((function(e) {
				var textString = $("#editor-text").val(),
					textSize = parseInt($("#editor-text-size").val()),
					textFamily = $("#editor-text-family").val();

				this.canvas.addText( textString, textSize, textFamily );
				jQuery("#editor-modal-text").modal('hide');
			}).bind(this));

			var updateTextPreview = function() {
				var textString = $("#editor-text").val(),
					textSize = parseInt($("#editor-text-size").val()),
					textFamily = $("#editor-text-family").val();

				$("#editor-text-preview").css({
					'font-family': textFamily,
					'font-size': textSize
				});
				$("#editor-text-preview").text(textString || "Sample Text");
			};
			$("#editor-text").change(updateTextPreview);
			$("#editor-text-size").change(updateTextPreview);
			$("#editor-text-family").change(updateTextPreview);
			updateTextPreview();

			$("#editor-add-circle").click((function(e) { this.canvas.addShape( 'Circle' ); }).bind(this));
			$("#editor-add-triangle").click((function(e) { this.canvas.addShape( 'Triangle' ); }).bind(this));
			$("#editor-add-rect").click((function(e) { this.canvas.addShape( 'Rect' ); }).bind(this));

			$("#editor-btn-properties").click((function(e) { this.hotspots.setActive(false); }).bind(this));
			$("#editor-btn-hotspots").click((function(e) { this.hotspots.setActive(true); }).bind(this));

			$("#editor-speech").click((function(e) {
				$("#editor-speech").prop("disabled", "disabled")
								   .html("Updating ...");

				this.timelineUI.regenNarration( $("#editor-speech-text").val(), $("#editor-speech-voice").val(), function(status) {
					if (status) {
						$("#editor-speech").prop("disabled", "")
										   .html("Update narration");
						$("#editor-modal-speech").modal('hide');
					}
				})

			}).bind(this));

			// Populate images
			$.ajax({
				'url'       : 'imageapi.php?a=list',
				'method' 	: 'GET',
				'dataType'	: 'json',				
				success: function(data) {
					if (data['res'] == 'ok') {
						var files = data['files'];
						for (var i=0; i<files.length; i++) {
							createIcon(files[i]);
						}
					}
				}
			});

			cb();

		}


		Main.run = function() {

		}

		return Main;

	}

);