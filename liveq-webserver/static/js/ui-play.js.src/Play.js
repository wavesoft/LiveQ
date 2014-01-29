
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
    $("#log").prepend(logLine);
  }

  function popoverInline(url) {
    $("#inlineModalFrame").attr("href", url);
    $("#inlineModal").modal('show');
  }

  var site;
  function initialize() {

    // Bind descriptions
    $("#tunables > form > .form-group").each(function(i, e) {
      var input = $(e).find("input").first(),
          desc = $(e).find(".description").first().html();

      // Create popover on the description
      $(input).popover({
        'html': true,
        'content': desc,
        'trigger': 'focus',
        'placement': 'bottom'
      });

      // Open links in the popover on an inline popover
      var link = $(desc).find("a").first();
      link.click(function(e){
        e.preventDefault();
        popoverInline(link.attr("href"));
        return false;
      });

    });

    // Establish connection to the lab
    var lab = new LiveQ.LabSocket("3e63661c13854de7a9bdeed71be16bb9");

    // Register handlers for new histograms
    lab.onHistogramAdded(function(histo, ref) {

      // Create a new plot and store it in the histogram object
      histo.plot = new LiveQ.UI.PlotWindow("#host", {
          'width': 340,
          'height': 300,
          'imgTitle': ref.imgTitle,
          'imgXLabel': ref.imgXLabel,
          'imgYLabel': ref.imgYLabel
        });

      // Place the reference data
      histo.plot.addHistogram( ref.reference, "Reference data" )

      // Place histogram
      histo.plot.addHistogram( histo, ref.name );

    });

    // Redraw histogram when updated
    lab.onHistogramUpdate(function(histo, ref) {

      // Update plot
      histo.plot.update();

      // Updating
      console.log( "Means of", ref.id, ":", LiveQ.Calculate.chi2WithError(
        histo.plot.plots[1].histo,
        histo.plot.plots[0].histo
        ));

    });

    // Log messages
    lab.onLog(function(msg) {
      addLog(msg);
    });

    // Log errors
    lab.onError(function(msg) {
      addLog(msg, "error");
    });

    // Handle completion
    lab.onCompleted(function() {
      addLog("Simulation completed", "done");
      $("#stopSim").hide();
      $("#loading-spinner").hide();
    });

    // Handle metadata update
    lab.onMetadataUpdated(function(meta) {
      if (meta['interpolation']) {
        $("#nevts").html( commaThousands(meta['nevts']) + ' <span class="text-primary"> (Interpolation)</span>' );
      } else {
        $("#nevts").html( commaThousands(meta['nevts']) );
      }
    });

    // Open main lab
    addLog("Initialized socket on lab " + lab.id);

    // Bind buttons
    $("#startSim").click(function(e,i) {
      var param = {
          'TimeShower:alphaSvalue': parseFloat($("#tunable-01").val()),
          'StringZ:aLund': parseFloat($("#tunable-02").val()),
          'StringZ:bLund': parseFloat($("#tunable-03").val()),
        };
      addLog("Starting simulation");
      lab.beginSimulation( param );
      $("#stopSim").show();
      $("#loading-spinner").show();
    });

    // Bind abort button
    $("#stopSim").click(function(e,i) {
      addLog("Aborting simulation", "warn");
      lab.abortSimulation();
      $("#stopSim").hide();
      $("#loading-spinner").hide();
    });

    // Hide stop sim and spinner
    $("#stopSim").hide();
    $("#loading-spinner").hide();

  }

  /**
   * Initialize on load
   */
  $(function() {
    initialize();
  });

})();
