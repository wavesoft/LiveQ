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
    'observ-pad': 5,
    'observ-sep': 10,
    'animation-ms': 200
  };

}

/**
 * Reorder expanded and non-expanded elements
 */
LiveQ.UI.Observables.prototype.reorder = function() {
  var y=0, x=0, w=this.host.width(), self=this,
      elements = this.host.find(".observable");

  // Prepare element groups
  var groups = { };

  // First walk over the expanded elements, which
  // are independant of group
  elements.each(function(i,e) {

    // Stack expanded elements
    if ($(e).hasClass("expand") && $(e).hasClass("full")) {
      $(e).css({
        "left": 0,
        "top": y
      });
      $(e).attr('data-top', y);
      y += self.css['observ-xl'] + self.css['observ-pad'];
    }

  });

  // Separator
  if (y > 0)
    y += self.css['observ-sep'];

  // Then walk over non-expanded
  elements.each(function(i,e) {
    if (!$(e).hasClass("expand") && !$(e).hasClass("full")) {
      $(e).css({
        "left": x,
        "top": y
      });
      $(e).attr('data-top', y);
      x += self.css['observ-sm'] + self.css['observ-pad'];
      if ((x+self.css['observ-sm']) >= w) {
        y += self.css['observ-sm'] + self.css['observ-pad'];
        x = 0;
      }
    }
  });

  // Add last element height to calculate element height
  if (x != 0) {
    y += self.css['observ-sm'] + self.css['observ-pad'];
  }

  // Update the height of the host
  $(this.host).css("height", y);

}

/**
 * Create description element
 */
LiveQ.UI.Observables.prototype.createDescription = function( config ) {
	var elm = $(
		'<div class="observ-desc small-body"><h1>'+config.ref.title+'</h1>'+
		config.ref.shortdesc+'</div>'),
      btnMore = $('<a class="tune-desc-more" href="javascript:;"><span class="glyphicon glyphicon-question-sign"></span></a>');

	elm.append(btnMore);
	btnMore.click(function(e) {
		e.stopPropagation();
		LiveQ.UI.explainations.show(
			'<span class="label label-default">' + config.ref.short + '</span> ' + config.ref.title,
			'help?type=observable&name=' + config.ref.id,
			config.ref.url
		);
	});

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
  var elm = $(element), self = this;

  // Switching to EXPANDED
  if (!elm.hasClass("expand")) {
    var expanded = elm.parent().find("div.observable.expand");

    // Reorder to the last selection
    elm.detach();
    if (expanded.length == 0) {
      this.host.prepend(elm);
    } else {
      elm.insertAfter(expanded.last());          
    }

    // Delay-apply the class and animation
    setTimeout(function() {
      elm.addClass("expand");
      elm.addClass("full");
      self.reorder();

      // Scroll to top of the element
      $('html,body').animate({
        scrollTop: self.host.offset().top + parseInt($(elm).attr("data-top"))
      }, 250);

    }, 50);

  } else {
    var nonExpanded = elm.parent().find("div.observable:not(.expand)");

    // Reorder to the top of non-selected
    elm.detach();
    if (nonExpanded.length == 0) {
      this.host.append(elm);
    } else {
      elm.insertBefore(nonExpanded.first());          
    }

    // Delay-apply the class and animation
    setTimeout(function() {
      elm.removeClass("expand");
      elm.removeClass("full");
      self.reorder();

    }, 50);

  }
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
	// (ONLY FOR NOW: Also display results if we have more than 100,000 events)
	var trusted = ((chi2[1] / chi2[0]) < 0.1) || (config.data.nevts > 100000),
		fitClass = "", fitStr = "";

	// Remove all possible fit classes from the plot
	for (var i=0; i<4; i++) { config.element.removeClass("fit-"+i); }

	// Check what fit class we are on
	if (trusted) {
		if (chi2[0] < 0.5 ) { // Excellent fit
			config.element.addClass("fit-0");
			fitStr = "Perfect Match";
		} else if (chi2[0] < 1.0 ) { // Good fit
			config.element.addClass("fit-1");
			fitStr = "Good Match";
		} else if (chi2[0] < 4.0 ) { // Fair fit
			config.element.addClass("fit-2");
			fitStr = "Fair Match";
		} else { // Bad fit
			config.element.addClass("fit-3");
			fitStr = "Bad Match";
		}
	} else {
		if (config.data.nevts == 0) {
			fitStr = "No Data";
		} else {
			fitStr = "Low Statistics";
		}
	}

	// Update status fields
	config.element.find("div.detail").html( 
		"<div><strong>Events:</strong> " + config.data.nevts + "</div>" +
		"<div><strong>Error:</strong> " + chi2[0].toFixed(4) + " &plusmn; " + chi2[1].toFixed(2) + "</div>"
	);
	config.element.find("div.status").html( "[ <strong>" + fitStr + "</strong> ]" );

	// Update value
	config.element.find("div.value").html( chi2[0].toFixed(2) );
	config.element.find("div.error").html( "&plusmn;" + chi2[1].toFixed(2) );

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
		hError = $('<div class="error">0.00</div>'),
		plotElm = $('<div class="plot"></div>');

	// Nest elements
	elm.append(hName);
	elm.append(hValue);
	elm.append(hError);
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
	plot.addHistogram( histoData, histoReference.title );

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
		plot.update();
		self.updateStatus(config);
	});

	// Bind events
	elm.click(function() {
		self.toggle(elm, config);
	});

	// Append element on host
	this.host.append(elm);

	// Initialize first status update
	this.updateStatus(config);
	this.reorder();

}

/**
 * Collapse all observables 
 */
LiveQ.UI.Observables.prototype.collapseAll = function() {

	// Remove expanded classes from all elements
	this.host.find("div.observable.expand")
		.removeClass("expand")
		.removeClass("full")
		.removeClass("part");
	this.reorder();

}

/**
 * Expand the given observable 
 */
LiveQ.UI.Observables.prototype.expand = function( observable, state ) {

	// Lookup config
	var config = this.observables[observable];

	// Add default state to full
	if (!state) state="full";

	// Update element
	config.element.addClass("expand");
	config.element.addClass(state);
	this.reorder();

}

/**
 * Collapse the given observable 
 */
LiveQ.UI.Observables.prototype.collapse = function( observable, state ) {

	// Lookup config
	var config = this.observables[observable];

	// Update element
	config.element
		.removeClass("expand")
		.removeClass("full")
		.removeClass("part");
	this.reorder();

}

/**
 * Mark the specified list of observables 
 */
LiveQ.UI.Observables.prototype.mark = function( list ) {

	// Remove mark from all elements
	this.host.find("div.observable.mark")
		.removeClass("mark");

	// Lookup config for the list
	for (var i=0; i<list.length; i++) {
		var config = this.observables[list[i]];
		config.element.addClass("mark");
	}

}

/**
 * Add a tooltip on the observable pane 
 */
LiveQ.UI.Observables.prototype.tooltip = function( observable, tip ) {

	// Lookup config
	var config = this.observables[observable];

	// Update tooltip
	if (tip == "") {
		$(config.element).tooltip('destroy');
	} else {
		$(config.element).tooltip({
			'title': tip,
			'placement': 'left'
		});
	}

}

/**
 * Return the DOM to corresponds to the observable with
 * the given name
 */
LiveQ.UI.Observables.prototype.getElement = function( observable ) {
	var config = this.observables[observable];
	if (!config) return undefined;
	return config['element'];
}