
define(

	// Requirements
	["core/config", "core/registry", "core/base/components", "core/ui", "codemirror", "coremirror-mode/javascript/javascript"],

	/**
	 * Basic black screen of death
	 *
	 * @exports vas-basic/components/screen_bsod
	 */
	function(config,R,C,UI,CodeMirror) {

		/**
		 * @class
		 * @classdesc The basic black screen of death
		 */
		var IPIDEScreen = function( hostDOM ) {
			C.IPIDEScreen.call(this, hostDOM);

			// Make this screen bsod
			hostDOM.addClass("ipide");
			this.registryID = "";
			this.codeContents = "";

			// Create a code editor
			this.eHeader = $('<div class="header">').appendTo(this.hostDOM);
			this.eFooter = $('<div class="footer">').appendTo(this.hostDOM);
			this.eCode = $('<div class="code"></div>').appendTo(this.hostDOM);
			this.eCodeEditor = $('<textarea></textarea>').appendTo(this.eCode);
			this.eSaveCode = $('<a class="btn-footer" href="javascript:;"><span class="glyphicon glyphicon-floppy-disk"></span> Save</a>').appendTo(this.eFooter);
			this.eCancel = $('<a class="btn-footer" href="javascript:;"><span class="glyphicon glyphicon-remove"></span> Cancel</a>').appendTo(this.eFooter);

			// Create codemirror from textarea
			this.cm = CodeMirror.fromTextArea(this.eCodeEditor.get(0), {
			    lineNumbers: true,
			    mode: "javascript"
			});

			// Handle re-placement of code
			this.eCancel.click((function() {
				this.trigger("cancel");
			}).bind(this));
			this.eSaveCode.click((function() {
				this.trigger("commit", this.cm.getValue());
			}).bind(this));

		}
		IPIDEScreen.prototype = Object.create( C.IPIDEScreen.prototype );

		/**
		 * Code for the IPIDE loaded
		 */
		IPIDEScreen.prototype.onCodeLoaded = function(title, code) {
			this.eHeader.text(title);
			this.codeContents = code;
		}

		/**
		 * Update CodeMirror only when visible
		 */
		IPIDEScreen.prototype.onShown = function() {
			this.cm.setValue(this.codeContents);
		}

		// Register login screen
		R.registerComponent( "screen.ipide", IPIDEScreen, 1 );

	}

);