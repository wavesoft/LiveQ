
  function show_disconnected_bsod() {
    setTimeout(function() {
      var e_bsod = $('<div id="bsod"></div>'),
          e_icon = $('<div class="bsod-icon">&#9889;</div>'),
          e_text = $('<div>Your connection with the server was interrupted. Please <a href="javascript:;">reload the site</a> to try again.</div>'),
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

    }, 1000);
  }

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
       * Handle disconnection with the sterver
       */
      lab.onDisconnect(function() {
        show_disconnected_bsod();
      });

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
      lab.onCompleted(window.ff = function() {

        addLog("Simulation completed", "done");
        $("#sim-abort").hide();
        $("#loading-spinner").hide();
        $("#running-text").hide();

        // Check the quality of the results
        var error = o.getAverageError(),
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
      var showUIIntro = function() {
        var doExpand = false;
        LiveQ.UI.explainations.showVideoExplaination(
            "http://www.youtube.com/watch?v=x3S0s-qjNsY&rel=0&controls=0",
            "Introduction to the interface",
            [
              {
                'at': 8,
                'focus': $("#tunables-pane"),
                'title': 'Tunables Group',
                'text': 'From here you can tune the model parameters.',
                'placement': 'top'
              },
              {
                'at': 13,
                'focus': $("#observables-pane"),
                'title': 'Observables Group',
                'text': 'From here you see the effect of your tunes.',
                'placement': 'top'
              },
              {
                'at': 23.5,
                'focus': $(".tune:first"),
                'title': 'Tunable Tile',
                'text': 'Click here to expand and edit it\'s value.'
              },
              {
                'at': 28.9,
                'focus': $(".tune:first"),
                'title': 'Tunable Tile',
                'text': 'Use the plus/minus buttons to change value, or click on the label to type it.',
                onEnter: function() {
                  doExpand = !$(".tune:first").hasClass("expand");
                  if (doExpand) $(".tune:first").click();
                }
              },
              {
                'at': 31.5,
                'focus': $(".observable:first"),
                'title': 'Observable Tile',
                'text': 'Here you see the simulation histograms and how successful was the fit.',
                'placement': 'top',
                onEnter: function() {
                  
                  // Pick the first tunable parameter
                  var cfg = {};
                  for (k in t.parameters) {
                    if (typeof(t.parameters[k]) == 'object') {
                      cfg = t.parameters[k];
                      break;
                    }
                  }
                  console.log("Found cfg", cfg);

                  // Fire change event
                  t.set( cfg.name, cfg.value );

                },
                onExit: function() {
                  $(".tune:first").click();
                }
              },
              {
                'at': 40.5,
                'duration': 5,
                'focus': $("#sim-begin"),
                'title': 'Start Simulation Button',
                'text': 'Click this to start the simulation when you are ready.',
              }
            ]
          );
      };
      $("#sim-intro").click(function() { showUIIntro(); });

      // ==========================
      //   onLoad Initializations
      // ==========================

      // Prepare modals
      $('#sim-waiting-modal').modal({
        'show': false
      });
      $('#sim-status').modal({
        'show': false
      });

      // Hide elements
      $("#sim-abort").hide();
      $("#running-text").hide();
      $("#loading-spinner").hide();

      // If that's the first time we are viewing the website,
      // show the introduction video
      if (!LiveQ.getCookie("first-use")) {
        $(function() {
          showUIIntro();
          LiveQ.setCookie("first-use", 1, 3650);
        });
      };

    };

})();