
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

			// Tag visual aid if asked to do so
			sel.each(function(d,i) {
				if (d.tagAid)
					R.registerVisualAid(d.tagAid, $(this).find("image"), { "screen": "screen.home" });
			})

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

			// Prepare button host
			this.sideButtonHost = $('<div class="side-buttons"></div>').appendTo(this.foregroundDOM);

			// Prepare buttons
			this.btnActiveRunBtn = $('<div class="btn-round btn-darkblue"><span class="uicon uicon-gear"></span></div>').appendTo(this.sideButtonHost);
			this.btnActiveRunBtn.click((function(e){
				this.trigger('changeScreen', 'screen.running');
			}).bind(this));
			this.btnActiveRunBtn.hide();

			// Prepare buttons
			this.btbTest = $('<div class="btn-round btn-darkblue"><span class="uicon uicon-eye"></span></div>').appendTo(this.sideButtonHost);
			this.btbTest.click((function(e){
				this.trigger('test');
			}).bind(this));

			// Register visual aids
			R.registerVisualAid( "home.run", this.btnActiveRunBtn, { "screen": "screen.home" });

			// Create a directed graph
			this.graph = {
				'nodes': [
				],
				'links': [
				]
			};

			// Setup initial scene
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
			this.force.size([w,h])
					  .start();			

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

		/**
		 * When shown, show first-time aids
		 */
		HomeScreen.prototype.onShown = function() {
			UI.showFirstTimeAid( "home.begin" );
			UI.showFirstTimeAid( "home.firstBranch" );

			// Button helpers
			if (this.btnActiveRunBtn.is(":visible"))
				UI.showFirstTimeAid( "home.run" );
		}

		/**
		 * Topic information has updated 
		 */
		HomeScreen.prototype.onTopicTreeUpdated = function(tree) {

			// Deset graph and import links
			this.graph.nodes = [];
			this.graph.links = tree.links;

			// Color schemes to hex colors
			var color_sceme = {
				'green': '#2ECC71'
			};

			// Update graph with additional details required
			// by the d3 library to work
			for (var i=0; i<tree.nodes.length; i++) {
				var n = tree.nodes[i],
					d3_node = {
						'name'	: n.info.name || "",
						'desc'  : n.info.desc || "",
						'icon'	: n.info.icon || 'static/img/level-icons/hard.png',
						'color' : color_sceme[n.info.color || 'green'],
						'radius': 20,
						'click' : (function(record) {
							return function(e) {
								this.trigger("explainTopic", n['_id']);
							};
						})(n).bind(this)
					};
				this.graph.nodes.push(d3_node);
			}

			// Override root node icon/radius
			this.graph.nodes[0].radius = 50;
			this.graph.nodes[0].color = '#ECF0F1';
			this.graph.nodes[0].icon = 'static/img/logo.png';
			this.graph.nodes[0].tagAid = "home.begin";

			// Tag first branch if we have it
			if (this.graph.nodes.length > 1) 
				this.graph.nodes[1].tagAid = "home.firstBranch";

			// Regen UI
			this.updateScene();

		}

		/**
		 * Update running screen status
		 */
		HomeScreen.prototype.onStateChanged = function( stateID, stateValue ) {
			if (stateID == "simulating") {

				// Show/hide the simulating button
				if (stateValue) {
					this.btnActiveRunBtn.fadeIn();
				} else {
					this.btnActiveRunBtn.fadeOut();
				}
			}
		}

		// Register home screen
		R.registerComponent( "screen.home", HomeScreen, 1 );

	}

);
