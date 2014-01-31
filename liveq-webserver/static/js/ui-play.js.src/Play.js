
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


  var tunableLookup = [];
  function appendTunableInput(host, id, entry) {

    // Prepare and nest group and label
    var group  = $('<div class="form-group"></div>'),
        label  = $('<label for="'+id+'" class="col-sm-6 control-label">'+entry['title']+'</label>'),
        cGroup = $('<div class="col-sm-6"></div>');

    // Nest elements
    $(host).append(group);
    group.append(label);
    group.append(cGroup);

    // Fetch decimals
    var decimals = parseInt(entry['dec']);

    // Prepare and nest component and values
    var input = $('<input type="text"></input>');
    if (entry['type'] == 'slider') {

      // Slider needs element to be in place
      cGroup.append(input);

      // Create slider
      $(input).slider({
        'id': id,
        'min': entry['min'],
        'max': entry['max'],
        'value': entry['def'],
        'step': Math.pow(10, -decimals),
        'formater': function(value) {
          return Number(value).toFixed(decimals);
        }
      });

      // Place default
      $(input).attr('value', entry['def']);

    }

    // Create popover on the control element
    $(group).popover({
      'html': true,
      'content': entry['desc'],
      'trigger': 'hover',
      'placement': 'bottom'
    });

    // Append input field on the lookup table
    tunableLookup.push([ entry['name'], input[0] ]);

    // Return group
    return group;

  }

  function collectTunables() {
    var ans = { };
    for (var i=0; i<tunableLookup.length; i++) {
      ans[tunableLookup[0]] = $(tunableLookup[1]).val();
    }
  }

  var site;
  LiveQ.UI.initLab = function(lab) {

    // Establish connection to the lab
    var lab = new LiveQ.LabSocket(lab);

    // Update tunable fields when we have data
    lab.onTunablesUpdated(function(tunables) {

      // Remove previous tunables and reset
      $("#tunables").empty();
      tunableLookup = [];

      // Create tunables
      for (var i=0; i<tunables.length; i++) {
        appendTunableInput($("#tunables"), 'tunable-'+i, tunables[i]);
      }

    });

    // Create new histogram plot when a histogram is added
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
      addLog("Starting simulation");
      lab.beginSimulation( collectTunables() );
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

})();
