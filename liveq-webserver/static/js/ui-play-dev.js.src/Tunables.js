
/**
 *
 */
LiveQ.Play.Tunable = function( host ) {

	this.host = $('<div id="tunables"></div>');
	$(host).append(this.host);

	// Make the expanded tunables grid
	this.tunablesGrid = $('<ul class="tunables-grid"></ul>');
	this.host.append(this.tunablesGrid);
	this.host.append($('<div class="clearfix"></div>'));

	// Add a grid placeholder
	this.tunablesGridEmptyPlaceholder = $('<li class="label-placeholder">Click a tunable tile from below to start!</li>');
	this.tunablesGrid.append(this.tunablesGridEmptyPlaceholder);

	// Separator
	this.tunablesSeparator = $('<div class="tunables-separator gradient grad-separator"></div>');
	this.host.append(this.tunablesSeparator);

	// Make the tunables group
	this.tunables = $('<div class="tunables-tiles"></div>');
	this.host.append(this.tunables);
	this.host.append($('<div class="clearfix"></div>'));

	// Add a tunables placeholder
	this.tunablesEmptyPlaceholder = $('<div class="label-placeholder">( No more tunables )</div>');
	this.tunables.append(this.tunablesEmptyPlaceholder);

	this.parameters = [];
}


/**
 * Get all values as a dictionary
 */
LiveQ.Play.Tunable.prototype.getValues = function() {

	// Compile all values
	var ans = {};
	for (var i=0; i<this.parameters.length; i++) {
		ans[this.parameters[i].name] = this.parameters[i].value;
	}

	// Return dictionary
	return ans;

}

/**
 *
 */
LiveQ.Play.Tunable.prototype.add = function( config ) {

	// Create tunables entry
	var e = new LiveQ.Play.TunableEntry(this, config);
	this.parameters.push(e);

	// Append entry on the tunables
	this.tunables.append(e.element);

	// Make sure tunables empty placeholder
	this.tunablesEmptyPlaceholder.hide();

}

/**
 * Expand an entry with a nice animation towards the grid
 */
LiveQ.Play.Tunable.prototype.expand = function( entry, animate ) {
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
				"float": "",
				"-webkit-transform": "",
				"-moz-transform": "",
				"-ms-transform": "",
				"-o-transform": "",
				"transform": ""
			});

			// Update sortables
			self.tunablesGrid.sortable({
				'handle': '.btn-reorder',
				'items': '> li.sortable-li',
				start: function(event, ui) {
					ui.item.children().first().addClass("dragging");
					self.tunables.addClass("dim");
				},
				stop: function(event, ui) {
					ui.item.children().first().removeClass("dragging");
					self.tunables.removeClass("dim");
				}
			});

		},

		stage_3 = function() {

			var dstPos = targetHost.position();

			// Move element to target destination
			entry.element.animate({
				"left": dstPos.left,
				"top": dstPos.top+4
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
			var srcPos = entry.element.position(),
				dstPos = targetHost.position(),

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

			// Collapse placeholder using CSS transitions
			setTimeout(function() {
				placeholder.addClass("hidden");
				setTimeout(function() {
					placeholder.remove();
				}, 250);
			}, 500);

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

			targetHost = $('<li class="sortable-li"></li>');
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

			// After the element has reached the final dimentions,
			// it will call stage_2

		};

	// Hide tunables grid empty placeholder
	this.tunablesGridEmptyPlaceholder.hide();

	// Check if we want to use animations
	if ((animate == undefined) || animate) {

		// Start staged animation with stage 1
		stage_1();

	} else {

		// Otherwise, immediate switch
		targetHost = $('<li></li>');
		targetHost.append( entry.element );
		self.tunablesGrid.append(targetHost);

		// Add class
		entry.element.addClass("expanded");

	}

	// Make sure the tunablesGrid has the with-elements class
	if (self.tunables.children(".tunable").length <= 1) {
		setTimeout(function() {
			self.tunablesEmptyPlaceholder.fadeIn();
		}, 250);
	} else {
		this.tunablesEmptyPlaceholder.hide();
	}

}

/**
 * Collapse an element back to the list
 */
LiveQ.Play.Tunable.prototype.collapse = function( entry, animate ) {
	var self = this;

	// Hude tunables gid empty placeholder
	this.tunablesEmptyPlaceholder.hide();

	// Check if we want to use animations
	if ((animate == undefined) || animate) {

		// Hide
		entry.element.fadeOut(250, function() {

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

				// Check if we should show the grid placeholder
				if (self.tunablesGrid.find(".tunable").length  == 0) {
					self.tunablesGridEmptyPlaceholder.fadeIn();
				}

			})

			// Put back to list
			self.tunables.append(entry.element);

			// Fade-in
			entry.element.css({
				"position": "",
				"display": ""
			});
			entry.element.hide();
			entry.element.fadeIn(250);


		});

	} else {

		// Otherwise immediate switch
		var host = entry.element.parent();
		self.tunables.append(entry.element);
		host.remove();

		// Remove class
		entry.element.removeClass("expanded");

		// Check if we should show the grid placeholder
		if (self.tunablesGrid.find(".tunable").length <= 1) {
			this.tunablesGridEmptyPlaceholder.fadeIn();
		}

	}

}

