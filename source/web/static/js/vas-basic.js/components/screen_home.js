
define(

	// Requirements
	["jquery", "d3", "core/ui", "core/config", "core/registry", "core/base/components"],

	/**
	 * Basic version of the home screen
	 *
	 * @exports basic/components/explain_screen
	 */
	function($, d3, UI, config, R,C) {

		/**
		 * Blank image payload
		 */
		var BLANK_IMAGE = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

		/**
		 * Darken color
		 */
		function darkenColor(hexColor) {
			var c = d3.rgb(hexColor);
			return c.darker();
		}

		/**
		 * Collision avoidance helper
		 */
		function collide_helper(node) {
			var r = node.radius + 26,
				nx1 = node.x - r,
				nx2 = node.x + r,
				ny1 = node.y - r,
				ny2 = node.y + r;
			return function(quad, x1, y1, x2, y2) {
				if (quad.point && (quad.point !== node)) {
					var x = node.x - quad.point.x,
						y = node.y - quad.point.y,
						l = Math.sqrt(x * x + y * y),
						r = node.radius + quad.point.radius;

					if (l < r) {
						l = (l - r) / l * .5;
						node.x -= x *= l;
						node.y -= y *= l;
						quad.point.x += x;
						quad.point.y += y;
					}
				}
				return x1 > nx2
				|| x2 < nx1
				|| y1 > ny2
				|| y2 < ny1;
			};
		}

		/**
		 * Utility function to build a home node
		 */
		function homeNode(sel) {

			// Update/Create circle
			var circle = sel.select("circle");
			if (circle.empty()) {
				circle = sel.append("circle")
						    .attr("class", "node");
			}
			circle
				.attr("r", function(d) { return d.radius; })
				.style("fill", function(d) { return d.color; })
				.style("stroke", function(d) { return darkenColor(d.color); })

			// Update/Create image
			var image = sel.select("image");
			if (image.empty()) {
				image = sel.append("image");
			}
			image.attr("width", 	function(d) { return d.radius*2 - 8; } )
				 .attr("height",  	function(d) { return d.radius*2 - 8; } )
				 .attr("transform",	function(d) { return "translate(-"+(d.radius-4)+",-"+(d.radius-4)+")"; } )
				 .attr("xlink:href",function(d) { return d.icon ? d.icon : BLANK_IMAGE; } )

			// Register mouse events
			var moTimer;
			sel.on('mouseover', function(d,i) {
				d3.select(this)
				  .select("circle")
				  .style("stroke-width", 5);

				clearTimeout(moTimer);
				moTimer = setTimeout((function() {
					UI.showPopup('widget.onscreen', this, function(hostDOM) {

						hostDOM.append($('<p>'+d.desc+'</p>'))

					}, {
						'offset-x' : 2*d.radius + 20,
						'offset-y' : d.radius,
						'color'    : '#2ECC71',
						'title'    : d.name
					});
				}).bind(this), 250);

			});
			sel.on('mouseout', function(d,i) {
				d3.select(this)
				  .select("circle")
				  .style("stroke-width", 3);
				clearTimeout(moTimer);
				moTimer = setTimeout(function() {
					UI.hidePopup();
				}, 100);
			});
			sel.on('click', function(d,i) {
				if (d.click) d.click();
			});

		}

		/**
		 * @class
		 * @classdesc The basic home screen
		 */
		var HomeScreen = function( hostDOM ) {
			C.HomeScreen.call(this, hostDOM);

			// Prepare host
			hostDOM.addClass("home");

			// Create a slpash backdrop
			this.backdropDOM = $('<div class="'+config.css['backdrop']+'"></div>');
			hostDOM.append(this.backdropDOM);
			this.backdrop = R.instanceComponent("backdrop.explain", this.backdropDOM);

			// Create foreground
			this.foregroundDOM = $('<div class="'+config.css['foreground']+'"></div>');
			hostDOM.append(this.foregroundDOM);

			// Create SVG host
			this.svg = d3.select(this.foregroundDOM[0])
						.append("svg")
						.attr("class", "dv-home");

			// Create a directed graph
			this.graph = {
				'nodes': [
					{
						'name'	: 'Introduction to the game',
						'desc'  : 'Learn about the Virtual Atom Smasher interface and purpose.',
						'icon'	: 'static/img/logo.png',
						'color'	: '#ECF0F1',
						'radius': 50,
						'click' : (function() {
							this.trigger("changeScreen", "screen.explain");
						}).bind(this)
					},
					{
						'name'	: 'Collision Elementary',
						'desc'  : 'Your first task to the world of particle physics! Collide two electron-electron beams!',
						'icon'	: 'static/img/level-icons/hard.png',
						'color' : '#2ECC71',
						'radius': 20,
						'click' : (function() {
							this.trigger("playLevel", 1);
						}).bind(this)
					}
				],
				'links': [
					{'source':1, 'target':0}
				]
			};

			/*
			var color = d3.scale.category20();
			this.foregroundDOM.click((function() {
				var i = this.graph.nodes.length,
					c = color(i),
					n = {'name': 'Node '+i, 'color':c, 'radius': 20},
					l1 = parseInt( Math.random() * i );

				this.graph.nodes.push(n);
				this.graph.links.push({ 'source':i,'target':l1,'value':1 });
				this.updateScene();

			}).bind(this))
			*/

			this.setupScene();
			this.updateScene();

		}
		HomeScreen.prototype = Object.create( C.HomeScreen.prototype );

		/**
		 * Regenerate the level graph
		 */
		HomeScreen.prototype.setupScene = function() {
			var color = d3.scale.category20();

			// Initialize force
			this.force = d3.layout.force()
				.linkDistance(function(d) {
					if ((d.source.index == 0) || (d.target.index == 0)) {
						return 100;
					} else {
						return 20;
					}
				})
				.gravity(0.4)
				.charge(-2000)
				.size([this.width, this.height]);

			// Setup links
			this.links = this.svg.selectAll(".link")
					.data(this.graph.links);
				// Enter
				this.links.enter().append("line")
					.attr("class", "link")
					.style("stroke", function(d) { darkenColor(d.source.color); })

			// Setup nodes
			this.nodes = this.svg.selectAll(".node")
					.data(this.graph.nodes);
				// Enter
				this.nodes.enter().append("g")
					.attr("class", "node")
					.call(homeNode)
					.call(this.force.drag);

			this.force.on("tick", (function() {

				var q = d3.geom.quadtree(this.graph.nodes),
					i = 0,
					n = this.graph.nodes.length;

				while (++i < n) {
					q.visit(collide_helper(this.graph.nodes[i]));
				}

				this.links
					.attr("x1", function(d) { return d.source.x; })
					.attr("y1", function(d) { return d.source.y; })
					.attr("x2", function(d) { return d.target.x; })
					.attr("y2", function(d) { return d.target.y; });

				this.nodes
					.attr("transform", function(d) {
						return "translate("+d.x+","+d.y+")";
					});

			  }).bind(this));

		}


		/**
		 * Regenerate the level graph
		 */
		HomeScreen.prototype.updateScene = function() {

			// Update force
			this.force
				.links(this.graph.links)
				.nodes(this.graph.nodes)
				.start();

			// Remove previous data
			this.links.remove();
			this.nodes.remove();

			// Update data
			this.links = this.svg.selectAll(".link")
				.data(this.graph.links);
				// Enter
				this.links.enter().append("line")
					.attr("class", "link")
					.style("stroke", function(d) { return darkenColor(d.source.color); })

			this.nodes = this.svg.selectAll(".node")
				.data(this.graph.nodes);
				// Enter
				this.nodes.enter().append("g")
					.attr("class", "node")
					.call(homeNode)
					.call(this.force.drag);


		}

		/**
		 * Forward HomeScreen events to our child components
		 */
		HomeScreen.prototype.onResize = function(w,h) {
			this.width = w;
			this.height = h;

			// Resize SVG
			this.svg.attr('width', w)
					.attr('height', h);

			// Resize force dimentions
			this.force.size([w,h]);

		}

		/**
		 * Pause fore before exiting
		 */
		HomeScreen.prototype.onHidden = function() {
			this.force.stop();
		}

		/**
		 * Update level status 
		 */
		HomeScreen.prototype.onWillShow = function(cb) {
			this.updateScene();
			cb();
		}


		// Register home screen
		R.registerComponent( "screen.home", HomeScreen, 1 );

	}

);
