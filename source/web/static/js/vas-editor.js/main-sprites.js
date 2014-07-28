define(

	["jquery", "core/db", "vas-editor/editor/sprite-canvas", "vas-editor/editor/sprite-store"],

	function($, DB, SpriteCanvas, SpriteStore) {

		var Main = { };

		Main.initialize = function(cb) {
			this.store = new SpriteStore();
			this.canvas = new SpriteCanvas( this.store, $('#editor-canvas > canvas') );
			cb();
		}


		Main.run = function() {
		}

		return Main;

	}

);