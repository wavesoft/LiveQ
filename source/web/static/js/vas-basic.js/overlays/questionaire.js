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
				.append($('<h1><span class="glyphicon glyphicon-ok-circle"></span> Take out a pen and paper!</h1><p>Here is a quick questionaire. If you successfuly pass this you can get <strong>8</strong> credits!</p>'));
			this.eFooter
				.append(this.btnSubmit = $('<button class="btn-shaded btn-blue btn-lg">Send</button>'))
				.append(this.btnSkip = $('<button class="btn-shaded btn-teal btn-lg">Skip</button>'));

			// Set some default choices
			this.onQuestionaireDefined([
					{
						"question": "What does a histogram visualize?",
						"choices": [
							"The value of some measurement",
							"How frequent a value of a measurement occures",
							"How good or how bad a measurement is",
							"The time the measurement was taken"
						],
						"correct": 1
					},
					{
						"question": "What is the meaning of an error bar in the histogram?",
						"choices": [
							"It's the value range of each measurement",
							"It's the quality of the data on the given measurement",
							"It's the time interval when each measurement was taken",
							"It's the uncertainty of a particular value"
						],
						"correct": 3
					},
					{
						"question": "When we compare two histograms, when we consider the error bars?",
						"choices": [
							"Never",
							"When the error is big",
							"Always"
						],
						"correct": 2
					}
				]);

			// Bind events
			this.btnSkip.click((function() {
				this.trigger('close');
			}).bind(this));
			this.btnSubmit.click((function() {
				var ans = this.evaluate();
				if (ans == null) return;

				// Replace Send
				this.btnSubmit.hide();
				this.btnSkip.text("Close")
			}).bind(this));

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
		OverlayQuestionaire.prototype.addQuestion = function( record ) {
			var idx = this.questions.length+1,
				q = $('<div class="question"></div>').appendTo(this.eQuestions),
				h = $('<h2>'+idx+'. '+record['question']+'</h2>').appendTo(q),
				choices_dom = [], labels_dom = [];

			for (var i=0; i<record['choices'].length; i++) {
					l = $('<label></label>');
					c = $('<input type="radio" name="question-'+idx+'" value="'+record['choices'][i]+'" />').appendTo(l),
					s = $('<span>'+record['choices'][i]+'</span>').appendTo(l);
				q.append(l);
				choices_dom.push(c);
				labels_dom.push(l);
			}

			// Store question record
			this.questions.push({
				'correct'  : record['correct'],
				'choices'  : record['choices'],
				'elements' : choices_dom,
				'labels'   : labels_dom,
				'header'   : h
			});
		}

		/**
		 * Evaluate questionaire
		 */
		OverlayQuestionaire.prototype.evaluate = function() {
			var good=0, bad=0, total=this.questions.length,
				checkStatus = [];

			// First pass
			for (var i=0; i<this.questions.length; i++) {
				var q = this.questions[i], is_empty=true;

				// Check status & check for empty
				for (var j=0; j<q.elements.length; j++) {
					var e = q.elements[j];
					if (e.is(":checked")) {
						checkStatus.push( (q.correct == j) );
						is_empty = false;
						break;
					}
				}

				// If empty, return null
				if (is_empty) {
					return null;
				}
			}

			// Second pass: Apply statuses
			// First pass
			for (var i=0; i<this.questions.length; i++) {
				var q = this.questions[i], is_correct=checkStatus[i];

				// Mark the correct choice
				for (var j=0; j<q.labels.length; j++) {
					q.labels[j].addClass( (j == q.correct) ? 'correct' : 'incorrect' );
					if (j == q.correct) {
						q.labels[j].prepend($('<span class="glyphicon glyphicon-chevron-right"></span>'));
					}
				}

				// Mark the header
				if (is_correct) {
					q.header.append('&nbsp;<span class="glyphicon glyphicon-ok"></span>');
					q.header.addClass("good");
					good++;
				} else {
					q.header.append('&nbsp;<span class="glyphicon glyphicon-remove"></span>');
					q.header.addClass("bad");
					bad++;
				}
			}

			// Return ratio
			return good / total;

		}

		/**
		 * Reposition flashDOM on resize
		 */
		OverlayQuestionaire.prototype.onQuestionaireDefined = function( questions ) {
			this.resetQuestions();
			for (var i=0; i<questions.length; i++) {
				this.addQuestion( questions[i] );
			}
		}

		// Store overlay component on registry
		R.registerComponent( 'overlay.questionaire', OverlayQuestionaire, 1 );

	}

);