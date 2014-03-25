(function() {

	/**
	 * Initialize Lab
	 */
  	LiveQ.UI.initLab = function(id) {

  		var t = new LiveQ.UI.Tunable("#tunables-host");

      for (var i=0; i<10; i++) {
        t.add({
          'short': 'As',
          'title': 'Alpha-S',
          'min': 0.0600,
          'max': 0.2500,
          'dec': 4
        });
      }

	}

	LiveQ.UI.slide = function(side) {

	}

})();