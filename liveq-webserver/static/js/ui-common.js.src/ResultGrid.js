
/**
 * A grid where the results are layed out
 */
LiveQ.UI.ResultGrid = function(host) {
	var self = this;

	// Prepare variables
	this.host = $(host);
	this.entries = [ ];

	// Prepare elements
	this.host.addClass("resultgrid")
	this.eHeader = $('<div class="resultgrid-header"></div>');
	this.eBody =   $('<div class="resultgrid-body"></div>');
	this.eFooter = $('<div class="resultgrid-footer"></div>');

	// Nest elements
	this.host.append(this.eHeader);
	this.host.append(this.eBody);
	this.host.append(this.eFooter);

	// Prepare footer
	var footerGradient = $('<div class="gradient grad-color-range"></div>'),
		footerLegend = $('<div class="legend"><div class="good">Perfect</div><div class="bad">Bad</div></div>');
	this.eFooter.append(footerGradient);
	this.eFooter.append(footerLegend);

	// Prepare buttons
	this.btnGroupSort = $('<div class="btn-group pull-right"></div>');
	this.btnSortNameAsc = $('<button type="button" class="btn btn-default btn-sm"><span class="glyphicon glyphicon-sort-by-alphabet"></span></button>');
	this.btnSortNameAsc.click(function() { self.sort(0); });
	this.btnSortNameDesc = $('<button type="button" class="btn btn-default btn-sm"><span class="glyphicon glyphicon-sort-by-alphabet-alt"></span></button>');
	this.btnSortNameDesc.click(function() { self.sort(1); });
	this.btnSortRankAsc = $('<button type="button" class="btn btn-default btn-sm"><span class="glyphicon glyphicon-sort-by-attributes"></span></button>');
	this.btnSortRankAsc.click(function() { self.sort(2); });
	this.btnSortRankDesc = $('<button type="button" class="btn btn-default btn-sm"><span class="glyphicon glyphicon-sort-by-attributes-alt"></span></button>');
	this.btnSortRankDesc.click(function() { self.sort(3); });

	/*
	this.btnSortNameAsc.tooltip({
		'placement': 'left',
		'title': 'Sort alphabetically, ascending'
	});
	this.btnSortNameDesc.tooltip({
		'placement': 'left',
		'title': 'Sort alphabetically, descending'
	});
	this.btnSortRankAsc.tooltip({
		'placement': 'left',
		'title': 'Sort by goodness of fit, ascending'
	});
	this.btnSortRankDesc.tooltip({
		'placement': 'left',
		'title': 'Sort by goodness of fit, descending'
	});
	*/

	// Nest buttons
	this.btnGroupSort.append(this.btnSortNameAsc);
	this.btnGroupSort.append(this.btnSortNameDesc);
	this.btnGroupSort.append(this.btnSortRankAsc);
	this.btnGroupSort.append(this.btnSortRankDesc);
	this.eHeader.append(this.btnGroupSort);

	// Prepare flash banner
	this.flashTimer = 0;
	this.eFlashBanner = $('<span class="flash-banner"></span>');
	this.eFlashBanner.hide();
	this.eHeader.append(this.eFlashBanner);

	// Prepare background for the grid body
	this.eGridBack = $('<div class="resultgrid-body-back"></div>');
	this.eBody.append(this.eGridBack);

	// Initial sort
	this.sort(0);

	// Bind on DOM window resizes
	$(window).resize(function() {
		self.resize();
	});

	// Sample data
	/*
	for (var i=0; i<20; i++) {
		this.add({
			'short': String.fromCharCode(65+i),
			'value': Math.random()
		});
	}
	*/

}

/**
 * Show flash banner
 */
LiveQ.UI.ResultGrid.prototype.flash = function( text, color ) {
	var self = this;

	// Update text
	this.eFlashBanner.html(text);
	if (color) this.eFlashBanner.css({ 'color': color });

	// Show immediately and fade out after a while
	this.eFlashBanner.show();
	clearTimeout(this.flashTimer);
	this.flashTimer = setTimeout(function() {
		self.eFlashBanner.fadeOut();
	}, 500);

}

/**
 * Sort according to the given index
 */
LiveQ.UI.ResultGrid.prototype.sort = function( index ) {

	// Update button state
	var btnClass = "btn-info";
	if (index == 0) {
		this.btnGroupSort.children().removeClass(btnClass);
		this.btnSortNameAsc.addClass(btnClass);
	} else if (index == 1) {
		this.btnGroupSort.children().removeClass(btnClass);
		this.btnSortNameDesc.addClass(btnClass);
	} else if (index == 2) {
		this.btnGroupSort.children().removeClass(btnClass);
		this.btnSortRankAsc.addClass(btnClass);
	} else if (index == 3) {
		this.btnGroupSort.children().removeClass(btnClass);
		this.btnSortRankDesc.addClass(btnClass);
	}

	// Change the sort index
	this.sortIndex = index;

	// Resort
	this.applySort();

}

