define(

	["jquery", "core/db", "vas-editor/editor/editable-canvas", "vas-editor/editor/ui-properties",  "vas-editor/editor/ui-timeline" ],

	function($, DB, EditableCanvas, PropertiesUI, TimelineUI ) {

		var Main = { };

		Main.initialize = function(cb) {

			this.propUI = new PropertiesUI( $("#properties") );
			this.timelineUI = new TimelineUI( $("#editor-timeline"), this.propUI );
			this.canvas = new EditableCanvas( $('#editor-canvas > canvas'), this.propUI, this.timelineUI );

			// bind to events
			$("#editor-freehand").click((function(e) {
				this.canvas.startFreeDrawing();
			}).bind(this));
			$("#editor-delete").click((function(e) {
				var elm = this.canvas.getSelectedElement();
				this.timelineUI.remove(elm);
				this.canvas.remove(elm);
			}).bind(this));

			cb();

		}


		Main.run = function() {

			this.canvas.loadJSON(
					{"canvas":{"objects":[{"type":"path","originX":"center","originY":"center","left":195.75,"top":221,"width":111,"height":100,"fill":null,"stroke":"#FFF","strokeWidth":4,"strokeDashArray":null,"strokeLineCap":"round","strokeLineJoin":"round","strokeMiterLimit":10,"scaleX":1,"scaleY":1,"angle":0,"flipX":false,"flipY":false,"opacity":1,"shadow":null,"visible":true,"clipTo":null,"backgroundColor":"","path":[["M",29.5,1],["Q",29.5,1,30,1],["Q",30.5,1,30.25,0],["Q",30,-1,24,2.5],["Q",18,6,14.5,12.5],["Q",11,19,7,29.5],["Q",3,40,1.5,50.5],["Q",0,61,0,70],["Q",0,79,26.5,89.5],["Q",53,100,64.5,100],["Q",76,100,84.5,96],["Q",93,92,100,84],["Q",107,76,109,67],["Q",111,58,111.5,49.5],["Q",112,41,110.5,33.5],["Q",109,26,105.5,23],["Q",102,20,93,16.5],["Q",84,13,76,13],["Q",68,13,62.5,15],["Q",57,17,53.5,20.5],["Q",50,24,47.5,27.5],["Q",45,31,44,33.5],["Q",43,36,43,37.5],["Q",43,39,43,39.5],["Q",43,40,44,40],["Q",45,40,45.5,40],["Q",46,40,47,40],["Q",48,40,48.5,40],["Q",49,40,49.5,40]],"pathOffset":{"x":0,"y":0}},{"type":"path","originX":"center","originY":"center","left":319.5,"top":287,"width":87,"height":84,"fill":null,"stroke":"#FFF","strokeWidth":4,"strokeDashArray":null,"strokeLineCap":"round","strokeLineJoin":"round","strokeMiterLimit":10,"scaleX":1,"scaleY":1,"angle":0,"flipX":false,"flipY":false,"opacity":1,"shadow":null,"visible":true,"clipTo":null,"backgroundColor":"","path":[["M",66.5,8],["Q",66.5,8,67,8],["Q",67.5,8,65.75,8],["Q",64,8,55.5,8],["Q",47,8,40.5,8],["Q",34,8,28,8],["Q",22,8,17,8],["Q",12,8,9,9],["Q",6,10,3.5,12],["Q",1,14,0.5,16.5],["Q",0,19,0,25],["Q",0,31,1,38],["Q",2,45,9,54.5],["Q",16,64,29.5,74],["Q",43,84,51.5,84],["Q",60,84,64.5,83],["Q",69,82,71.5,78],["Q",74,74,77.5,67.5],["Q",81,61,83,55.5],["Q",85,50,86,43],["Q",87,36,87,30],["Q",87,24,87,19],["Q",87,14,85.5,10.5],["Q",84,7,81.5,5],["Q",79,3,77,2],["Q",75,1,72.5,0.5],["Q",70,0,68,0],["Q",66,0,65,0],["Q",64,0,63.5,0],["Q",63,0,62.5,0]],"pathOffset":{"x":0,"y":0}}],"background":""},"tweens":[[{"progression":1,"visible":true,"stroke":"#FFF","strokeWidth":4,"opacity":1,"left":164.75,"top":292,"scaleX":1,"scaleY":1,"angle":0,"at":0},{"progression":1,"visible":true,"stroke":"#FFF","strokeWidth":4,"opacity":1,"left":195.75,"top":221,"scaleX":1,"scaleY":1,"angle":0,"at":160}],[{"progression":1,"visible":true,"stroke":"#FFF","strokeWidth":4,"opacity":1,"left":515.5,"top":198,"scaleX":1,"scaleY":1,"angle":0,"at":0},{"progression":1,"visible":true,"stroke":"#FFF","strokeWidth":4,"opacity":1,"left":319.5,"top":287,"scaleX":1,"scaleY":1,"angle":0,"at":160}]]}
				);

		}

		return Main;

	}

);