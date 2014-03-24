(function() {

	/**
	 * Initialize Lab
	 */
  	LiveQ.UI.initLab = function(id) {
		//$("#frame-run").hide();
	}

	LiveQ.UI.slide = function(side) {

		// Check to which side to slide
		if (!side) {
			var t1 = $("#frame-tunables"),
				t2 = $("#frame-run"),
				t3 = $("#frame-results");

			w = $(t1).width();
			t3.css({
				"width": t3.width()
			});

			t2.show();
			t2.css({
				"width": 0,
				"padding": 0
			})
			t2.animate({
				"width": w,
				"padding": "auto"
			}, 1000, function() {
			});

			t1.animate({
				"width": 0,
				"padding": 0
			}, 1000, function() {
				t1.hide();
			});
		}

	}

})();