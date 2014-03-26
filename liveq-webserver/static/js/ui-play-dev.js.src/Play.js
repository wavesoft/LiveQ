(function() {

  function commaThousands(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function getTS() {
    var d = new Date();
    return  ('0' + d.getHours()).slice(-2) + ":" +
        ('0' + d.getMinutes()).slice(-2) + ":" +
        ('0' + d.getSeconds()).slice(-2);
  }

  function addLog(html, cls) {
    var logLine = $('<div></div>');
        if (!cls) cls="";
        $(logLine).attr("class", cls);
        $(logLine).html("["+getTS()+"]: "+html);
        $("div.log").prepend(logLine);
  }

  var already_bsod = false;
  function show_bsod(icon, text) {
    if (already_bsod) return;
    already_bsod = true;

    setTimeout(function() {
      var e_bsod = $('<div id="bsod"></div>'),
          e_icon = $('<div class="bsod-icon glyphicon glyphicon-' + (icon || "off" ) + '"></div>'),
          e_text = $('<div>' + ( text || "Your connection with the server was interrupted" ) + '. Please <a href="javascript:;">reload the site</a> to try again.</div>'),
          e_floater = $('<div></div>');

      // Nest elements
      e_bsod.append(e_floater);
      e_floater.append(e_icon);
      e_floater.append(e_text);
      $(document.body).append(e_bsod);

      // Fade-in
      e_bsod.hide();
      e_bsod.fadeIn();

      // Bind reload
      $(e_text).click(function() {
        window.location.reload();
      });

    }, 500);
  }

  // Setup namespace
  LiveQ.Play = {

  };

  // Private variables
  var t, r, status, lab;

  /**
   * Initialize Lab
   */
  LiveQ.Play.initLab = function(id) {

    // Setup UI
  	t = new LiveQ.Play.Tunable("#tunables-host");
    r = new LiveQ.Play.Results("#results-host");
    status = new LiveQ.Play.RunWindow("#run-host");

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
     * Update interface
     */
    lab.onHistogramUpdate(function( histo, ref) {
      status.updateFit( r.getAverageError() );
    });

    /**
     * Handle disconnection with the sterver
     */
    lab.onDisconnect(function() {
      show_bsod("off", "Your connection with the server was interrupted");
    });

    /**
     * Flash data activity
     */
    lab.onDataArrived(function(interpolated) {
      status.setStatus(2);
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
      addLog(message, "error");
      status.setStatus(3);
      if (critical) {
        show_bsod("exclamation-sign", "Could not establish connection with the server");
      } else {
        r.flash('<span class="glyphicon glyphicon-warning-sign"></span> '+message, "#CC3300");
      }
    });

    /**
     * Wait for lab to become ready
     */
    lab.onReady(function(config) {

      // Request interpolation over defaults
      LiveQ.Play.startEstimate();

      // Set status config
      status.setConfig({
        'maxEvents': 1800000
      });

    });

    /**
     * Store log messages to log elements
     */
    lab.onLog(function(msg, data) {
      addLog(msg);

      if (data['agent_added'] != undefined) {
        status.addAgent(data['agent_added']);
      } else if (data['agent_removed'] != undefined) {
        status.removeAgent(data['agent_removed']);
      }
    });


    /**
     * Metadata update
     */
    lab.onMetadataUpdated(function(meta) {
      status.updateEvents(meta.nevts)
    });

    /**
     * Add timeout timer for establishing connection
     */
    var cctimer = setTimeout(function() {
      show_bsod("exclamation-sign", "Timed out while trying to connect with the server.");
    }, 5000);
    lab.onConnect(function(msg) {
      clearTimeout(cctimer);
    });

    /**
     * Cleanup when the simulation is completed
     */
    lab.onCompleted(window.ff = function() {

      addLog("Simulation completed", "done");
      status.setStatus(0);

      // Check the quality of the results
      var error = r.getAverageError(),
          matchPrefix, matchTitle, matchBody, matchAccept;
      if (error < 0.5) {
        matchPrefix = "perfect";
        matchTitle = "Perfect Match";
        matchBody = "Wow! You found a perfect match! You managed tune the theoretical model in the best possible way! That's quite rare you know...";
        matchAccept = true;

      } else if (error < 1.0) {
        matchPrefix = "good";
        matchTitle = "Good Match";
        matchBody = "Congratulations! You managed to tune the theoretical model in the most optimal way!"
        matchAccept = true;

      } else if (error < 4.0) {
        matchPrefix = "acceptable";
        matchTitle = "Acceptable Match";
        matchBody = "Good work! You managed to find something quite close to what we need, but we will need something better.";
        matchAccept = true;

      } else if (error < 9.0) {
        matchPrefix = "fair";
        matchTitle = "Fair Match";
        matchBody = "You have done a good job, but you still have some way to go until you find something more precise.";
        matchAccept = false;

      } else {
        matchPrefix = "bad";
        matchTitle = "Bad Match";
        matchBody = "Your model is completely mistuned. Please try different values!";
        matchAccept = false;

      }

      // Update modal
      $("#sim-status .modal-body h3").html(matchTitle);
      $("#sim-status .modal-body p").html(matchBody);
      $("#sim-status .modal-body img").attr({
        'src': '/vas/static/img/models/' + matchPrefix + '.png',
        'alt': matchPrefix,
        'title': matchTitle
      });

      // Hide/show next level
      if (matchAccept) {
        $("#sim-next-level").show();
      } else {
        $("#sim-next-level").hide();
      }

      // Show modal
      $('#sim-status').modal('show');

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
    $("#btn-help").click(function() {
      //$("#game-frame").toggleClass("running");
      alert("Clicking here will allow you to hover over the elements in the interface and get more information");
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

    // Switch to starting
    status.setStatus(1);
    status.reset();

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

    // Set status
    status.setStatus(0);

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
    $("#modal-d-energy").html(histoReference.energy + " GeV");
    $("#modal-d-proc").html(histoReference.process);
    $("#modal-d-params").html(histoReference.params);

    // Listen for event updates
    var updateVars = function() {
      $("#modal-d-nevts").html( commaThousands(histoData.nevts) );
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
