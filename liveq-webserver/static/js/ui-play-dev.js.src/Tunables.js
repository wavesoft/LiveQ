
/**
 *
 */
LiveQ.UI.Tunable = function( host ) {
	this.host = $(host);

	// Make the expanded tunables grid
	this.tunablesGrid = $('<ul class="tunables-grid"></ul>');
	this.host.append(this.tunablesGrid);
	this.host.append($('<div class="clearfix"></div>'));

	// Separator
	this.tunablesSeparator = $('<div class="tunables-separator"></div>');
	this.host.append(this.tunablesSeparator);

	// Make the tunables group
	this.tunables = $('<div class="tunables-tiles"></div>');
	this.host.append(this.tunables);
	this.host.append($('<div class="clearfix"></div>'));

	this.parameters = {};
}

/**
 *
 */
LiveQ.UI.Tunable.prototype.add = function( config ) {

	var e = new LiveQ.UI.TunableEntry(this, config);
	this.tunables.append(e.element);

}

/**
 * Expand an entry with a nice animation towards the grid
 */
LiveQ.UI.Tunable.prototype.expand = function( entry ) {
	var self = this,

		// Shared variables
		targetHost,

		stage_4 = function() {

			// Fix element into position
			targetHost.append(entry.element);
			entry.element.css({
				"position": "",
				"z-index": "",
				"left": "",
				"top": "",
				"-webkit-transform": "",
				"-moz-transform": "",
				"-ms-transform": "",
				"-o-transform": "",
				"transform": ""
			});

			// Update sortables
			self.tunablesGrid.sortable({
				'handle': '.btn-reorder',
				start: function(event, ui) {
					ui.item.children().first().addClass("dragging");
				},
				stop: function(event, ui) {
					ui.item.children().first().removeClass("dragging");
				}
			});

		},

		stage_3 = function() {

			var dstPos = targetHost.offset();

			// Move element to target destination
			entry.element.animate({
				"left": dstPos.left,
				"top": dstPos.top
			}, {
				"easing": 'easeOutQuad',
				"duration": 250,
				"complete": stage_4,
				step: function(n, t) {
					var v = (n - t.start) / (t.end - t.start);
					$(this).css({
						"-webkit-transform": "scale(" + (1.5-v*0.5) + ")",
						"-moz-transform": "scale(" + (1.5-v*0.5) + ")",
						"-ms-transform": "scale(" + (1.5-v*0.5) + ")",
						"-o-transform": "scale(" + (1.5-v*0.5) + ")",
						"transform": "scale(" + (1.5-v*0.5) + ")"
					})
				},
			});

		},

		stage_2 = function() {

			// 2) The
			
			// Calculate source/target position
			var srcPos = entry.element.offset(),
				dstPos = targetHost.offset(),

			// Calculate a midpoint between srcPos and dstPos
				midLeft = (srcPos.left + dstPos.left)/2,
				midTop = (srcPos.top + dstPos.top)/2;

			var placeholder = $('<div class="tunable placeholder"></div>');
			placeholder.insertBefore(entry.element);
			entry.element.css({
				"position": "absolute",
				"left": srcPos.left,
				"top": srcPos.top,
				"z-index": 5000
			});

			// Collapse animation
			placeholder.animate({
				'width': 0
			}, 250, function() {
				placeholder.remove();
			});

			// Move element half-way on the animation
			entry.element.animate({
				"left": midLeft,
				"top": midTop
			}, {
				"easing": 'easeInQuad',
				"duration": 250,
				"complete": stage_3,
				step: function(n, t) {
					var v = (n - t.start) / (t.end - t.start);
					$(this).css({
						"-webkit-transform": "scale(" + (1+v*0.5) + ")",
						"-ms-transform": "scale(" + (1+v*0.5) + ")",
						"-moz-transform": "scale(" + (1+v*0.5) + ")",
						"-o-transform": "scale(" + (1+v*0.5) + ")",
						"transform": "scale(" + (1+v*0.5) + ")"
					})
				},
			});

			// Start transforming to expanded
			entry.element.addClass("expanded");

		},

		stage_1 = function() {

			// 1) Add the placeholder on the list (this is going to receive)
			//    the element after the animation 

			targetHost = $('<li></li>');
			self.tunablesGrid.append(targetHost);

			// ... and animate it to it's final dimentions
			var targetW = $(targetHost).width(), targetH = $(targetHost).height();
			targetHost.css({
				'width': 0,
				'height': 0
			});
			targetHost.animate({
				'width': targetW,
				'height': targetH
			}, 250, stage_2);

			// Make sure the tunablesGrid has the with-elements class
			if (!self.tunablesSeparator.hasClass("visible"))
				self.tunablesSeparator.addClass("visible");

			// After the element has reached the final dimentions,
			// it will call stage_2

		};

	// Start staged animation with stage 1
	stage_1();

}

