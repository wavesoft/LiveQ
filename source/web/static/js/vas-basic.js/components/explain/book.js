
define(

	// Requirements
	["jquery", "core/registry", "core/base/components"],

	/**
	 * A pop-up book with explaination details regarding a parameter, an observable,
	 * or any other topic in the game.
	 *
	 * @exports basic/components/explain/book
	 */
	function($,R,C) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var ExplainBook = function( hostDOM ) {
			C.ExplainScreen.call(this, hostDOM);

			// Prepare header
			this.elmHeader = $('<div class="header"></div>');
			this.elmTitle = $('<span class="title">Book</span>');
			this.elmCloseBtn = $('<a href="do:close" class="close"><span class="uicon uicon-x"></span></a>');
			this.elmHeader.append( $('<span class="bullet"></span>') );
			this.elmHeader.append( this.elmTitle );
			this.elmHeader.append( this.elmCloseBtn );
			hostDOM.append(this.elmHeader);

			// Prepare body
			this.elmBody = $('<div class="body"></div>');
			hostDOM.append(this.elmBody);

			// Prepare footer
			this.elmFooter = $('<div class="footer"></div>');
			hostDOM.append(this.elmFooter);

			// Bind button events
			this.elmCloseBtn.click( (function(e) {
				e.preventDefault();
				e.stopPropagation();

			}).bind(this));

		}
		ExplainBook.prototype = Object.create( C.ExplainScreen.prototype );

		////////////////////////////////////////////////////////////
		//            Implementation-specific functions           //
		////////////////////////////////////////////////////////////

		/**
		 * Update the book definitions
		 */
		ExplainBook.prototype.onBookDefined = function(bookID) {
			
		}

		////////////////////////////////////////////////////////////
		//          Implementation of the ExplainScreen           //
		////////////////////////////////////////////////////////////

		/**
		 * Handle the onWillShow event
		 */
		ExplainBook.prototype.onWillShow = function(cb) {
			this.hostDOM.css("display", "block");
			setTimeout((function() {
				this.hostDOM.addClass("visible");
				setTimeout(cb, 200); // The display animation takes 200ms
			}).bind(this), 10);
		};

		/**
		 * Handle the onWillHide event
		 */
		ExplainBook.prototype.onWillHide = function(cb) {
			this.hostDOM.removeClass("visible");
			setTimeout((function() {
				this.hostDOM.css("display", "none");
				cb();
			}).bind(this), 200); // The display animation takes 200ms
		};

		// Register home screen
		R.registerComponent( "explain.book", ExplainBook, 1 );

	}

);