
/**
 * Separate with commas the thousands
 */
function commaThousands(x) {
	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Simulation window is where the simulation status comes
 */
LiveQ.Play.RunWindow = function(host) {
	this.host = $(host);
	window.run = this;

	// Get control over elements
	this.eStatusMessage = this.host.find("#run-d-status");
	this.blinking = false;

	// Setup local parameters
	this.eventMax = 0;
	this.eventRate = 0;
	this.eventCurrent = 0;
	this.agentsCount = 0;
	this.eventRateRingbuffer = [ ];
	this.agentsNames = [];

	// Setup progress gauge
	this.eProgressKnob = this.host.find("#run-d-gauge > input");
	this.eProgressKnob.knob({

		'width' 		: 175,
		'height' 		: 175,
		'readOnly' 		: true,
		'angleOffset'	: -150,
		'angleArc'		: 300,
		'min' 			: 0,
		'max' 			: 100,
		'value' 		: 0,
		'skin'			: 'tron',
		'fgColor'		: '#CC9900',
		'bgColor'		: '#FFCC66',

		// Format the number
		'format' : function(v) {
			return v + "%";
		}

	});
	this.eProgressKnob.val(0).trigger('change');

	// Get access to fields
	this.eValEvents = this.host.find('#run-d-events');
	this.eValRate = this.host.find('#run-d-rate');
	this.eValWorkers = this.host.find('#run-d-workers');
	this.eValFit = this.host.find('#run-d-fit');

	// Start blink timer
	var self = this;
	setInterval(function() {
		if (self.blinking)
			self.eStatusMessage.toggleClass("blank");
	}, 500);

	// Rate update interval
	setInterval(function() {
		
		// Add entry in the ring buffer
		self.eventRateRingbuffer.push( self.eventRate );

		// Check for overflow
		if (self.eventRateRingbuffer.length > 10)
			self.eventRateRingbuffer.shift();

		// Calculate average
		var avg = 0;
		for (var i=0; i<self.eventRateRingbuffer.length; i++) {
			avg += self.eventRateRingbuffer[i];
		}
		avg /= self.eventRateRingbuffer.length;

		// Update
		self.eValRate.text( commaThousands(parseInt(avg)) );

	}, 1000);

	// Reset status
	this.setStatus(0);

}

/**
 * Recalculate event rate
 */
LiveQ.Play.RunWindow.prototype.recalcRate = function() {

}

/**
 * Set config
 */
LiveQ.Play.RunWindow.prototype.setConfig = function( config ) {

	this.eventMax = config.maxEvents || 1600000;

}

/**
 * Reset run
 */
LiveQ.Play.RunWindow.prototype.reset = function() {

	this.eventRate = 0;
	this.eventCurrent = 0;
	this.agentsCount = 0;
	this.eventRateRingbuffer = [];

	this.eValEvents.text("-");
	this.eValRate.text("-");
	this.eValWorkers.text("-");
	this.eValFit.text("-");

	this.eProgressKnob.val(0).trigger('change');

}

/**
 * Set status
 */
LiveQ.Play.RunWindow.prototype.setStatus = function(flags) {

	this.eStatusMessage.removeClass("s-run");
	this.eStatusMessage.removeClass("s-pend");
	this.eStatusMessage.removeClass("s-error");
	
	// Change status depending on flag
	if (flags == 0) {
		this.eStatusMessage.html("IDLE");
		this.eStatusMessage.removeClass("blank");
		this.blinking = false;
	} else if (flags == 1) {
		this.eStatusMessage.html("INITIALIZING COLLIDER");
		this.eStatusMessage.addClass("s-pend");
		this.blinking = true;
	} else if (flags == 2) {
		this.eStatusMessage.html("RUNNING");
		this.eStatusMessage.addClass("s-run");
		this.blinking = true;
	} else {
		this.eStatusMessage.html("ERROR");
		this.eStatusMessage.addClass("s-error");
		this.eStatusMessage.removeClass("blank");
		this.blinking = false;
	}

}

/**
 * Update the UI components
 */
LiveQ.Play.RunWindow.prototype.updateFit = function( fitValue ) {

	// Update events field
	this.eValFit.text( Number(fitValue).toFixed(2) );

	// Update class
	this.eValFit.removeClass("f1");
	this.eValFit.removeClass("f2");
	this.eValFit.removeClass("f3");
	this.eValFit.removeClass("f4");
	if (fitValue < 1.00) {
		this.eValFit.addClass("f1");
	} else if (fitValue < 2.00) {
		this.eValFit.addClass("f2");
	} else if (fitValue < 4.00) {
		this.eValFit.addClass("f3");
	} else {
		this.eValFit.addClass("f4");
	}

}

/**
 * Add an agent in the counter
 */
LiveQ.Play.RunWindow.prototype.addAgent = function(name) {
	this.agentsCount += 1;
	this.agentsNames.push(name);

	this.eValWorkers.text( this.agentsCount );
}

/**
 * Remove an agent from the counter
 */
LiveQ.Play.RunWindow.prototype.removeAgent = function(name) {
	this.agentsCount -= 1;
	var i = this.agentsNames.indexOf(name);
	if (i>=0) this.agentsNames.splice(i,1);

	this.eValWorkers.text( this.agentsCount );
}

/**
 * Update number of events
 */
LiveQ.Play.RunWindow.prototype.updateEvents = function( nevts ) {

	// Calculate event diff
	if (nevts > this.eventCurrent) {

		// Update events field
		this.eValEvents.text(nevts);

		// Calculate event rate
		var eventRate = nevts - this.eventCurrent;

		// Update number of events
		this.eventCurrent = nevts;

	}

	// Calculate progress
	var progress = parseInt( nevts * 100 / this.eventMax );

	// Calculate progress
	this.eProgressKnob.val(progress).trigger('change');

	// Update events fields

}
