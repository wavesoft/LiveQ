
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

      // Setup backend
      var lab = new LiveQ.LabSocket(id);

      // Setup UI
      var t = new LiveQ.UI.Tunables("#tunables");
      var o = new LiveQ.UI.Observables("#observables");

      var modalOpen = false;
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

      // Bind abort function(s)
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

      lab.onDataArrived(function(ipol) {
        if (ipol) return;
        if (modalOpen) {
          addLog("Got first data", "done");
          $("#sim-waiting-modal").modal('hide');
          modalOpen = false;
        }
      });

      lab.onTunablesUpdated(function(tunables) {
        for (var i=0; i<tunables.length; i++) {
          var parm = tunables[i];

          // Start from default value
          parm.value = parm.def;

          // Add tunable
          t.add(parm);

        }
      });

      lab.onHistogramAdded(function( histo, ref ) {
        o.add( histo, ref );
      });

      // Log messages
      lab.onLog(function(msg) {
        addLog(msg);
      });

      // Log errors
      lab.onError(function(msg) {
        addLog(msg, "error");
      });

      lab.onCompleted(function() {
        addLog("Simulation completed", "done");
        $("#sim-abort").hide();
        $("#loading-spinner").hide();
        $("#running-text").hide();
      });

      // Prepare modal
      $('#sim-waiting-modal').modal({
        'show': false
      });

      // Hide abort button
      $("#sim-abort").hide();
      $("#running-text").hide();
      $("#loading-spinner").hide();

    };

})();