/**
 * An entry in the tunables table
 */
LiveQ.Play.TunableEntry = function( parent, config ){
	var self = this;

	// Setup configuration
	this.name = config.name || "";
	this.dec = config.dec || 3;
	this.min = config.min || 0.0;
	this.max = config.max || 1.0;
	this.def = config.def || this.min;
	this.value = config.value || this.min;
	this.short = config.short || "";
	this.title = config.title || "";
	this.type = config.type || "slider";
	this.tut = config.tut || "";
	this.url = config.url || "";
	this.desc = config.desc || "";

	// Keep parent reference
	this.parent = parent;

	// Prepare elements
	this.element = $('<div class="tunable"></div>');
	this.hInput = $('<input type="text"></div>');
	this.hCircleTrim = $('<div class="circle-trim"></div>');
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

	var spinnerMouseDown = false;
	this.hBtnPlus.mousedown(function(e) {
		e.stopPropagation();
		self.spinner.start(1);
		spinnerMouseDown = true;
	});
	this.hBtnMinus.mousedown(function(e) {
		e.stopPropagation();
		self.spinner.start(-1);
		spinnerMouseDown = true;
	});
	$(window).mouseup(function(e) {
		if (spinnerMouseDown) {
			e.stopPropagation();
			self.spinner.stop();
			spinnerMouseDown=false;
			$(self.parent).trigger("change");
		}
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
			return Number(v/self.mul).toFixed(self.dec);
		},

		// Parse text field
		'parse': function(v) {
			if (typeof(v) == 'string') { // From text field
				return parseFloat(v)*self.mul;
			} else { // Internal
				return v;
			}
		},

		// Apply the value change
		'release': function(v) {
			if (self.changeLock) return;
			self.set(v/self.mul);

			// Trigger change
			$(self.parent).trigger("change");

		}

	}).addClass("knob");


	// Setup tooltip
	this.toolTip = this.element.tooltip({
		'title' 	: this.title,
		'trigger'	: 'manual',
		'placement' : 'bottom',
		'html' 		: true
	});

	this.element.mouseover(function() {
		if (!self.element.hasClass("expanded"))
			self.toolTip.tooltip('show');
	});
	this.element.mouseout(function() {
		self.toolTip.tooltip('hide');
	});


	// Initialize initial value
	this.set( this.value );

	// Setup expand
	this.element.click(function() {
		if (!self.element.hasClass("expanded")) {
			self.parent.expand(self);
		}
	});

	// Setup collapse
	this.hBtnCollapse.click(function(e) {
		e.stopPropagation();
		self.parent.collapse(self);
	});

}

/**
 * Update value
 */
LiveQ.Play.TunableEntry.prototype.set = function( value ) {

	// Update local attribs
	this.value = value;
	this.spinner.value = value;

	// Update UI
	this.changeLock = true;
	this.hInput.val(value).trigger('change');
	this.hLabelValue.html( Number(value).toFixed(this.dec) );
	this.changeLock = false;

}
