/**
 * Controlling class for the observables pane
 *
 * This class requires the liveq-ui.css class and is tightly bound
 * to the values of it. If you change anything there you must change
 * the css definition for the class here.
 *
 * @param {string} host - The selector class for the element to use as host 
 * 
 */
LiveQ.UI.Observables = function( host ) {
  this.host = $(host);
  this.observables = { };

  // Parameters that must be synchronized with CSS
  this.css = {
    'observ-sm': 64,
    'observ-xl': 256,
    'observ-pad': 10,
    'observ-sep': 10,
    'animation-ms': 200
  };

}

/**
 * Create description element
 */
LiveQ.UI.Observables.prototype.createDescription = function( config ) {
	var elm = $(
		'<div class="observ-desc small-body"><h1>'+config.ref.title+'</h1>'+
		config.ref.shortdesc+'</div>');
	return elm;
}


/**
 * Create status element
 */
LiveQ.UI.Observables.prototype.createStatus = function( config ) {
	var elm = $('<div class="observ-status"></div>'),
		eStatus = $('<div class="status"></div>'),
		eDetail = $('<div class="detail"></div>');

	elm.append(eStatus);
	elm.append(eDetail);

	return elm;
}


/**
 * Toggle histogram visibility
 */
LiveQ.UI.Observables.prototype.toggle = function( element, config ) {

	if (element.hasClass("expand")) {

	} else {

	}

	$(element).toggleClass("expand");
	$(element).toggleClass("full");

}

/**
 * Update the status of the parameter
 */
LiveQ.UI.Observables.prototype.updateStatus = function( config ) {
	// Calculate Chi2 and Chi2 Error
	var chi2 = LiveQ.Calculate.chi2WithError( config.data, config.ref.reference );
	if (!chi2[0]) chi2[0] = 0;
	if (!chi2[1]) chi2[1] = 0;

	// Check if the error is trusted (less than 10%)
	var trusted = ((chi2[1] / chi2[0]) < 0.1),
		fitClass = "", fitStr = "Low Statistics";

	// Remove all possible fit classes from the plot
	for (var i=0; i<4; i++) { config.element.removeClass("fit-"+i); }

	// Check what fit class we are on
	if (trusted) {
		if (chi2[0] < 0.5 ) { // Excellent fit
			config.element.addClass("fit-0");
			fitStr = "Perfect";
		} else if (chi2[0] < 1.0 ) { // Good fit
			config.element.addClass("fit-1");
			fitStr = "Good";
		} else if (chi2[0] < 4.0 ) { // Fair fit
			config.element.addClass("fit-2");
			fitStr = "Fair";
		} else { // Bad fit
			config.element.addClass("fit-3");
			fitStr = "Bad";
		}
	}

	// Update status fields
	config.element.find("div.detail").html( 
		"<div><strong>Events:</strong> " + config.data.nevts + "</div>" +
		"<div><strong>Error:</strong> " + chi2[0].toFixed(4) + " &plusmn; " + chi2[1].toFixed(2) + "</div>"
	);
	config.element.find("div.status").html( "[ <strong>" + fitStr + "</strong> ]" );

}

/**
 * Add a new tunable in the collection
 */
LiveQ.UI.Observables.prototype.add = function( histoData, histoReference ) {

	// Prepare element
	var self = this,
		elm = $('<div class="observable fit-0"></div>'),
		hName = $('<h4>'+histoReference.short+'</h4>'),
		hValue = $('<div class="value">0.00</div>'),
		plotElm = $('<div class="plot"></div>');

	// Nest elements
	elm.append(hName);
	elm.append(hValue);
	elm.append(plotElm);

	// Create a new plot and store it in the histogram object
	var plot = new LiveQ.UI.PlotWindow(plotElm[0], {
		'width': this.css['observ-xl'] - 2*this.css['observ-pad'],
		'height': this.css['observ-xl'] - 2*this.css['observ-pad'],
		'imgTitle': histoReference.imgTitle,
		'imgXLabel': histoReference.imgXLabel,
		'imgYLabel': histoReference.imgYLabel
	});

	// Plat histogram & Reference data
	plot.addHistogram( histoReference.reference, "Reference data" )
	plot.addHistogram( histoData, histoReference.name );

	// Prepare config object for this observable and store it
	var config = {
		'element': elm,
		'plot': plot,
		'data': histoData,
		'ref': histoReference
	};
	this.observables[ histoData.id ] = config;

	// Create complex sub-elements
	var cxDescription = this.createDescription(config),
		cxDetails = this.createStatus(config);

	// Nest sub-elements
	elm.append(cxDescription);
	elm.append(cxDetails);

	// Register a callback when histogram updates
	histoData.onUpdate(function() {
		self.updateStatus(config);
	});

	// Bind events
	elm.click(function() {
		self.toggle(elm, config);
	});

	// Append element on host
	this.host.append(elm);

	// Initialize first status update
	self.updateStatus(config);

}