/**
 * Collapse an element back to the list
 */
LiveQ.UI.Tunable.prototype.collapse = function( entry ) {
	var self = this;

	// Hide
	entry.element.fadeOut(function() {

		// Remove expanded class
		entry.element.removeClass("expanded");

		// Remove placeholder
		var placeholder = entry.element.parent();
		placeholder.animate({
			"width": 0,
			"height": 0
		}, function() {
			// Remove placeholder
			placeholder.remove();
		})

		// Put back to list
		self.tunables.append(entry.element);

		// Fade-in
		entry.element.css({
			"position": "",
			"display": ""
		});
		entry.element.hide();
		entry.element.fadeIn();

		// Check if we should hide separator
		if (self.tunablesGrid.children().length <= 1) {
			self.tunablesSeparator.removeClass("visible");
		}

	});

}

/**
 * An entry in the tunables table
 */
LiveQ.UI.TunableEntry = function( parent, config ){
	var self = this;

	// Setup configuration
	this.dec = config.dec || 3;
	this.min = config.min || 0.0;
	this.max = config.max || 1.0;
	this.value = config.value || this.min;
	this.short = config.short || "";
	this.title = config.title || "";

	// Keep parent reference
	this.parent = parent;

	// Prepare elements
	this.element = $('<div class="tunable"></div>');
	this.hInput = $('<input type="text"></div>');
	this.hCircleTrim = $('<div class="circle-trim questionable-back"></div>');
	this.hLabelIconic = $('<div class="label-iconic"></div>');
	this.hLabelValue = $('<div class="label-value"></div>');
	this.hBtnPlus = $('<div class="btn-plus"><span class="glyphicon glyphicon-plus"></span></div>');
	this.hBtnMinus = $('<div class="btn-minus"><span class="glyphicon glyphicon-minus"></span></div>');
	this.hBtnCollapse = $('<div class="btn-collapse"><span class="glyphicon glyphicon-remove"></div>')
	this.hBtnReorder = $('<div class="btn-reorder"><span class="glyphicon glyphicon-move"></span></div>')
	this.hDragLabel = $('<p class="label-drag">Drag me!</p>');

	// Setup elements
	this.hLabelIconic.html( this.short );

	// Nest elements
	this.element.append(this.hBtnPlus);
	this.element.append(this.hBtnMinus);
	this.element.append(this.hCircleTrim);
	this.element.append(this.hInput);
	this.element.append(this.hLabelIconic);
	this.element.append(this.hLabelValue);
	this.element.append(this.hBtnCollapse);
	this.element.append(this.hBtnReorder);
	this.element.append(this.hDragLabel);

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

	// Initialize initial value
	this.set( this.value );

	// Setup expand
	this.element.click(function() {
		if (!self.element.hasClass("expanded")) {
			self.parent.expand(self);
		}
	});

	// Setup collapse
	this.hBtnCollapse.click(function() {
		self.parent.collapse(self);
	});

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
	this.hLabelValue.html( Number(value).toFixed(this.dec) );
	this.changeLock = false;

	// Value changed
	console.log("Set>", value);
}
