define(

	// Dependencies

	["jquery", "core/registry","core/base/component", "core/db" ], 

	/**
	 * This is the default component for displaying flash overlay messages
	 *
 	 * @exports vas-basic/overlay/flash
	 */
	function(config, R, Component, DB) {

		/**
		 * The default tunable body class
		 */
		var OverlayQuestionaire = function(hostDOM) {

			// Initialize widget
			Component.call(this, hostDOM);
			hostDOM.addClass("questionaire-overlay");

			// Local properties
			this.questions = [];

			// Core DOM structuring
			this.eHeader = $('<div class="questions-header"></div>').appendTo(hostDOM);
			this.eQuestions = $('<div class="questions-host"></div>').appendTo(hostDOM);
			this.eFooter = $('<div class="questions-footer"></div>').appendTo(hostDOM);

			// Prepare header & Footer
			this.eHeader
				.append($('<h1><span class="glyphicon glyphicon-ok-circle"></span> Do you remember?</h1><p>Here is a quick questionaire. If you successfuly pass this you can get <strong>8</strong> credits!</p>'));
			this.eFooter
				.append(this.btnRegister = $('<button class="btn-shaded btn-blue btn-lg">Send</button>'))
				.append(this.btnCancel = $('<button class="btn-shaded btn-teal btn-lg">Cancel</button>'));

			// Set some default choices
			this.onQuestionaireDefined([
					{
						'question': 'A theoretical physicist...',
						'choices': [
							'Is checking for new forms of life'
						]
					}
				]);

		};

		// Subclass from ObservableWidget
		OverlayQuestionaire.prototype = Object.create( Component.prototype );

		/**
		 * Add a question
		 */
		OverlayQuestionaire.prototype.resetQuestions = function() {
			this.eQuestions.empty();
		}

		/**
		 * Add a question
		 */
		OverlayQuestionaire.prototype.addQuestion = function( question, options ) {
			var idx = this.questions.length+1,
				q = $('<div class="question"></div>').appendTo(this.eQuestions),
				h = $('<h2>'+idx+'. '+question+'</h2>').appendTo(q),
				choices_dom = [];

			for (var i=0; i<options.length; i++) {
					l = $('<label></label>');
					c = $('<input type="radio" name="question-'+idx+'" value="'+options[i]+'" />').appendTo(l),
					s = $('<span>'+options[i]+'</span>').appendTo(l);
				q.append(l);
				choices_dom.push(c);
			}

			// Store question record
			this.questions.push({
				'choices': options,
				'elements': choices_dom
			});
		}

		/**
		 * Reposition flashDOM on resize
		 */
		OverlayQuestionaire.prototype.onQuestionaireDefined = function( questions ) {
			this.resetQuestions();
			for (var i=0; i<questions.length; i++) {
				this.addQuestion( questions[i]['question'], questions[i]['choices'] );
			}
		}

		// Store overlay component on registry
		R.registerComponent( 'overlay.questionaire', OverlayQuestionaire, 1 );

	}

);