/**
 *  Add an entry in the ResultGrid 
 */
LiveQ.UI.ResultGrid.prototype.add = function( histogram, reference ) {

	// Create new entry
	var e = new LiveQ.UI.ResultGridEntry(this, histogram, reference);
	this.entries.push(e);

	// Resort
	this.applySort();

	// Return new element
	return e;

}


/**
 * Apply the sort function 
 */
LiveQ.UI.ResultGrid.prototype.applySort = function() {

	// Apply sort
	var self = this;
	this.entries.sort(function(a, b) {
		if (self.sortIndex == 0) {
			return a.reference.short.localeCompare(b.reference.short);
		} else if (self.sortIndex == 1) {
			return b.reference.short.localeCompare(a.reference.short);
		} else if (self.sortIndex == 2) {
			return a.chi2()[0] - b.chi2()[0];
		} else if (self.sortIndex == 3) {
			return b.chi2()[0] - a.chi2()[0];
		}
	});

	// Put rows back in order
	this.eBody.children(".resultgrid-row").remove();
	for (var i=0; i<this.entries.length; i++) {
		this.eBody.append(this.entries[i].row);
		this.entries[i].rebindEvents();
	}

}

/**
 * Mapping function that takes a value in sigma and returns the coordinates
 */
LiveQ.UI.ResultGrid.prototype.mapValue = function(v, width) {

	var keyPoints = [
			0.10,	// 1σ @ 10%
			0.30,	// 2σ @ 30%
			0.50,	// 3σ @ 50%
			1.00	// 4σ @ 100%;
		],
		keyChi = [
			Math.log(4), // 2σ
			Math.log(9), // 3σ
			Math.log(16) // 4σ
		];

	if (v < 1) {

		// Linear interpolation between 0% and 10%
		console.log("[IPOL] v=", v);
		return v * (width * keyPoints[0]);

	} else {

		// Get log
		var lv = Math.log(v);
		if (lv < keyChi[0]) {
			
			// Logarithmic interpolation between 10% to 20%
			console.log("[IPOL] lv=", lv, ", p=", (lv/keyChi[0]));
			return  (lv/keyChi[0]) * (width * (keyPoints[1] - keyPoints[0])) + width*keyPoints[0];


		} else if (lv < keyChi[1]) {

			// Logarithmic interpolation between 20% to 50%
			console.log("[IPOL] lv=", lv, ", p=", ((lv-keyChi[0])/(keyChi[1]-keyChi[0])));
			return  ((lv-keyChi[0])/(keyChi[1]-keyChi[0])) * (width * (keyPoints[2] - keyPoints[1])) + width*keyPoints[1];

		} else {

			// Logarithmic interpolation between 50% to 100%
			console.log("[IPOL] lv=", lv, ", p=", ((lv-keyChi[1])/(keyChi[2]-keyChi[1])));
			return  ((lv-keyChi[1])/(keyChi[2]-keyChi[1])) * (width * (keyPoints[3] - keyPoints[2])) + width*keyPoints[2];

		}

	}

	return v * width;
}

/**
 * Mapping function that takes a value in sigma and returns the color class
 */
LiveQ.UI.ResultGrid.prototype.mapColorClass = function(v) {

	// Key Chi2 Values
	var keyChi = [
			Math.log(4), // 2σ
			Math.log(9), // 3σ
			Math.log(16) // 4σ
		];

	// Map color according to Chi-Squared values
	if (v <= 1) {
		return "f1";
	} else if (v <= keyChi[0]) {
		return "f2";
	} else if (v <= keyChi[1]) {
		return "f3";
	} else {
		return "f4";
	}

}

/**
 * Take snapots on all entries
 */
LiveQ.UI.ResultGrid.prototype.snapshotSet = function() {
	for (var i=0; i<this.entries.length; i++) {
		this.entries[i].snapshotSet();
	}
}

/**
 * Clear snapshots from all entries
 */
LiveQ.UI.ResultGrid.prototype.snapshotClear = function() {
	for (var i=0; i<this.entries.length; i++) {
		this.entries[i].snapshotClear();
	}
}

/**
 * Zero-out entries
 */
LiveQ.UI.ResultGrid.prototype.zero = function() {
	for (var i=0; i<this.entries.length; i++) {
		this.entries[i].zero();
	}
}

/**
 * Update all values
 */
LiveQ.UI.ResultGrid.prototype.resize = function() {
	for (var i=0; i<this.entries.length; i++) {
		this.entries[i].update();
	}
}

/**
 * An entry in the resultgrid
 */
