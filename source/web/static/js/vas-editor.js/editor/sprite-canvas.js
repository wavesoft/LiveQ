define(

	["jquery", "fabric", "tweenjs", "core/db"],

	function($, fabric, createjs, DB) {

		var SpriteCanvas = function(store, canvasElement) {
			this.store = store;
			this.canvasElement = canvasElement;

			var canvas = this.canvas = new fabric.Canvas($(this.canvasElement)[0], {
				isDrawingMode: true
			});

			//fabric.Object.prototype.transparentCorners = false;

			canvas.freeDrawingBrush.color = '#FFF';
			canvas.freeDrawingBrush.width = 4;

			window.c = canvas;

		};

		SpriteCanvas.prototype.start = function() {

		}

		return SpriteCanvas;

	}

);