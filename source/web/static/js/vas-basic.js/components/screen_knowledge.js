
define(

	// Requirements
	["jquery", "d3", "core/ui", "core/config", "core/registry", "core/base/components", "core/user" ],

	/**
	 * Basic version of the home screen
	 *
	 * @exports basic/components/explain_screen
	 */
	function($, d3, UI, config, R,C, User) {

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
				.style("opacity", function(d) { return d.opacity; })

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
					UI.showPopup('widget.onscreen', this,
						(function(hostDOM) {

							// Prepare the body
							var comBody = R.instanceComponent("infoblock.knowledge", hostDOM);
							if (comBody) {
								// Update infoblock 
								comBody.onMetaUpdate( d );
								// Adopt events from infoblock as ours
								d.eventDelegate.adoptEvents( comBody );
							} else {
								console.warn("Could not instantiate knowledge infoblock!");
							}

						}).bind(this),
						{
							'offset-x' : 2*d.radius + 20,
							'offset-y' : d.radius,
							'color'    : d.color,
							'title'    : (d.enabled ? "" : '<span class="glyphicon glyphicon-lock"></span> ' ) + d.info.title
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
		 * @classdesc The basic tuning screen
		 */
		var KnowledgeScreen = function( hostDOM ) {
			C.HomeScreen.call(this, hostDOM);

			// Prepare host
			hostDOM.addClass("knowledge");

			// Team header
			$('<h1><span class="highlight">Knowledge</span> Tree</h1><div class="subtitle">Expand your scientific knowledge from the science grid.</div>').appendTo(hostDOM);

			// ---------------------------------
			// Create splash backdrop
			// ---------------------------------

			// Create a slpash backdrop
			this.backdropDOM = $('<div class="'+config.css['backdrop']+'"></div>');
			hostDOM.append(this.backdropDOM);
			this.backdrop = R.instanceComponent("backdrop.explain", this.backdropDOM);

			// ---------------------------------
			// Create foreground DOM
			// ---------------------------------

			// Create foreground
			this.foregroundDOM = $('<div class="'+config.css['foreground']+'"></div>');
			hostDOM.append(this.foregroundDOM);

			// ---------------------------------
			// Create the SVG graph
			// ---------------------------------

			// Create SVG host
			this.svg = d3.select(this.foregroundDOM[0])
						.append("svg")
						.attr("class", "dv-home");

			// Prepare button host
			this.sideButtonHost = $('<div class="side-buttons"></div>').appendTo(this.foregroundDOM);

			// Prepare buttons
			this.btnActiveRunBtn = $('<div class="btn-round btn-red"><span class="uicon uicon-gear"></span></div>').appendTo(this.sideButtonHost);
			this.btnActiveRunBtn.click((function(e){
				this.trigger('changeScreen', 'screen.running');
			}).bind(this));
			this.btnActiveRunBtn.hide();

			// ---------------------------------
			// Register visual aids
			// ---------------------------------

			// Register visual aids
			R.registerVisualAid( "home.run", this.btnActiveRunBtn, { "screen": "screen.home" });

			// ---------------------------------
			// Initialize scene
			// ---------------------------------

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
		KnowledgeScreen.prototype = Object.create( C.HomeScreen.prototype );

		/**
		 * Regenerate the level graph
		 */
		KnowledgeScreen.prototype.setupScene = function() {
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
					.style("opacity", function(d) { return darkenColor(d.source.opacity); })
					.style("stroke", function(d) { return darkenColor(d.source.color); })

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
		KnowledgeScreen.prototype.updateScene = function() {

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
					.style("opacity", function(d) { return darkenColor(d.source.opacity); })
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
		 * Forward KnowledgeScreen events to our child components
		 */
		KnowledgeScreen.prototype.onResize = function(w,h) {
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
		KnowledgeScreen.prototype.onHidden = function() {
			this.force.stop();
		}

		/**
		 * Update level status 
		 */
		KnowledgeScreen.prototype.onWillShow = function(cb) {
			this.updateScene();
			cb();
		}

		/**
		 * When shown, show first-time aids
		 */
		KnowledgeScreen.prototype.onShown = function() {
			UI.showFirstTimeAid( "knowledgegrid.begin" );
			UI.showFirstTimeAid( "knowledgegrid.firstbranch" );
			UI.showFirstTimeAid( "knowledgegrid.undiscovered" );

			// Button helpers
			if (this.btnActiveRunBtn.is(":visible"))
				UI.showFirstTimeAid( "home.run" );

			// Check if user has not seen the intro tutorial
			if (!User.isFirstTimeSeen("tuning.intro")) {
				// Display the intro sequence
				UI.showTutorial("ui.tuning.new", function() {
					// Mark introduction sequence as shown
					User.markFirstTimeAsSeen("tuning.intro");
				});
			}

		}

		/**
		 * Topic information has updated 
		 */
		KnowledgeScreen.prototype.onTopicTreeUpdated = function(tree) {

			// Deset graph and import links
			this.graph.nodes = [];
			this.graph.links = tree.links;

			// Color schemes to hex colors
			var color_sceme = {
				'green': '#2ECC71',
				'gray' : '#999',
			};

			// Update graph with additional details required
			// by the d3 library to work
			var found_gray = false, found_branch = false;
			for (var i=0; i<tree.nodes.length; i++) {
				var n = tree.nodes[i],
					n_enabled = !!n.enabled;
				if (n.parent == null) n_enabled = true;
				var d3_node = {
						'id'		: n._id || "",
						'info'		: n.info || {},
						'enabled'	: n_enabled,
						'icon'		: config['images_url'] + "/" + (n.info.icon || 'level-icons/hard.png'),
						'color' 	: n.enabled ? color_sceme[n.info.color || 'green'] : color_sceme['gray'],
						'radius' 	: 20,
						'opacity' 	: (n.enabled ? 1.0 : 0.5),
						'click'  	: (function(record) {
							return function(e) {
								this.trigger("expandTopic", n['_id']);
							};
						})(n).bind(this),
						'eventDelegate' : this
					};

				// Tag the first gray node
				if (!d3_node.enabled && i>0 && !found_gray) {
					d3_node.tagAid = "knowledgegrid.undiscovered";
					found_gray = true;
				}

				// Tag the first branch
				if (d3_node.enabled && i>0 && !found_branch) {
					d3_node.tagAid = "knowledgegrid.firstbranch";
					found_branch = true;
				}

				this.graph.nodes.push(d3_node);
			}

			// Override root node icon/radius
			this.graph.nodes[0].radius = 50;
			this.graph.nodes[0].color = '#ECF0F1';
			this.graph.nodes[0].icon = 'static/img/logo.png';
			this.graph.nodes[0].tagAid = "knowledgegrid.begin";

			// Regen UI
			this.updateScene();

		}

		/**
		 * Update running screen status
		 */
		KnowledgeScreen.prototype.onStateChanged = function( stateID, stateValue ) {
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
		R.registerComponent( "screen.knowledge", KnowledgeScreen, 1 );

	}

);
