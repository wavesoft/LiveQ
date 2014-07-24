define(

	["jquery", "core/db"],

	function($, DB) {

		var Editor = { };

		/**
		 * The root topic
		 */
		Editor.rootTopic = null;

		/**
		 * The raw array of topics
		 */
		Editor.topicArray = [];

		/**
		 * The dictionary for looking-up topics by their ID
		 */
		Editor.topicIndex = [];

		/**
		 * Initialize Editor to the given DOM element
		 */
		Editor.initialize = function( readyCallback ) {
			var sequence = [

					/**
					 * Fetch database
					 */
					function(cb) {
						
						DB.openDatabase("topic_map").all(function(topics) {
							
							// Store topics array
							Editor.topicArray = topics;

							// Build index
							for (var i=0; i<topics.length; i++) {
								var t = topics[i];
								// Set root topic
								if (t['parent'] == null)
									Editor.rootTopic = t;
								// Update topic lookup table
								Editor.topicIndex[t['_id']] = t;
							}

							// Build linked list

						});

					}

				];

			// Sequencing script
			var seq_index = 0, seq_next = function() { if (seq_index >= sequence.length) {
				readyCallback(); } else { sequence[seq_index]( seq_next ); seq_index += 1; }};
				seq_next();
			// =================
		}

		/**
		 * Run the editor
		 */
		Editor.run = function() {

		}

		// Return editor
		return Editor;

	}

);