LiveQ.UI.ResultGridEntry = function( parent, histogram, reference ) {

	// Prepare parameters
	this.parent = parent;
	this.histogram = histogram;
	this.reference = reference;
	this.minWidth = 2;

	// Setup elements
	this.row = $('<div class="resultgrid-row no-data"></div>');
	this.valueHost = $('<div class="value-host"></div>');
	this.valueOuter = $('<div class="value-outer"></div>');
	this.valueInner = $('<div class="value-inner"></div>');
	this.valueLabel = $('<div class="value-label"></div>');
	this.descLabelHost = $('<div class="description-label-host"></div>');
	this.descLabel = $('<div class="description-label"></div>');

	// For snapshot
	this.valueSnapshot = $('<div class="value-snapshot"></div>');
	this.valueSnapshot.hide();

	// Setup label
	this.valueLabel.html(reference.short);

	// Nest elements
	this.row.append(this.valueHost);
	this.row.append(this.valueLabel);
	this.row.append(this.descLabelHost);
	this.valueHost.append(this.valueOuter);
	this.valueHost.append(this.valueSnapshot);
	this.valueOuter.append(this.valueInner);
	this.descLabelHost.append(this.descLabel);

	// Setup hover descriptions
	this.descLabel.text( reference.title );

	// Bind on histogram updates
	var self = this;
	this.histogram.onUpdate(function() {
		self.update();
	});

}

/**
 * Rebind events (called after destructive UI rebuild)
 */
LiveQ.UI.ResultGridEntry.prototype.rebindEvents = function() {
	var self = this;

	// Click forwards click event
	$(this.row).click(function() {
		$(self.parent).trigger('click', self);
	});

}

/**
 * Calculate sigma with error bars
 */
LiveQ.UI.ResultGridEntry.prototype.chi2 = function() {
	return LiveQ.Calculate.chi2WithError( 
		this.histogram, 
		this.reference.reference
	);
}

/**
 * Update value from the existing histograms
 */
LiveQ.UI.ResultGridEntry.prototype.update = function() {

	// Calculate the chi-squared of histograms
	var chi = this.chi2(),
		value = chi[0],
		errors = chi[0]*(chi[1]/100);

	// Print results
	console.log(chi, value, errors);
	if (this.histogram.interpolated) {
		this.set( value, 10, true );
	} else {
		this.set( value, errors );
	}

	// Resort grid
	this.parent.applySort();

}

/**
 * Zero-out the data set, by turning on the no-data flag
 */
LiveQ.UI.ResultGridEntry.prototype.zero = function() {

	// Remove all known classess
	var classes = [ 'f1', 'f2', 'f3', 'f4' ];
	for (var i=0; i<classes.length; i++) {
		this.row.removeClass(classes[i]);
	}

	// Add no-data class
	this.row.addClass("no-data");

	// Occupy full width
	this.valueOuter.css({
		'left': 0, 'width': '100%'
	});

}

/**
 * Set value
 */
LiveQ.UI.ResultGridEntry.prototype.set = function( value, errors, inPixels ) {

	// Calculate dimentions
	var containerWidth = this.valueHost.width(),
		pos = this.parent.mapValue( value, containerWidth ),
		mwOffset = this.parent.mapValue( value, this.minWidth ),
		posMinus, posPlus;

	// Calculate errors
	if (inPixels === true) {
		posMinus = errors;
		posPlus = errors;
	} else {
		posMinus = this.parent.mapValue( errors, containerWidth );
		posPlus = this.parent.mapValue( errors, containerWidth );
	}


	// Cap edges
	if (pos<0) pos=0;
	if (pos>containerWidth) pos=containerWidth;
	if (pos-mwOffset-posMinus < 0)
		posMinus = pos-mwOffset;
	if (pos-mwOffset+this.minWidth+posPlus > containerWidth)
		posPlus = containerWidth - pos + mwOffset - this.minWidth;

	// Apply element dimentions
	this.valueOuter.css({
		'left': pos - mwOffset - posMinus,
		'width': posMinus + this.minWidth + posPlus
	});
	this.valueInner.css({
		'left': posMinus,
		'width': this.minWidth
	});

	// Pick color class
	var classes = [ 'f1', 'f2', 'f3', 'f4' ],
		cclass = this.parent.mapColorClass( value );
	this.row.removeClass("no-data");
	for (var i=0; i<classes.length; i++) {
		if (classes[i] == cclass) {
			this.row.addClass(classes[i]);
		} else {
			this.row.removeClass(classes[i]);
		}
	}

};

/**
 * Take snapshot and store it to the valueSnapshot elements
 */
LiveQ.UI.ResultGridEntry.prototype.snapshotSet = function() {

	// Get current values
	var oL = this.valueOuter.css("left"),
		oW = this.valueOuter.css("width");

	// Move them to the other
	this.valueSnapshot.css({
		'left': oL, 'width': oW
	});

	// Hide data and show snapshot
	this.valueSnapshot.show();

}

/**
 * Remove valueSnapshot elements
 */
LiveQ.UI.ResultGridEntry.prototype.snapshotClear = function() {
	this.valueSnapshot.hide();
}

