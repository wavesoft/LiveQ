
/**
 * Prepare the explainations UI
 */
LiveQ.UI.Explainations = function() {

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
	this.eTitle = e_title;
	this.eBody = e_body;
	this.eMoreBtn = e_morebtn;

	// Local parameters
	this.visible = false;

};

/**
 * Display a modal
 */
LiveQ.UI.Explainations.prototype.show = function(title, bodyURL, moreURL) {
	this.modal.modal('show');
	this.eTitle.html(title);
	this.eBody.load(bodyURL);
	if (moreURL) {
		this.eMoreBtn.show();
		this.eMoreBtn.attr('href', moreURL);
	} else {
		this.eMoreBtn.hide();
	}
}

/**
 * Hide the modal
 */
LiveQ.UI.Explainations.prototype.hide = function() {
	this.modal.modal('hide');
}

/**
 * On page load, initialize explainations
 */
$(function() {
	LiveQ.UI.explainations = new LiveQ.UI.Explainations();
})