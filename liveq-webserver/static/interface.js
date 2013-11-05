

(function(glob){

	var lab;

	/**
	 * A job object that fires events when it's changed
	 */
	function Knob(config) {
		var cfg = config || { };
		this.width = cfg.width || 100;
		this.height = cfg.height || 120;
		this.fgColor = cfg.fgColor || "#87CEEB";
		this.title = cfg.title || "Knob";
		this.lblColor = cfg.lblColor || "#000000";
		this.titleHeight = cfg.titleHeight || 20;
		this.min = (cfg.min == undefined) ? 0 : cfg.min;
		this.max = (cfg.max == undefined) ? 10 : cfg.max;
		this.steps = (cfg.steps == undefined) ? 10 : cfg.steps;
		this.step = (cfg.step == undefined) ? 0.1 : cfg.step;
		this.decimals = (cfg.decimals == undefined) ? 2 : cfg.decimals;
		this.value = cfg.value || this.min;

		this.element = $('<div />');
		this.dial = $('<input />');
		this.lblValue = $('<div />');
		this.lblTitle = $('<div />');
		this.btnHelp = $('<span class="glyphicon glyphicon-question-sign" />');

		// Nest everything
		$(this.element).append(this.lblValue);
		$(this.element).append(this.dial);
		$(this.element).append(this.lblTitle);

		$(this.element).css({
			'display': 'block',
			'width': this.width,
			'height': this.height,
			'position': 'relative',
			'float': 'left',
			'margin': 8
		});

		$(this.lblValue).css({
			'position': 'absolute',
			'left': 0,
			'right': 0,
			'top': (this.height- this.titleHeight)/2 - 10,
			'font-size': 14,
			'color': this.fgColor,
			'text-align': 'center'
		});

		$(this.lblTitle).css({
			'display': 'block',
			'width': this.width,
			'height': this.titleHeight,
			'font-size': Math.round(this.titleHeight / 1.2),
			'text-align': 'center',
			'color': this.lblColor,
			'text-align': 'center'
		});

		$(this.btnHelp).css({
			'position': 'absolute',
			'right': '0',
			'width': 16,
			'height': 16,
			'cursor': 'pointer'
		});

		$(this.dial).mouseover((function(){
			$(this.btnHelp).show();
		}).bind(this));

		$(this.dial).mouseout((function(){
			$(this.btnHelp).hide();
		}).bind(this));


		// Re-map to integers
		var vrange = (this.max - this.min);
		var range = Math.round(vrange / this.step);
		var stepSize = Math.round(range / this.steps);
		console.log(vrange, range, this.step, stepSize, this.steps);

		$(this.lblValue).html( Number(this.value).toFixed(this.decimals) );
		$(this.lblTitle).html( this.title );
		$(this.lblTitle).append(this.btnHelp);

		$(this.dial).knob({
            'min':0,
            'max': range,
            'step': stepSize,
            'width': this.width,
            'height': this.height - this.titleHeight,
            'displayInput': false,

            'change': (function(v) {
            	if (v < 0) v = 0;
            	if (v > range) v=range;
				var value = vrange * v / range + this.min;
				console.log(v, '->', value, this.decimals);
				$(this.lblValue).html(value.toFixed(this.decimals))
            }).bind(this)

		});

	}

	function makeKnob(title, min, max) {
		var container = $("#panel-tune"),
			knob = new Knob({
				'title': title,
				'min': min,
				'max': max,
				'step': 0.05,
				'decimals': 2
			});
		container.append(knob.element);
		return container;
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
			console.log("== LAB Config Arrived ===")
		});

		$(lab).on('error', function(e, message) {
			console.error(message);
		});

	};

	var initUI = glob.initUI = function() {
		makeKnob("AlphaS", 0, 100);
		makeKnob("Volumetric", 0, 100);
		makeKnob("Test", 0, 100);
	};


})(window);


$(function() {
	initUI();
});
