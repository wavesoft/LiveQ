
define(

	// Requirements
	["jquery", "d3", "core/db", "core/ui", "core/config", "core/registry", "core/base/components"],

	/**
	 * Basic version of the home screen
	 *
	 * @exports basic/components/explain_screen
	 */
	function($, d3, DB, UI, config, R,C) {

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var ExplainScreen = function( hostDOM ) {
			C.ExplainScreen.call(this, hostDOM);

			// Prepare host
			hostDOM.addClass("explain");

			// Create a slpash backdrop
			this.backdropDOM = $('<div class="'+config.css['backdrop']+'"></div>');
			hostDOM.append(this.backdropDOM);
			this.backdrop = R.instanceComponent("backdrop.explain", this.backdropDOM);

			// Create foreground
			this.foregroundDOM = $('<div class="'+config.css['foreground']+' fullscreen"></div>');
			hostDOM.append(this.foregroundDOM);

			// Create host element where to place the explain screen
			this.elmWindow = $('<div class="explain-window cs-green"></div>').appendTo(this.foregroundDOM);
			var elmHeader = $('<div class="explain-header">').appendTo(this.elmWindow);
			this.elmIcon = $('<div class="icon" style="background-image: url(static/img/level-icons/pdfs.png);"></div>').appendTo(elmHeader);
			this.elmTitle = $('<h1>Level Title</h1>').appendTo(elmHeader);
			this.elmSubtitle = $('<p class="subtitle">Level Title</p>').appendTo(elmHeader);
			this.elmScreen = $('<div class="explain-screen"></div>').appendTo(this.elmWindow);
			this.elmFooter = $('<div class="explain-footer"></div>').appendTo(this.elmWindow);
			this.elmPopup = $('<div class="explain-popup"></div>').appendTo(this.elmWindow);
			this.elmPopupFooter = $('<div class="btn-host"></div>').appendTo(this.elmPopup);

			// Hide footer by default
			this.elmPopupFooter.hide();

			// Create buttons on footer
			/*
			this.btnExplain = $('<div class="footer-btn"><span class="uicon uicon-explain"></span> Explain</div>').appendTo(this.elmFooter);
			this.btnLearn = $('<div class="footer-btn"><span class="uicon uicon-info"></span> Learn</div>').appendTo(this.elmFooter);
			this.btnUnderstand = $('<div class="footer-btn"><span class="uicon uicon-game"></span> Understand</div>').appendTo(this.elmFooter);
			this.btnResearch = $('<div class="footer-btn"><span class="uicon uicon-find"></span> Research</div>').appendTo(this.elmFooter);
			*/

			// Level buttons
			var levelBtn;
			levelBtn = $('<a href="#" class="btn-level">1</a>').appendTo(this.elmFooter);
			levelBtn = $('<a href="#" class="btn-level">2</a>').appendTo(this.elmFooter);
			levelBtn = $('<a href="#" class="btn-level">3</a>').appendTo(this.elmFooter);

			// Action buttons
			var actionBtn;
			actionBtn = $('<a href="#" class="btn-do"><span class="uicon uicon-gear"></span></a>').appendTo(this.elmPopupFooter);


			// Initialize explain screen
			this.createExplainScreen();
			this.loadScene("level-1-1");

		}
		ExplainScreen.prototype = Object.create( C.ExplainScreen.prototype );

		/**
		 * Load explain scene
		 */
		ExplainScreen.prototype.loadScene = function(id) {

			// Load animations for the explain scene
			var db = DB.openDatabase("animations");
			db.get(id, (function(doc, err) {
				if (!doc) {
					// TODO: Show error
				} else {
					this.explainComponent.onAnimationUpdated( doc );
				}
			}).bind(this));
			
		}

		/**
		 * Setup screen
		 */
		ExplainScreen.prototype.createExplainScreen = function() {
			this.elmScreen.addClass("cs-blackboard");

			var explainBlackboard = $('<div></div>').appendTo(this.elmScreen),
				com = R.instanceComponent("explain.blackboard", explainBlackboard);

			if (!com) {
				console.warn("ExplainScreen: Unable to ininitalize explain blackboard!");
				explainBlackboard.remove();
				return;
			} else {

				// Initialize component
				this.explainComponent = com;

				// Adopt & Forward events
				this.forwardVisualEvents( com );
				this.adoptEvents( com );

			}

		}

		/**
		 * Forward ExplainScreen events to our child components
		 */
		ExplainScreen.prototype.onResize = function(w,h) {
			this.width = w;
			this.height = h;

			var winW = $(this.elmWindow).width(),
				winH = $(this.elmWindow).height();

			// Realign window
			this.elmWindow.css({
				'left': (w - winW) / 2,
				'top': (h - winH) / 2
			});
		}

		/**
		 * Pause fore before exiting
		 */
		ExplainScreen.prototype.onHidden = function() {
		}

		/**
		 * Update level status 
		 */
		ExplainScreen.prototype.onWillShow = function(cb) {
			cb();
		}


		// Register home screen
		R.registerComponent( "screen.explain", ExplainScreen, 1 );

	}

);