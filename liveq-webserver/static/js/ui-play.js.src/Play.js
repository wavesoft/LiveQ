
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

  LiveQ.UI.initLab = function(id) {

      // State variables
      var modalOpen = false,
          tunableToObservable = [];

      // Setup backend
      var lab = new LiveQ.LabSocket(id);

      // Setup UI
      var t = new LiveQ.UI.Tunables("#tunables");
      var o = new LiveQ.UI.Observables("#observables");
      var cui = new LiveQ.UI.Correlations();

      /**
       * Handler of the simulation start button
       */
      $("#sim-begin").click(function() {
        // Clear log
        $("div.log").empty();

        // Start simulation
        lab.beginSimulation( t.getParameters() );

        // Show waiting modal
        modalOpen = true;
        $("#sim-waiting-modal").modal('show');

        // Show abort button
        $("#sim-abort").show();
        $("#loading-spinner").show();
        $("#running-text").show();

      });

      /**
       * Bind to various abort buttons
       */
      var abortFn = function() {
        // Abort simulation
        lab.abortSimulation();
        // Hide modal
        if (modalOpen) {
          $("#sim-waiting-modal").modal('hide');
          modalOpen = false;
        }
        // Hide abort button
        $("#sim-abort").hide();
        $("#loading-spinner").hide();
        $("#running-text").hide();
      };
      $("#sim-modal-abort").click(abortFn);
      $("#sim-abort").click(abortFn);

      /**
       * Notification when server data are available
       * This functino hides the modal pop-over
       */
      lab.onDataArrived(function(ipol) {
        if (ipol) return;
        if (modalOpen) {
          addLog("Got first data", "done");
          $("#sim-waiting-modal").modal('hide');
          modalOpen = false;
        }
      });

      /**
       * Generate tunables when tunable configuration is arrived.
       */
      lab.onTunablesUpdated(function(tunables, links) {

        // Create tunables
        for (var i=0; i<tunables.length; i++) {
          var parm = tunables[i];
          // Start from default value
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
        o.add( histo, ref );
      });

      /**
       * Store log messages to log elements
       */
      lab.onLog(function(msg) {
        addLog(msg);
      });

      /**
       * Store error messages to log elements
       */
      lab.onError(function(msg) {
        addLog(msg, "error");
      });

      /**
       * Cleanup when the simulation is completed
       */
      lab.onCompleted(function() {
        addLog("Simulation completed", "done");
        $("#sim-abort").hide();
        $("#loading-spinner").hide();
        $("#running-text").hide();
      });

      /**
       * Trigger interpolations every time we change a value
       */
      var ipolTimer = null;
      $(t).on('change', function(e, tunable, parm, value) {
        // Request interpolation 0.5 second after the variables are 
        // done changing
        if (ipolTimer != null) clearTimeout(ipolTimer);
        ipolTimer = setTimeout(function() {
          lab.beginSimulation( t.getParameters(), true );
        }, 500);
      });

      /**
       * Implement the highlighting & expanding of
       * linked or correlated histograms.
       */
      $(t).on('expand', function(e, tunable) {
        // Collapse all elements
        o.collapseAll();
        // Find the observables to expand
        for (var i=0; i<tunableToObservable.length; i++) {
          var e = tunableToObservable[i];
          if (e.tunable == tunable.name) {
            o.expand(e.observable);
            o.tooltip(e.observable, e.title);
          }
        }
      });
      $(t).on('collapse', function(e, tunable) {
        // Find the observables to expand
        for (var i=0; i<tunableToObservable.length; i++) {
          var e = tunableToObservable[i];
          if (e.tunable == tunable.name) {
            o.collapse(e.observable);
            o.tooltip(e.observable, "");
          }
        }
      });
      $(t).on('hover', function(e, tunable) {
        var marklist = [];
        for (var i=0; i<tunableToObservable.length; i++) {
          var e = tunableToObservable[i];
          if (e.tunable == tunable.name) {

            // Put observable on mark list
            marklist.push(e.observable);

            // Place correlation
            cui.add(
                tunable['element'],
                o.getElement(e.observable),
                e.title
              );

          }
        }
        o.mark(marklist);
        t.mark([tunable.name]);
      });
      $(t).on('hout', function(e, tunable) {
        o.mark([]);
        t.mark([]);
        cui.clear();
      });

      // Test video introduction
      $("#sim-intro").click(function() {

        LiveQ.UI.explainations.showVideoExplaination(
            "http://www.youtube.com/watch?v=16kRVoSyO_w&rel=0&controls=0",
            [
              {
                'at': 5,
                'focus': $("#tunables-pane"),
                'title': 'Tunables Pane',
                'text': 'From here you can tune the model parameters'
              },
              {
                'at': 10,
                'focus': $("#observables-pane"),
                'title': 'Observables Pane',
                'text': 'From here you see the effect of your tunes'
              },
              {
                'at': 12,
                'focus': $("#observables-legend"),
                'title': 'Observables Pane',
                'text': 'You can refer to the color coding in the legend'
              },
              {
                'at': 15,
                'focus': $("#sim-begin"),
                'title': 'Simulation Control',
                'text': 'With this button you can start the simulation'
              },
              {
                'at': 20,
                'focus': $("#sim-abort"),
                'title': 'Simulation Control',
                'text': 'With this button you can abort it'
              }
            ]
          );

      });

      // ==========================
      //   onLoad Initializations
      // ==========================

      // Prepare modal
      $('#sim-waiting-modal').modal({
        'show': false
      });

      // Hide elements
      $("#sim-abort").hide();
      $("#running-text").hide();
      $("#loading-spinner").hide();

    };

})();