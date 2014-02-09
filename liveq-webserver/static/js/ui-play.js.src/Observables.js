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
}

/**
 * Add a new tunable in the collection
 */
LiveQ.UI.Observables.prototype.add = function( histoData, histoReference ) {

	// Create an observable host element
	var elm = $('<div class="observable"></div>');

	// Keep a reference of the observable
	this.observables[ histoData.id ] = {
		'element': elm,
		'data': histoData,
		'ref': histoReference
	};

}