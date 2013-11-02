

(function(glob){

	var lab;

	/**
	 * A job object that fires events when it's changed
	 */
	function Knob(cfg) {
		var cfg = cfg || { };
		this.width = cfg.width || 100;
		this.height = cfg.height || 100;

		this.element = $('<div />');
		this.dial = $('<input class="dial" />');
		this.label = $('<div class="dialLabel" />');

		$(this.element).css({
			'display': 'inline-block',
			'width': this.width,
			'height': this.height,
			'position': 'relative'
		});

		$(this.label).css({
			'position': 'absolute',
			'left': 0,
			'right': 0,
			'top': this.height/2 - 10,
			'font-size': 12,
			
		});
	}

	function makeKnob() {
		var container = $("#panel-tune");
		var h = $('<div />'),
			e = $('<input class="dial" />'),
			d = $('<div class="dialLabel" />');

		container.append(e);
		$(e).knob({
            'min':0,
            'max':100,
            'step': 1,
            'width': 100,
            'height': 100,
            'displayInput': false
		});
	}

	function resetTuneViews() {

	}

	function startWebAPI() {

	}

	function stopWebAPI() {

	}

	/**
	 * Start/Switch lab
	 */
	var startLab = glob.startLab = function(id) {

		var lab = new MCPlotsLab(id);

		$(lab).on('updateData', function(e,data,info){ 
			console.log("*** DATA: ",a,b);
		});

		$(lab).on('updateBegin', function(e) { 
			console.log("-- BEGIN --"); 
		});

		$(lab).on('updateCompleted', function(e,result, info) { 
			console.log("-- COMPLETED (", b,") --"); 
		});

		$(lab).on('ready', function(e, histo, reference, layout) {

		});

		$(lab).on('error', function(e, message) {

		});

	};

	var initUI = glob.initUI = function() {
		makeKnob();
	};


})(window);


$(function() {
	initUI();
});
