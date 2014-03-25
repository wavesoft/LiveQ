
LiveQ.Play.Results = function( host ) {
	var self = this;
	this.host = $(host);

	// Create the expanded grid
	this.elmObservableGrid = $('<div class="results-grid"></div>');
	this.host.append(this.elmObservableGrid);

	// Create the results list
	this.elmObservableList = $('<div class="results-list"></div>');
	this.observableList = new LiveQ.UI.ResultGrid(this.elmObservableList);
	this.host.append(this.elmObservableList);

	// Handle clicks on the observables list
	$(this.observableList).on('click', function(e, histo) {
		LiveQ.Play.showHistogramDetails( histo.histogram, histo.reference );
	});

}

LiveQ.Play.Results.prototype.add = function(histogram, reference) {
	this.observableList.add( histogram, reference );
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

