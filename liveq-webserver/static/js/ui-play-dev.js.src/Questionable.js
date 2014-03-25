
/**
 * Make the g
 */
LiveQ.Play.Questionable = function() {
	this.elements = [ ];
}

/**
 * Questionable element
 */
LiveQ.Play.QuestionableElement = function(element, config) {
	var self = this;

	// Validate config
	this.title = config.title || "";

	// Store element(s)
	this.element = element;
	this.btnQuestion = $('<div class="btn-question"><span class="glyphicon glyphicon-book"></span></div>');

	// Setup element
	this.element.addClass("questionable");
	this.element.append(this.btnQuestion);

	// Append title
	if (this.title) {
		this.btnQuestion.tooltip({
			'title': this.title,
			'placement': 'auto right',
			'container': this.element.parent()
		});
	}

	// Bind event
	$(element).mouseover(function() {
		self.element.addClass('questionable-active');
	});
	$(element).mouseout(function() {
		self.element.removeClass('questionable-active');
	});

}

/**
 * Make the given element questionable
 */
LiveQ.Play.Questionable.prototype.make = function(element, config) {
	this.elements.push(new LiveQ.Play.QuestionableElement(element, config));
}

/**
 * Create singleton
 */
LiveQ.Play.questionable = new LiveQ.Play.Questionable();
