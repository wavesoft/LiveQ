
/**
 *
 */
LiveQ.UI.Tunable = function( host ) {
	this.host = $(host);
	this.parameters = {};
}

/**
 * An entry in the tunables table
 */
LiveQ.UI.TunableEntry = function( config ){
	var self = this;

	// Setup configuration
	this.dec = config.dec || 3;
	this.min = config.min || 0.0;
	this.max = config.max || 1.0;
	this.value = config.value || this.min;
	this.short = config.short || "";
	this.title = config.title || "";

	// Prepare elements
	this.element = $('<div class="tunable"></div>');
	this.hInput = $('<input type="text"></div>');
	this.hCircleTrim = $('<div class="circle-trim questionable-back"></div>');
	this.hBtnPlus = $('<div class="btn-plus"><span class="glyphicon glyphicon-plus"></span></div>');
	this.hBtnMinus = $('<div class="btn-minus"><span class="glyphicon glyphicon-minus"></span></div>');
	this.hLabel = $('<div class="label"></div>');

	// Setup elements
	this.hLabel.html( this.short );

	// Nest elements
	this.element.append(this.hBtnPlus);
	this.element.append(this.hBtnMinus);
	this.element.append(this.hCircleTrim);
	this.element.append(this.hInput);
	this.element.append(this.hLabel);

	// Make questionable
	LiveQ.UI.questionable.make( this.element, {
		'title': this.title
	});

	// Setup spinner
	this.spinner = new LiveQ.UI.Spinner( this, function(value) {
		self.set( value );
	});
	this.hBtnPlus.mousedown(function(e) {
		e.stopPropagation();
		self.spinner.start(1);
	});
	this.hBtnPlus.mouseup(function(e) {
		e.stopPropagation();
		self.spinner.stop();
	});
	this.hBtnMinus.mousedown(function(e) {
		e.stopPropagation();
		self.spinner.start(-1);
	});
	this.hBtnMinus.mouseup(function(e) {
		e.stopPropagation();
		self.spinner.stop();
	});

	// Calculate multiplier for the knob
	this.mul = Math.pow(10, this.dec);

	// Setup knob
	this.changeLock = false;
	this.hInput.attr("value", this.value);
	this.hInput.knob({

		'width' 		: 78,
		'height'		: 78,
		'angleOffset'	: -150,
		'angleArc'		: 300,
		'min'			: this.min * this.mul,
		'max'			: this.max * this.mul,

		// Format the number
		'format' : function(v) {
			console.warn("format>", v);
			return Number(v/self.mul).toFixed(self.dec);
		},

		// Parse text field
		'parse': function(v) {
			console.warn("parse>", v);
			if (typeof(v) == 'string') { // From text field
				return parseFloat(v)*self.mul;
			} else { // Internal
				return v;
			}
		},

		// Apply the value change
		'release': function(v) {
			if (self.changeLock) return;
			console.warn("release>", v);
			self.set(v/self.mul);
		}

	}).addClass("knob");

}

/**
 * Update value
 */
LiveQ.UI.TunableEntry.prototype.set = function( value ) {

	// Update local attribs
	this.value = value;
	this.spinner.value = value;

	// Update UI
	this.changeLock = true;
	this.hInput.val(value).trigger('change');
	this.changeLock = false;

	// Value changed
	console.log("Set>", value);
}


/**
 *
 */
LiveQ.UI.Tunable.prototype.add = function( config ) {

	var e = new LiveQ.UI.TunableEntry(config);
	this.host.prepend(e.element);

}