
define(["jquery"], 

	function($) {

		var LINE_STRAIGHT = 0,
			LINE_BRANCH = 1,
			LINE_COLLAPSE = 2;





		var Grid = function() {

			// Line boundaries
			this.lineMin = 0;
			this.lineMax = 0;
			this.lines = {};

			// List of objects to normalize
			this.normalizeList = [];

		}

			/**
			 * Clean the entire grid
			 */
			Grid.prototype.clear = function() {
				this.lineMin = 0;
				this.lineMax = 0;
				this.lines = {};
				this.normalizeList = [];
			}

			/**
			 * Normalize the line boundaries
			 */
			Grid.prototype.normalize = function() {
				for (var i=0; i<this.normalizeList.length; i++) {
					this.normalizeList[i].y -= this.lineMin;
				}
			}

			/**
			 * Get a clear line on the given coordinates and
			 * shift other lines if required
			 */
			Grid.prototype.getClearLine = function(x, y, upwards) {

				// Update line metrics
				if (y < this.lineMin) this.lineMin = y;
				if (y > this.lineMax) this.lineMax = y;

				// If line is not defined, we have space
				if (this.lines[y] == undefined) {
					this.lines[y] = new GridLine(this, y, x);
					return this.lines[y];
				}

				// Otherwise we have to shift
				if (upwards) {
					for (var i=this.lineMin-1; i<y; i++) {
						this.lines[i+1].y--;
						this.lines[i] = this.lines[i+1];
					}
					this.lines[y] = new GridLine(this, y, x);
				} else {
					for (var i=this.lineMax+1; i>y; i--) {
						this.lines[i-1].y++;
						this.lines[i] = this.lines[i-1];
					}
					this.lines[y] = new GridLine(this, y, x);
				}

				// Return empty space
				return this.lines[y];

			}

			/**
			 * Create/return the first line
			 */
			Grid.prototype.getFirstLine = function() {
				if (this.lines[0] == undefined)
					this.lines[0] = new GridLine(this, 0);
				return this.lines[0];
			}


		var GridLine = function(grid, y, x) {
			this.grid = grid;
			this.forkDepth = 0;
			this.y = y || 0;
			this.x = x || 0;
		}

			/**
			 * Reset fork depth and move forward
			 */
			GridLine.prototype.forward = function(stepSize) {
				this.forkDepth = 0;
				this.x += stepSize || 1;
			}


			/**
			 * Align the X/Y coordinates of the node, according to the
			 * current grid structure
			 */
			GridLine.prototype.stackNode = function(node) {

				// First stack occurs on this line
				if (this.forkDepth == 0) {
					
					// Update node's coordinates
					node.x = this.x;
					node.y = this.y;

					// Keep this object on the normalize list
					this.grid.normalizeList.push(node);

					// Increment fork depth
					this.forkDepth++;

					// Return this instance
					return this;

				}

				// Every other stack occurs in different lines
				else {

					// Calculate line direction & offset
					var direction = (this.forkDepth % 2 == 0) ? 1 : -1,
						offset = Math.ceil(this.forkDepth/2) * direction;

					// Increment fork depth
					this.forkDepth++;

					// Fetch target line
					var targetLine = this.grid.getClearLine( this.x, this.y + offset, (direction < 0) );
					return targetLine.stackNode(node);


				}

			}







		/**
		 * Representation of the machine diagram
		 */
		var MachineDiagram = function(host) {
			this.lines = [];
			this.links = [];
			this.lineMin = 0;
			window.md = this;

			// Grid
			this.grid = new Grid();

			// Build internal structures
			this.host = host;
			this.iconsHost = $('<div class="icons"></div>');
			this.focusHost = $('<div class="focus"></div>');
			host.append(this.iconsHost);
			host.append(this.focusHost);

		}

		/** 
		 * Return the grid line where this node belongs
		 */
		MachineDiagram.prototype.getLine = function(node) {
			var l = this.lines[node.y];

			// If such line does not exist, allocate new
			if (l === undefined) {
				l = new MachineDiagramLine(this, node);
				this.lines[node.y] = l;
			}

			return l;
		}

		/**
		 * Define the layout object
		 */
		MachineDiagram.prototype.setLayout = function(layout) {

			// -- DEL --
			this.collapse = [];
			this.links = [];

			// Reset objects
			this.objects = layout;
			this.objectByID = {};
			this.lines = [];
			this.focusNode = null;
			this.rootNode = null;

			// Create reference-by-id information
			var firstNode = null;
			for (var i=0; i<layout.length; i++) {
				var o = layout[i];

				// Keep reference to the first node
				if (!firstNode)
					firstNode = o;

				// Check if this is the root node
				if (!o.parent)
					this.rootNode = o;

				// Populate required (missing) fields
				o.visible = (o.visible == undefined) ? true : o.visible;
				o.children = [];

				// Build DOM element
				var elmHost = $('<div class="icon"></div>'),
					elmA = $('<a></a>'),
					elmDiv = $('<div></div>');

				// Nest children
				elmHost.append(elmA);
				elmHost.append(elmDiv);
				elmA.attr("title", 	o['title']);
				elmA.attr("href",  'about:'+o['id']);
				elmA.addClass(		o['icon']);
				elmDiv.html(		o['short']);

				// Check for inverted class
				if (o['invert'])
					elmA.addClass('invert');

				// Store element
				o.element = elmHost;
				if (!o.visible)
					elmHost.hide();

				// Store on DOM
				this.iconsHost.append(elmHost);

				// Store on objectByID reference list
				this.objectByID[o['id']] = o;

				/*
				if ((o['parent'] !== undefined) && (!o['parent'])) {

					// Find rootNode element
					this.rootNode = o;
					o.x = 0;
					o.y = 0;

					// Create first line
					this.getLine(o);
				} else {

					// Fetch parent node (or create new one if missing)
					var p = this.objectByID[o['parent']],
						parentLine = this.getLine(p);

					// Fork from the parentn line (or keep the same if empty) 
					// and stack the element there
					var line = parentLine.fork(p);
					line.stack( o );

					// Store collapse information
					var collapsed = false;
					if (o['to'] != undefined) {

						// Store object on collpase
						if (this.collapse[o['to']] == undefined)
							this.collapse[o['to']] = [];
						this.collapse[o['to']].push(o);

						// If such collapse target already exists,
						// collapse line now
						if (this.objectByID[o['to']] != undefined) {
							collapsed = true;

							// Collapse current line towards target
							line.collapseTowards( this.objectByID[o['to']] );
						}
					}

					// If this was a collapse target, handle collapse now
					if (!collapsed) {
						if (this.collapse[o['id']] != undefined) {
							var collapseItems = this.collapse[o['id']];
							for (var j=0; j<collapseItems.length; j++) {
								var co = collapseItems[j],
									collapseLine = this.getLine(co);

								// Collapse given line towards us
								collapseLine.collapseTowards(o);
							}

						}
					}
				}
				*/

			}

			// If we don't have root node, pick the first
			if (!this.rootNode)
				this.rootNode = this.firstNode;

			// Parse nodes a second time, building the linked-list and
			// the point-to-point link information
			for (var i=0; i<layout.length; i++) {
				var o = layout[i];

				// Skip root node
				if (o == this.rootNode)
					continue;

				// Place child on the parent
				var p = this.objectByID[o['parent']];
				p.children.push(o);

				// Create the DOM element for the link
				var elm = $('<div class="line"></div>');
				this.iconsHost.append(elm);

				// Place point-to-point link
				this.links.push({
						'from' : p,
						   'to': o,
					  'collapse': false,
					  'element': elm
					});

				// If this node has a 'to' attribute,
				// add the collapsing link information
				if (o['to'] != undefined) {

					// Create the DOM element for the link
					var elm = $('<div class="line"></div>');
					this.iconsHost.append(elm);

					// Place point-to-point direct(false) link
					this.links.push({
							'from' : o,
							   'to': this.objectByID[o['to']],
						  'collapse': true,
						  'element': elm
						});

				}

			}

			// Rebuild index
			this.rebuildIndex();

			// Update DOM
			this.updateDOM();

		}

		/**
		 * Populate the position information for the elements on the grid
		 */
		MachineDiagram.prototype.rebuildIndex = function() {

			// Recursive function for building the tree
			var placeChildren = function( line, node ) {

				// Step forward if node is visible
				if (node.visible)
					line.forward();

				// First align children
				var lines = [];
				for (var i=0; i<node.children.length; i++) {
					if (node.children[i].visible)
						lines.push( line.stackNode(node.children[i]) );
					else {
						lines.push( line );
					}
				}

				// THEN nest further
				for (var i=0; i<node.children.length; i++) {
					placeChildren( lines[i], node.children[i] );
				}

			}

			// Reset grid
			this.grid.clear();

			// Place root node
			var line0 = this.grid.getFirstLine();
			line0.stackNode( this.rootNode ); // Auto forward

			// Build tree, starting with root node on column 0, line 0, 
			placeChildren( line0, this.rootNode );

			// Normalize the coordinates
			this.grid.normalize();


		};

		MachineDiagram.prototype.updateDOM = function() {

			// Spacing information
			var xSpacing = 64,
				ySpacing = 84,
				xLine = 20;

			for (var i=0; i<this.objects.length; i++) {
				var o = this.objects[i];

				// Move element
				o.element.css({
					left: (xSpacing+xLine) * o.x,
					top: ySpacing * (o.y+Math.abs(this.lineMin))
				});

				// Crossfade transition
				if (o.visible) {
					o.element.fadeIn();
				} else {
					o.element.fadeOut();
				}

			}


			// Using the visualization information from before, build
			// the DOM components.
			for (var i=0; i<this.links.length; i++) {
				var l =this.links[i],
					x1 = (xSpacing+xLine) * l.from.x,
					y1 = ySpacing * (l.from.y - this.lineMin),
					x2 = (xSpacing+xLine) * l.to.x,
					y2 = ySpacing * (l.to.y - this.lineMin),
					mode = LINE_STRAIGHT;

				// Check line link mode
				if (l.from.y != l.to.y) {
					if (l.collapse) {
						mode = LINE_COLLAPSE;
					} else {
						mode = LINE_BRANCH;
					}
				}

				// Fetch and prepare DOM element
				var elm = l.element
						   .removeClass()
						   .addClass("line");

				// Handle alignment
				if (mode == LINE_STRAIGHT) {
					elm.addClass("pos-straight");
					elm.css({
						'left': x1 + xSpacing,
						'width': x2-x1 - xSpacing,
						'height': 0,
						'top': y1 + ySpacing/4
					});

				} else if (mode == LINE_BRANCH) {
					elm.addClass("pos-branch");
					if (y2 > y1) {
						elm.addClass('pos-down');
						elm.css({
							'left': x1 + xSpacing/2,
							'top': y1 + ySpacing,
							'height': y2-y1 - ySpacing*3/4, 
							'width': x2-x1 - xSpacing/2 - 5,
						});
					} else {
						elm.css({
							'left': x1 + xSpacing/2,
							'top': y2 + ySpacing/4,
							'height': y1-y2 - ySpacing/2 + 5, 
							'width': x2-x1 - xSpacing/2 - 5,
						});
					}

				} else if (mode == LINE_COLLAPSE) {
					elm.addClass("pos-collapse");
					if (y2 > y1) {
						elm.addClass('pos-down');
						elm.css({
							'left': x1 + xSpacing,
							'top': y1 + ySpacing/4,
							'height': y2-y1 - ySpacing/2 + 5,
							'width': x2-x1 - xSpacing/2 - 5,
						});
					} else {
						elm.css({
							'left': x1 + xSpacing,
							'top': y1,
							'height': y1-y2 - ySpacing*3/4, 
							'width': x2-x1 - xSpacing/2 - 5,
						});
					}

				}

				// Check for visible/invisible/faded states
				if (l.from.visible && l.to.visible) {
					elm.fadeIn();
				} else if (!l.from.visible && !l.to.visible) {
					elm.fadeOut();
				} else {
					if (mode == LINE_STRAIGHT) {
						elm.fadeIn();
						elm.addClass("dashed");
					} else {
						elm.fadeOut();
					}
				}

			}

		}


		MachineDiagram.prototype.rebuildDOM = function() {

			// Spacing information
			var xSpacing = 64,
				ySpacing = 84,
				xLine = 20;

			// Empty container
			this.iconsHost.empty();

			// Using the visualization information from befure, build
			// the DOM components.
			for (var i=0; i<this.objects.length; i++) {
				var o = this.objects[i],
					elmHost = $('<div class="icon"></div>'),
					elmA = $('<a></a>'),
					elmDiv = $('<div></div>');

				// Nest children
				elmHost.append(elmA);
				elmHost.append(elmDiv);
				elmA.attr("title", o['title']);
				elmA.attr("href", 'about:'+o['id']);
				elmA.addClass(o['icon']);
				elmDiv.html(o['short']);

				// Check for inverted
				if (o['invert'])
					elmA.addClass('invert');

				// Keep reference
				o.element = elmHost;

				elmHost.css({
					left: (xSpacing+xLine) * o.x,
					top: ySpacing * (o.y+Math.abs(this.lineMin))
				});
				this.iconsHost.append(elmHost);

			}

			// Using the visualization information from before, build
			// the DOM components.
			for (var i=0; i<this.links.length; i++) {
				var l =this.links[i],
					x1 = (xSpacing+xLine) * l[0].x,
					y1 = ySpacing * (l[0].y - this.lineMin),
					x2 = (xSpacing+xLine) * l[1].x,
					y2 = ySpacing * (l[1].y - this.lineMin),
					mode = LINE_STRAIGHT;

				// Check line link mode
				if (y1 != y2) {
					if (l[2]) {
						mode = LINE_COLLAPSE;
					} else {
						mode = LINE_BRANCH;
					}
				}

				if (mode == LINE_STRAIGHT) {

					var elm = $('<div></div>');
					elm.addClass("line");
					elm.addClass("pos-straight");
					elm.css({
						'left': x1 + xSpacing,
						'width': x2-x1 - xSpacing,
						'top': y1 + ySpacing/4
					});
					l.elm = elm;
					this.iconsHost.append(elm);

				} else if (mode == LINE_BRANCH) {

					var elm = $('<div></div>');
					elm.addClass("line");
					elm.addClass("pos-branch");
					if (y2 > y1) {
						elm.addClass('pos-down');
						elm.css({
							'left': x1 + xSpacing/2,
							'top': y1 + ySpacing,
							'height': y2-y1 - ySpacing*3/4, 
							'width': x2-x1 - xSpacing/2 - 5,
						});
					} else {
						elm.css({
							'left': x1 + xSpacing/2,
							'top': y2 + ySpacing/4,
							'height': y1-y2 - ySpacing/2 + 5, 
							'width': x2-x1 - xSpacing/2 - 5,
						});
					}
					l.elm = elm;
					this.iconsHost.append(elm);

				} else if (mode == LINE_COLLAPSE) {

					var elm = $('<div></div>');
					elm.addClass("line");
					elm.addClass("pos-collapse");
					if (y2 > y1) {
						elm.addClass('pos-down');
						elm.css({
							'left': x1 + xSpacing,
							'top': y1 + ySpacing/4,
							'height': y2-y1 - ySpacing/2 + 5,
							'width': x2-x1 - xSpacing/2 - 5,
						});
					} else {
						elm.css({
							'left': x1 + xSpacing,
							'top': y1,
							'height': y1-y2 - ySpacing*3/4, 
							'width': x2-x1 - xSpacing/2 - 5,
						});
					}
					l.elm = elm;
					this.iconsHost.append(elm);

				}
			}

		}

		MachineDiagram.prototype.setState = function(state) {

		}

		MachineDiagram.prototype.update = function() {
		}


		return MachineDiagram;

	}

);