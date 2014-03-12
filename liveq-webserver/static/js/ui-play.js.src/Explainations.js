
/**
 * Define custom popcorn plugin that handles the explainations I/O
 */
Popcorn.plugin( "maskedFocus", function( options ) {

	var isVisible = true,
		focusElement = null;

	return {
		start: function(event, track) {
			focusElement = options.focus,
			isVisible = focusElement.is(":visible");

			// Show element if it's hidden
			if (!isVisible) focusElement.show();

			// Focus to that element
			LiveQ.UI.explainations.focusToElement(options.focus);

			// Check if we have text
			if ((options['text'] !== undefined) && (options['title'] !== undefined)) {
				console.log("Showing popover", options);
				focusElement.popover({
					'content': options['text'],
					'title': options['title'],
					'placement': options['placement'] || 'bottom',
					'trigger': 'manual',
					'container': LiveQ.UI.explainations.eExplainBackdrop
				});
				focusElement.popover('show');
			}


		},
		end: function(event, track) {

			// Unfocus element on exit
			LiveQ.UI.explainations.unfocusElement();

			// And if required, re-hide
			if (!isVisible)
				focusElement.hide();

			// Hide popover
			if (options['text'] !== undefined)
				focusElement.popover('hide');

		}
	}
});

/**
 * Prepare the explainations UI
 */
LiveQ.UI.Explainations = function() {

	// ==========================================
	//  For the pop-up window with explainations
	// ==========================================
	var modal = $('<div class="modal fade"></div>'),
		m_dialog = $('<div class="modal-dialog"></div>'),
		m_content = $('<div class="modal-content"></div>'),
		m_header = $('<div class="modal-header"></div>'),
		m_xbtn = $('<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>'),
		e_title = $('<h4 class="modal-title">Initializing simulation</h4>'),
		e_body = $('<div class="modal-body"></div>'),
		m_footer = $('<div class="modal-footer"></div>'),
		e_morebtn = $('<a href="javascript:;" target="_blank" type="button" class="btn btn-info">Learn More</button>'),
		m_closebtn = $('<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>');

	// Nest elements
	$(document.body).append(modal);
	modal.append(m_dialog);
	m_dialog.append(m_content);
	m_content.append(m_header);
	m_content.append(e_body);
	m_content.append(m_footer);
	m_header.append(m_xbtn);
	m_header.append(e_title);
	m_footer.append(m_closebtn);
	m_footer.append(e_morebtn);

	// Keep references
	this.modal = $(modal).modal({
		'backdrop': true,
		'keyboard': true,
		'show': false
	});
	this.ePopupTitle = e_title;
	this.ePopupBody = e_body;
	this.ePopupMoreBtn = e_morebtn;

	// =======================================
	//  For the modal, overview explainations
	// =======================================
	var explainPanel = $('<div class="panel panel-default">'),
		m_epHeader = $('<div class="panel-heading"></div>'),
		e_explainBody = $('<div class="panel-body"></div>'),
		e_explainFooter = $('<div class="panel-footer"></div>'),
		e_explainHeader = $('<h3 class="panel-title">Panel title</h3>')
		e_backdrop = $('<div></div>');

	// Style panel
	$(explainPanel).css({
		'position': 'absolute'
	});

	// Nest elements
	e_backdrop.append(explainPanel);
	explainPanel.append(m_epHeader);
	explainPanel.append(e_explainBody);
	m_epHeader.append(e_explainHeader);

	// Prepare the backdrop
	$(e_backdrop).css({
		'z-index': 200000,
		'position': 'absolute',
		'left': 0,
		'top': 0,
		'right': 0,
		'bottom': 0,
		'background': 'rgba(0,0,0,0.7)'
	}).hide();
	$(document.body).append(e_backdrop);

	// Parameters for the overview explainations
	this.focusedElement = null;
	this.eExplainPanel = explainPanel;
	this.eExplainTitle = e_explainHeader;
	this.eExplainBody = e_explainBody;
	this.eExplainBackdrop = e_backdrop;

};

/**
 * Display a modal
 */
LiveQ.UI.Explainations.prototype.showPopup = function(title, bodyURL, moreURL) {
	var self = this;
	this.modal.modal('show');
	this.ePopupTitle.html(title);
	this.ePopupBody.load(bodyURL, function() {
		// Activate tabs
		self.eBody.children(".nav-tabs").tab();
	});
	if (moreURL) {
		this.ePopupMoreBtn.show();
		this.ePopupMoreBtn.attr('href', moreURL);
	} else {
		this.ePopupMoreBtn.hide();
	}
}

/**
 * Hide the modal
 */
LiveQ.UI.Explainations.prototype.hidePopup = function() {
	this.modal.modal('hide');
}

/**
 * Explain something with a video sequence
 */
LiveQ.UI.Explainations.prototype.showVideoExplaination = function( videoSource, timeline ) {

	console.log("Starting video presentation from ", videoSource, " using timeline ", timeline);

	// Prepare explaination panel for the video
	this.eExplainBody.empty();
	var videoHost = $('<div id="misc-presentation-video"></div>').css({
		'width': 360,
		'height': 300
	});
	this.eExplainBody.append(videoHost);

	// Load video & initialize popcorn
	this.eExplainPopcorn = Popcorn.youtube(
       "#misc-presentation-video", videoSource
   	);

	// Bind timeline events to the popcorn
	for (var i=0; i<timeline.length; i++) {
		var entry = timeline[i];

		// Find where the current frame ends
		var frameEnd = entry.at+10;
		if (i<timeline.length-1) frameEnd=timeline[i+1].at;

		// Check what to do
		if (entry['focus'] !== undefined) {

			// Focus to the given element
			this.eExplainPopcorn.maskedFocus({

				// Required
				'start': entry.at,
				'end': frameEnd,
				'focus': entry.focus,

				// Optional
				'title': entry['title'],
				'text': entry['text'],
				'placement': entry['placement']

			});

		}

	}

	// Show backdrop
	this.eExplainBackdrop.fadeIn();

	// Re-align explaination
	this.realignExplaination();

	// Start the video
	var self = this;
	setTimeout(function() {
		self.eExplainPopcorn.play();
	}, 1000);

}

/**
 * Update the position of the floating explaination panel
 */
LiveQ.UI.Explainations.prototype.realignExplaination = function() {
	var w = this.eExplainPanel.width(), h = this.eExplainPanel.height(), x, y;

	// Pick the appropriate position for the explaination window
	if (!this.focusedElement) {

		// Nothing visible->center it
		x = (window.innerWidth - w)/2;
		y = (window.innerHeight - h)/2;

	} else {

	}

	// Animate the window to that location
	this.eExplainPanel.animate({
		'left': x, 'top': y
	});

}

/**
 * Show the backdrop and focus element
 */
LiveQ.UI.Explainations.prototype.focusToElement = function( element, text ) {

	// Put element above the backdrop
	if (this.focusedElement) {
		this.focusedElement.css({
			'z-index': 'auto',
			'position': 'auto'
		});
	}
	this.focusedElement = $(element).css({
		'z-index': 200001,
		'position': 'relative'
	});

}

/**
 * Complete explainations
 */
LiveQ.UI.Explainations.prototype.unfocusElement = function() {

	// Reset element position and hide backdrop
	if (this.focusedElement) {
		this.focusedElement.css({
			'z-index': 'auto',
			'position': 'auto'
		});
	}

}

/**
 * On page load, initialize explainations
 */
$(function() {
	LiveQ.UI.explainations = new LiveQ.UI.Explainations();
})