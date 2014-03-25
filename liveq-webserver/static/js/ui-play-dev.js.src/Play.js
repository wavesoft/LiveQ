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
        r.flash('<span class="glyphicon glyphicon-download"></span> Incoming planning data', "#FF9900");
      } else {
        r.flash('<span class="glyphicon glyphicon-download"></span> Incoming simulation data', "#3399FF");
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
     *
     */
    $(t).on('change', function() {
      LiveQ.Play.startEstimate();
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

})();
