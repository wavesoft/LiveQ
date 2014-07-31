define(

	["jquery", "core/db", "vas-editor/editor/editable-canvas", "vas-editor/editor/ui-properties",  "vas-editor/editor/ui-timeline" ],

	function($, DB, EditableCanvas, PropertiesUI, TimelineUI ) {

		var Main = { };

		Main.loadFromDB = function(filename, cb) {
			var db = DB.openDatabase("animations");
			db.get(filename, (function(doc, err) {
				if (!doc) {
					alert("Unable to load the specified file!");
					if (cb) cb(false);
				} else {
					this.canvas.loadJSON(doc['data']);
					if (cb) cb(true);
				}
			}).bind(this));
		}

		Main.saveToDB = function(filename, cb) {
			var db = DB.openDatabase("animations");
			db.put(filename, this.canvas.toJSON(), (function(doc) {
				if (!doc) {
					alert("Unable to save the specified file!");
					if (cb) cb(false);
				} else {
					if (cb) cb(true);
				}
			}).bind(this));
		}

		Main.initialize = function(cb) {

			this.propUI = new PropertiesUI( $("#properties") );
			this.timelineUI = new TimelineUI( $("#editor-timeline"), this.propUI );
			this.canvas = new EditableCanvas( $('#editor-canvas > canvas'), this.propUI, this.timelineUI );

			// bind to events
			$("#editor-new").click((function(e) {
				this.canvas.clear();
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
				this.canvas.addImage( imageURL );
				jQuery("#editor-modal-image").modal('hide');
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

			cb();

		}


		Main.run = function() {

			this.canvas.loadJSON(
					{"canvas":{"objects":[{"type":"path","originX":"center","originY":"center","left":127.5,"top":215.5,"width":231,"height":143,"fill":null,"stroke":"#FFF","strokeWidth":4,"strokeDashArray":null,"strokeLineCap":"round","strokeLineJoin":"round","strokeMiterLimit":10,"scaleX":1,"scaleY":1,"angle":0,"flipX":false,"flipY":false,"opacity":1,"shadow":null,"visible":true,"clipTo":null,"backgroundColor":"","path":[["M",141.5,1],["Q",141.5,1,142,1],["Q",142.5,1,141.25,0.5],["Q",140,0,137.5,0],["Q",135,0,131.5,0],["Q",128,0,124.5,0],["Q",121,0,113.5,2],["Q",106,4,101,6],["Q",96,8,86.5,12],["Q",77,16,69.5,19.5],["Q",62,23,54,28],["Q",46,33,40.5,37],["Q",35,41,30.5,45.5],["Q",26,50,19.5,57],["Q",13,64,10,68],["Q",7,72,4,78.5],["Q",1,85,0.5,88.5],["Q",0,92,0,96.5],["Q",0,101,1,104],["Q",2,107,5,111.5],["Q",8,116,11,118.5],["Q",14,121,18.5,124],["Q",23,127,33.5,131.5],["Q",44,136,51.5,138],["Q",59,140,72.5,141.5],["Q",86,143,96,143],["Q",106,143,123,142],["Q",140,141,150,138],["Q",160,135,173,133],["Q",186,131,193,128],["Q",200,125,205.5,122.5],["Q",211,120,217,115.5],["Q",223,111,224.5,108.5],["Q",226,106,228,102.5],["Q",230,99,230.5,96.5],["Q",231,94,231,91.5],["Q",231,89,230.5,87],["Q",230,85,228.5,83.5],["Q",227,82,224.5,80.5],["Q",222,79,219.5,77.5],["Q",217,76,212.5,74],["Q",208,72,203,70.5],["Q",198,69,188,67.5],["Q",178,66,173,65.5],["Q",168,65,161,65],["Q",154,65,149,65],["Q",144,65,139,66],["Q",134,67,128,68.5],["Q",122,70,119.5,71.5],["Q",117,73,114,74.5],["Q",111,76,109,77],["Q",107,78,106,79.5],["Q",105,81,105,81.5],["Q",105,82,105,82.5],["Q",105,83,105,83.5],["Q",105,84,105,84.5],["Q",105,85,105.5,85.5],["Q",106,86,106.5,86.5],["Q",107,87,108,87.5],["Q",109,88,110,88.5],["Q",111,89,111.5,89.5]],"pathOffset":{"x":0,"y":0}},{"type":"path","originX":"center","originY":"center","left":720,"top":214.5,"width":138,"height":109,"fill":null,"stroke":"#FFF","strokeWidth":4,"strokeDashArray":null,"strokeLineCap":"round","strokeLineJoin":"round","strokeMiterLimit":10,"scaleX":1,"scaleY":1,"angle":0,"flipX":false,"flipY":false,"opacity":1,"shadow":null,"visible":true,"clipTo":null,"backgroundColor":"","path":[["M",70.5,0],["Q",70.5,0,71,0],["Q",71.5,0,66.25,0],["Q",61,0,57,0.5],["Q",53,1,47.5,3],["Q",42,5,38.5,7],["Q",35,9,30.5,12],["Q",26,15,23.5,17],["Q",21,19,16.5,23.5],["Q",12,28,9.5,31],["Q",7,34,5,37],["Q",3,40,1.5,45],["Q",0,50,0,53.5],["Q",0,57,0,62],["Q",0,67,1,71],["Q",2,75,5,79],["Q",8,83,10.5,85.5],["Q",13,88,17,92],["Q",21,96,24.5,97.5],["Q",28,99,31.5,100.5],["Q",35,102,42,104],["Q",49,106,54.5,107],["Q",60,108,66,108.5],["Q",72,109,77,109],["Q",82,109,89,109],["Q",96,109,102,108],["Q",108,107,113,105],["Q",118,103,121.5,101.5],["Q",125,100,128,97.5],["Q",131,95,133.5,91.5],["Q",136,88,137,85.5],["Q",138,83,138,79.5],["Q",138,76,138,74],["Q",138,72,137.5,69],["Q",137,66,135.5,63.5],["Q",134,61,131,59.5],["Q",128,58,126,56],["Q",124,54,121.5,53],["Q",119,52,115.5,50.5],["Q",112,49,108.5,48.5],["Q",105,48,101,48],["Q",97,48,94,48],["Q",91,48,87,48.5],["Q",83,49,80,49.5],["Q",77,50,73,50.5],["Q",69,51,66,52],["Q",63,53,60,53.5],["Q",57,54,55,55],["Q",53,56,51,57],["Q",49,58,47,58.5],["Q",45,59,44.5,59.5],["Q",44,60,43.5,61],["Q",43,62,42.5,62],["Q",42,62,41.5,63],["Q",41,64,41,64.5],["Q",41,65,41,65.5],["Q",41,66,41,66.5],["Q",41,67,42,67],["Q",43,67,43,67.5]],"pathOffset":{"x":0,"y":0}},{"type":"path","originX":"center","originY":"center","left":316,"top":348,"width":58,"height":80,"fill":null,"stroke":"#FFF","strokeWidth":4,"strokeDashArray":null,"strokeLineCap":"round","strokeLineJoin":"round","strokeMiterLimit":10,"scaleX":1,"scaleY":1,"angle":0,"flipX":false,"flipY":false,"opacity":0,"shadow":null,"visible":true,"clipTo":null,"backgroundColor":"","path":[["M",6.5,80],["Q",6.5,80,7,80],["Q",7.5,80,7.75,79.5],["Q",8,79,8,78.5],["Q",8,78,8,77],["Q",8,76,8,74.5],["Q",8,73,8,71.5],["Q",8,70,8,68],["Q",8,66,8,63],["Q",8,60,8,57.5],["Q",8,55,8,50.5],["Q",8,46,8,43],["Q",8,40,8,36.5],["Q",8,33,8,30],["Q",8,27,8,23],["Q",8,19,8.5,16.5],["Q",9,14,10.5,12],["Q",12,10,13.5,8],["Q",15,6,16.5,4.5],["Q",18,3,19.5,2],["Q",21,1,22.5,0.5],["Q",24,0,26.5,0],["Q",29,0,30.5,0],["Q",32,0,34.5,0.5],["Q",37,1,39,2],["Q",41,3,43.5,4],["Q",46,5,48,7.5],["Q",50,10,51.5,12],["Q",53,14,54.5,16],["Q",56,18,56.5,20],["Q",57,22,57.5,23],["Q",58,24,58,25.5],["Q",58,27,58,28],["Q",58,29,57.5,29.5],["Q",57,30,56.5,30.5],["Q",56,31,55,32],["Q",54,33,52.5,33.5],["Q",51,34,49,34.5],["Q",47,35,45,35.5],["Q",43,36,40.5,36.5],["Q",38,37,35.5,37],["Q",33,37,30.5,37],["Q",28,37,24.5,37],["Q",21,37,19,37],["Q",17,37,14.5,37],["Q",12,37,10,36.5],["Q",8,36,6,36],["Q",4,36,3.5,36],["Q",3,36,2,35.5],["Q",1,35,0.5,35]],"pathOffset":{"x":0,"y":0}},{"type":"path","originX":"center","originY":"center","left":597,"top":340.5,"width":60,"height":93,"fill":null,"stroke":"#FFF","strokeWidth":4,"strokeDashArray":null,"strokeLineCap":"round","strokeLineJoin":"round","strokeMiterLimit":10,"scaleX":1,"scaleY":1,"angle":0,"flipX":false,"flipY":false,"opacity":0,"shadow":null,"visible":true,"clipTo":null,"backgroundColor":"","path":[["M",20.5,93],["Q",20.5,93,21,93],["Q",21.5,93,21.25,91.5],["Q",21,90,21,87.5],["Q",21,85,21,82.5],["Q",21,80,20.5,77.5],["Q",20,75,19.5,71.5],["Q",19,68,18,64.5],["Q",17,61,16,56],["Q",15,51,14.5,47],["Q",14,43,13,38.5],["Q",12,34,12,31],["Q",12,28,12,24.5],["Q",12,21,12,18.5],["Q",12,16,13,14.5],["Q",14,13,15.5,11.5],["Q",17,10,18.5,8.5],["Q",20,7,22,6],["Q",24,5,26,4.5],["Q",28,4,30.5,3],["Q",33,2,35,1.5],["Q",37,1,40,0.5],["Q",43,0,44.5,0],["Q",46,0,48.5,0],["Q",51,0,52.5,1],["Q",54,2,55,2.5],["Q",56,3,57,4.5],["Q",58,6,58.5,7],["Q",59,8,59.5,9.5],["Q",60,11,60,12.5],["Q",60,14,60,16],["Q",60,18,60,19.5],["Q",60,21,59.5,22],["Q",59,23,57.5,24.5],["Q",56,26,54.5,27.5],["Q",53,29,51,29.5],["Q",49,30,47,30],["Q",45,30,41.5,30],["Q",38,30,34.5,30],["Q",31,30,28,30],["Q",25,30,22.5,30],["Q",20,30,17.5,30],["Q",15,30,12.5,30],["Q",10,30,8,30],["Q",6,30,5,30],["Q",4,30,2.5,30],["Q",1,30,0.5,30]],"pathOffset":{"x":0,"y":0}}],"background":""},"tweens":[[{"progression":0,"visible":true,"stroke":"#FFF","strokeWidth":4,"opacity":1,"left":282.5,"top":226.5,"scaleX":1,"scaleY":1,"angle":0,"at":0},{"progression":1,"visible":true,"stroke":"#FFF","strokeWidth":4,"opacity":1,"left":282.5,"top":226.5,"scaleX":1,"scaleY":1,"angle":0,"at":1000},{"progression":1,"visible":true,"stroke":"#FFF","strokeWidth":4,"opacity":1,"left":283.5,"top":226.5,"scaleX":1,"scaleY":1,"angle":0,"at":3400},{"progression":1,"visible":true,"stroke":"#FFF","strokeWidth":4,"opacity":1,"left":127.5,"top":215.5,"scaleX":1,"scaleY":1,"angle":0,"at":5000,"easing":"elasticOut"}],[{"progression":0,"visible":true,"stroke":"#FFF","strokeWidth":4,"opacity":1,"left":589,"top":215.5,"scaleX":1,"scaleY":1,"angle":0,"at":2000},{"progression":1,"visible":true,"stroke":"#FFF","strokeWidth":4,"opacity":1,"left":589,"top":215.5,"scaleX":1,"scaleY":1,"angle":0,"at":3000},{"progression":1,"visible":true,"stroke":"#FFF","strokeWidth":4,"opacity":1,"left":589,"top":215.5,"scaleX":1,"scaleY":1,"angle":0,"at":3400},{"progression":1,"visible":true,"stroke":"#FFF","strokeWidth":4,"opacity":1,"left":720,"top":214.5,"scaleX":1,"scaleY":1,"angle":0,"at":5000,"easing":"elasticOut"}],[{"progression":0,"visible":true,"stroke":"#FFF","strokeWidth":4,"opacity":1,"left":316,"top":348,"scaleX":1,"scaleY":1,"angle":0,"at":1000},{"progression":1,"visible":true,"stroke":"#FFF","strokeWidth":4,"opacity":1,"left":316,"top":348,"scaleX":1,"scaleY":1,"angle":0,"at":1400},{"progression":1,"visible":true,"stroke":"#FFF","strokeWidth":4,"opacity":1,"left":316,"top":348,"scaleX":1,"scaleY":1,"angle":0,"at":3400},{"progression":1,"visible":true,"stroke":"#FFF","strokeWidth":4,"opacity":0,"left":316,"top":348,"scaleX":1,"scaleY":1,"angle":0,"at":4000}],[{"progression":0,"visible":true,"stroke":"#FFF","strokeWidth":4,"opacity":1,"left":597,"top":340.5,"scaleX":1,"scaleY":1,"angle":0,"at":3000},{"progression":1,"visible":true,"stroke":"#FFF","strokeWidth":4,"opacity":1,"left":597,"top":340.5,"scaleX":1,"scaleY":1,"angle":0,"at":3400},{"progression":1,"visible":true,"stroke":"#FFF","strokeWidth":4,"opacity":0,"left":597,"top":340.5,"scaleX":1,"scaleY":1,"angle":0,"at":4000}]]}
				);

		}

		return Main;

	}

);