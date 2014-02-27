
/**
 * 
 */
LiveQ.UI.Correlations = function() {
	var self = this;
	this.canvas = document.createElement('canvas');
	this.context = this.canvas.getContext("2d");
	document.body.appendChild(this.canvas);

	// Crate our glass pane :)
	$(this.canvas).css({
		'pointer-events': 'none',
		'position': 'absolute',
		'left': 0,
		'top': 0
	});

	// Bind on resize events
	$(window).resize(function() {
		self.resize();
		self.redraw();
	});
	self.resize();

	// Start timer for checking UI updates
	setInterval(function() {
		if (!self.correlations.length) return;
		requestAnimationFrame(function() {
			self.checkForUpdates();
		});
	}, 25);

	// Reset correlations
	this.correlations = [ ];
	this.corrTitleTop = 64;
	this.corrLineHeight = 12;
	this.corrTitlePadding = 5;
	this.corrTitleSpacing = 4;

};

/**
 * Remove all UI correlations
 */
LiveQ.UI.Correlations.prototype.clear = function() {
	this.corrTitleTop = 64;
	this.correlations = [];
	this.redraw();
}


/**
 * Add a correlation betwen to DOM elements
 */
LiveQ.UI.Correlations.prototype.add = function(left, right, title) {

	// Create multi-line text lines
	var lines = title.split("\n"),
		linesHeight = this.corrLineHeight*lines.length;

	// Push on correlations
	this.correlations.push({
		'a': {
			'e': left,
			'o': { 'left': 0, 'top': 0 },
			'w': 0
		},
		'b': {
			'e': right,
			'o': { 'left': 0, 'top': 0 },
			'w': 0
		},
		't': lines,
		'h': linesHeight,
		'p': this.corrTitleTop
	});

	// Increment correlation title top
	this.corrTitleTop += linesHeight + this.corrTitlePadding*2 + this.corrTitleSpacing;

	// Redraw UI
	this.redraw();

}

/**
 * Check if an element has changed it's position on the DOM
 */
LiveQ.UI.Correlations.prototype.checkForUpdates = function() {
	var triggerRedraw = false;
	for (var i=0; i<this.correlations.length; i++) {
		var c = this.correlations[i];

		// Get offset positions
		var aOfs = $(c.a.e).offset(), aW = $(c.a.e).width(),
			bOfs = $(c.b.e).offset(), bW = $(c.b.e).width();

		// Check diff
		if ( (c.a.o.left != aOfs.left) || (c.a.o.top != aOfs.top) || (c.a.w != aW) ||
			 (c.b.o.left != bOfs.left) || (c.b.o.top != bOfs.top) || (c.b.w != bW) ) {

			// Update offsets
			c.a.o = aOfs; c.b.o = bOfs;
			c.a.w = aW; c.b.w = bW;

			// Redraw UI
			triggerRedraw = true;

		}

	}

	// Check if we should fire redraw
	if (triggerRedraw) this.redraw();
}

/**
 * Redraw the correlation lines from left to right
 */
LiveQ.UI.Correlations.prototype.redraw = function() {
	var sTop = $(window).scrollTop(), ctx = this.context;

	// Clear canvas
	ctx.clearRect ( 1,1, this.canvas.width, this.canvas.height );
	ctx.lineWidth = 2;
	ctx.strokeStyle = "#FF0000";

	for (var i=0; i<this.correlations.length; i++) {
		var c = this.correlations[i];

		// Get offset positions
		var aOfs = $(c.a.e).offset(), aW = $(c.a.e).width(),
			bOfs = $(c.b.e).offset(), bW = $(c.b.e).width();

		// Calculate left and right anchors
		var x1 = aOfs['left'] + aW/2,
			y1 = aOfs['top'],
			x2 = bOfs['left'] + bW/2,
			y2 = bOfs['top'];

		// Calculate the width and the height of the description text
		var rw = 0, rh = c.h;
		for (var j=0; j<c.t.length; j++) {
			var tw = ctx.measureText(c.t[j]).width;
			if (tw > rw) rw = tw;
		}

		// Calculate the position of the description rect
		var cx = (x1+x2)/2, cy = c.p,
			rx = cx - rw/2 - this.corrTitlePadding,
			ry = cy;
			rw += 2 * this.corrTitlePadding;
			rh += 2 * this.corrTitlePadding;

		// Calculate the two anchor points on the description box
		var x3 = rx, y3 = ry+rh/2,
			x4 = rx+rw, y4 = y3;

		// Draw two connecting lines
		ctx.beginPath();
		ctx.moveTo(x1,y1);
		ctx.quadraticCurveTo(x1, y3, x3,y3);
		ctx.moveTo(x4,y4);
		ctx.quadraticCurveTo(x2, y4, x2,y2);
		ctx.moveTo(x2,y2);
		ctx.lineTo(x2-8,y2-8);
		ctx.moveTo(x2,y2);
		ctx.lineTo(x2+8,y2-8);
		ctx.stroke();

		// Draw description frame
		ctx.fillStyle = "rgba(0,0,0,0.7)";
		ctx.fillRect( rx, ry, rw, rh );
		ctx.beginPath();
		ctx.rect( rx, ry, rw, rh );
		ctx.stroke();

		// Draw text
		ctx.fillStyle = "#FFFFFF";
		var y = ry + this.corrTitlePadding + this.corrLineHeight - ctx.lineWidth,
			x = rx + this.corrTitlePadding;
		for (var j=0; j<c.t.length; j++) {
			ctx.fillText(c.t[j], x,y);
			y += this.corrLineHeight;
		}

	}
}

/**
 * Resize canvas so it covers the entire area
 */
LiveQ.UI.Correlations.prototype.resize = function() {
	this.canvas.width = window.innerWidth;
	this.canvas.height = document.body.scrollHeight;
}