
define(["jquery"], 

	function($) {

		var LINE_STRAIGHT = 0,
			LINE_BRANCH = 1,
			LINE_COLLAPSE = 2;

		var MachineDiagramLine = function(parent, node, y, x) {
			this.parent = parent;
			this.lastElement = null;
			this.forkSource = node;
			this.x = node.x || x || 0;
			this.y = node.y || y || 0;

			/**
			 * Stack an object in the line
			 */
			this.stack = function(o) {
				o.y = this.y;
				o.x = ++this.x;

				if (this.lastElement == null) {
					this.parent.links.push({
						'from': this.forkSource,
						'to': o,
						'mode': (this.forkSource.y == o.y) ? LINE_STRAIGHT : LINE_BRANCH,
					});
				} else {
					this.parent.links.push({
						'from': this.lastElement,
						'to': o,
						'mode': LINE_STRAIGHT,
					});
				}
				this.lastElement = o;

			}

			/**
			 * Collapse line towards the specified node
			 */
			this.collapseTowards = function(o) {
				this.parent.links.push({
					'from': this.lastElement,
					'to': o,
					'mode': LINE_COLLAPSE,
				});
				this.parent.lines[this.y] = undefined;
			}

			/**
			 * Fork towards a new line
			 */
			this.fork = function( forkNode ) {
				forkNode.forks = forkNode.forks || 0;

				if ((++forkNode.forks) == 1) {
					return this;

				} else {

					// Start up-down scanning until we get a free line
					var i = this.y, c = 0, sp = 0;
					while (this.parent.lines[i] != undefined) {
						c++;

						sp = Math.ceil( c / 2 );
						if (c % 2 == 1) {
							i = this.y + sp;
						} else {
							i = this.y - sp;
						}
					}

					// Update negative index for offseting in the end
					if (i < this.parent.lineMin)
						this.parent.lineMin = i;

					// Return a line on these coordinates
					var l = new MachineDiagramLine(parent, forkNode, i, forkNode.x+1);
					this.parent.lines[i] = l;
					return l;

				}
			}

		}

		var MachineDiagram = function(host) {
			this.lines = [];
			this.links = [];
			this.lineMin = 0;
			this.host = host;
			window.md = this;
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

		MachineDiagram.prototype.setLayout = function(layout) {

			// Reset objects
			this.objects = {};
			this.collapse = [];
			this.lines = [];
			this.links = [];
			this.rootNode = null;

			// Traverse layout information and prepare visualization info
			for (var i=0; i<layout.length; i++) {
				var o = layout[i];
				this.objects[o['id']] = o;

				if ((o['parent'] !== undefined) && (!o['parent'])) {

					// Find rootNode element
					this.rootNode = o;
					o.x = 0;
					o.y = 0;

					// Create first line
					this.getLine(o);

				} else {

					// Fetch parent node (or create new one if missing)
					var p = this.objects[o['parent']],
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
						if (this.objects[o['to']] != undefined) {
							collapsed = true;

							// Collapse current line towards target
							line.collapseTowards( this.objects[o['to']] );
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

			}

			// Spacing information
			var xSpacing = 64,
				ySpacing = 84,
				xLine = 20;

			// Using the visualization information from befure, build
			// the DOM components.
			for (var i=0; i<layout.length; i++) {
				var o = layout[i],
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

				elmHost.css({
					left: (xSpacing+xLine) * o.x,
					top: ySpacing * (o.y+Math.abs(this.lineMin))
				});
				this.host.append(elmHost);

			}

			// Using the visualization information from befure, build
			// the DOM components.
			for (var i=0; i<this.links.length; i++) {
				var l =this.links[i],
					x1 = (xSpacing+xLine) * l.from.x,
					y1 = ySpacing * (l.from.y - this.lineMin),
					x2 = (xSpacing+xLine) * l.to.x,
					y2 = ySpacing * (l.to.y - this.lineMin);

				if (l.mode == LINE_STRAIGHT) {

					var elm = $('<div></div>');
					elm.addClass("line");
					elm.addClass("pos-straight");
					elm.css({
						'left': x1 + xSpacing,
						'width': x2-x1 - xSpacing,
						'top': y1 + ySpacing/4
					});
					l.elm = elm;
					this.host.append(elm);

				} else if (l.mode == LINE_BRANCH) {

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
					this.host.append(elm);

				} else if (l.mode == LINE_COLLAPSE) {

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
					this.host.append(elm);

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