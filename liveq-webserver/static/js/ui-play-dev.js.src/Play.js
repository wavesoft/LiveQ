(function() {

  LiveQ.Play = {

  };

  // Private variables
  var t, r, lab;

  /**
   * Initialize Lab
   */
  LiveQ.Play.initLab = function(id) {

    // Setup UI
  	t = new LiveQ.Play.Tunable("#tunables-host");
    r = new LiveQ.Play.Results("#results-host");

    // Setup backend
    lab = new LiveQ.LabSocket(id);

    /**
     * Generate tunables when tunable configuration is arrived.
     */
    lab.onTunablesUpdated(function(tunables, links) {

      // Create tunables
      for (var i=0; i<tunables.length; i++) {
        var parm = tunables[i];
        // The current value is the default value
        parm.value = parm.def;
        // Add tunable
        t.add(parm);
      }

      // Keep reference of tunable-to-observable links
      tunableToObservable = links;

    });

    /**
     * Generate observable when a histogram is added.
     */
    lab.onHistogramAdded(function( histo, ref ) {
      r.add( histo, ref );
    });

    /**
     * Flash data activity
     */
    lab.onDataArrived(function(interpolated) {
      if (interpolated) {
        r.flash('<span class="glyphicon glyphicon-download"></span> Received planning data', "#FF9900");
      } else {
        r.flash('<span class="glyphicon glyphicon-download"></span> Received simulation data', "#3399FF");
      }
    });

    /**
     * Flash errors
     */
    lab.onError(function(message, critical) {
      if (critical) {

      } else {
        r.flash('<span class="glyphicon glyphicon-warning-sign"></span> '+message, "#CC3300");
      }
    });

    /**
     * Wait for lab to become ready
     */
    lab.onReady(function() {

      // Request interpolation over defaults
      LiveQ.Play.startEstimate();

    });

    /**
     * Fire interpolation when tunables change
     */
    $(t).on('change', function() {
      LiveQ.Play.startEstimate();
    });

    /**
     * Bind mouse events
     */
    $("#btn-sim-start").click(function() {
      $("#btn-sim-start").hide();
      $("#btn-sim-abort").show();
      LiveQ.Play.startSimulation();
    });
    $("#btn-sim-abort").click(function() {
      $("#btn-sim-abort").hide();
      $("#btn-sim-start").show();
      LiveQ.Play.abortSimulation();
    });

    /**
     * Initialize UI
     */
    $("#btn-sim-abort").hide();
    $("#modal-histogram").modal({
      'show': false,
      'keyboard': true
    });

  };

  /**
   * Start simulation
   */
  LiveQ.Play.startSimulation = function() {

    // Take snapshot on the estimate
    r.snapshotSet();
    r.zero();

    // Start simulation
    var vals = t.getValues();
    console.log(vals);
    lab.beginSimulation( vals, false );

    // Start simulation
    $("#game-frame").addClass("running");

  }

  /**
   * Request an estimation from the server
   */
  LiveQ.Play.startEstimate = function() {

    // Start simulation
    lab.beginSimulation( t.getValues(), true );

  }

  /**
   * Abort simulation
   */
  LiveQ.Play.abortSimulation = function() {
    
    // Abort simulation from the lab
    lab.abortSimulation();

    // Clear snapshot data, keep the real data
    r.snapshotClear();

    // Switch back
    $("#game-frame").removeClass("running");

  }

  /**
   * Show plot details in a pop-up window
   */
  LiveQ.Play.showHistogramDetails = function( histoData, histoReference ) {

    // Cleanup previous histogram
    var plotElement = $('#modal-histogram-plot');
    plotElement.empty();

    // Figure out detector name
    var parts = histoData.id.split("/");
    parts = parts[1].split("_");

    // Prepare plot window
    var plot = new LiveQ.UI.PlotWindow( plotElement[0], {
      'width': plotElement.width(),
      'height': plotElement.height(),
      'imgTitle': histoReference.imgTitle,
      'imgXLabel': histoReference.imgXLabel,
      'imgYLabel': histoReference.imgYLabel
    });

    // Add plots
    plot.addHistogram( histoReference.reference, "Data from " + parts[0] + " experiment", "#000000" );
    plot.addHistogram( histoData, histoReference.title, ["#0066FF", "#FF9900"] );

    // Upadate modal title
    $("#modal-histogram .modal-title").html('<span class="label label-default">' + histoReference.short + '</span> ' + histoReference.title + ' Histogram' );

    // Prepare detail elements
    $("#modal-d-desc").html(histoReference.shortdesc);
    $("#modal-d-beam").html(histoReference.beam);
    $("#modal-d-energy").html(histoReference.energy + " GEv");
    $("#modal-d-proc").html(histoReference.process);
    $("#modal-d-params").html(histoReference.params);

    // Listen for event updates
    var updateVars = function() {
      $("#modal-d-nevts").html(histoData.nevts);
      var chi = LiveQ.Calculate.chi2WithError( histoReference.reference, histoData );
      $("#modal-d-chi2").html( Number(chi[0]).toFixed(2) + " &plusmn " + Number(chi[1]).toFixed(2) + "%" );
    }
    updateVars();

    // TOOD: This registers onUpdate event which is never unregistered
    histoData.onUpdate(function() {
      updateVars();
      plot.update();
      plot.updateLegend();
    });

    // Show modal
    $("#modal-histogram").modal('show');

  }

})();
