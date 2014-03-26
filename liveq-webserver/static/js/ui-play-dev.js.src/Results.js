
LiveQ.Play.Results = function( host ) {
	var self = this;
	this.host = $(host);

	// Create the expanded grid
	this.elmObservableGrid = $('<ul class="results-grid"></ul>');
	this.elmObservableGridPlaceholder = $('<li class="label-placeholder">Click on a tunable from the list below for more information.</li>')
	this.host.append(this.elmObservableGrid);
	this.elmObservableGrid.append(this.elmObservableGridPlaceholder);

	// Create the results list
	this.elmObservableList = $('<div class="results-list"></div>');
	this.observableList = new LiveQ.UI.ResultGrid(this.elmObservableList);
	this.host.append(this.elmObservableList);

	// Create the results list
	this.elmObservableFooter = $('<div class="results-footer"></div>');
	this.host.append(this.elmObservableFooter);

	// Prepare gauges
	var legend = $('<div class="legend-icon sketch"></div><span>Your planned data</span>');
	this.elmObservableFooter.append(legend);

	// Handle clicks on the observables list
	$(this.observableList).on('click', function(e, histo) {
		LiveQ.Play.showHistogramDetails( histo.histogram, histo.reference );
	});

	// The histograms added in the list
	this.results = [];

}

/**
 * Return the average of the Chi-Squared errors of all histograms
 */
LiveQ.Play.Results.prototype.getAverageError = function() {
	var ans = 0, ansc = 0;
	for (var i=0; i<this.results.length; i++) {
		var chi2 = LiveQ.Calculate.chi2WithError(
			this.results[i].histo, 
			this.results[i].ref.reference
		);
		ans += chi2[0]; ansc += 1;
	}
	return ans / ansc;
}

LiveQ.Play.Results.prototype.add = function(histogram, reference) {
	this.observableList.add( histogram, reference );
	this.results.push({
		'histo': histogram,
		'ref': reference
	});
}

LiveQ.Play.Results.prototype.snapshotSet = function() {
	this.observableList.snapshotSet();
}

LiveQ.Play.Results.prototype.snapshotClear = function() {
	this.observableList.snapshotClear();
}

LiveQ.Play.Results.prototype.zero = function() {
	this.observableList.zero();
}

LiveQ.Play.Results.prototype.flash = function( text, color ) {
	this.observableList.flash(text, color);
}

