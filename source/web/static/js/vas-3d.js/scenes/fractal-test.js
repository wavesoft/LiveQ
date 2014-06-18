
define(["three", "three-extras"],

	function(THREE, THREEx) {

		var Scene = {};

		var s = 250, h = 150, fBr = 80, f0r = 20, f1r = 5;

		Scene.config = {

			// Sphere sizes
			rA: fBr,
			rB: f0r,
			rC: f1r,

			// Anchor points in the animation
			p1:  [ -3*s, 		 0 		],	// Initial position
			p2:  [ -2*s, 		 0 		],	// First split
			p3:  [ -2*s+f0r/2, 	 f0r/2 	],  // \_ First particle
			p4:  [ -2*s+f0r/2, 	-f0r/2 	],  // \_ Second particle
			p5:  [ -s, 			 h/2 	],  //     \_ First particle rest
			p6:  [ -s, 			-h/2 	],  // Second split
			p7:  [ -s+f1r, 		-h/2 	],  // \_ First particle
			p8:  [ -s,			-h/2-f1r],  // \_ Second particle
			p9:  [ -s/2,		-h 		],  //     \_ Second particle rest
			p10: [ -f1r/2,		0 		],  // Final position

			p20: [  f1r/2, 		 0 	 	],	// Next group final position
			p21: [  s, 			-h/2 	],	// Next group first particle rest
			p22: [  s/2, 		 h 		],	// Next group second particle rest
			p23: [  2*s, 		 0 	 	],	// Next group first split
			p24: [  s, 		 	 h/2 	],	// Next group second split
			p25: [  3*s,		 0 		],	// Next group source position


		};

		Scene.getDefinitions = function(Cfg) {
			return {
				"THREE": 				"three", 
				"THREEx": 				"three-extras",
				"FeymanDiagram": 		"vas-3d/util/feyman",
				"FluctuationSprite": 	"vas-3d/util/fluctuation-sprite",
				"HazeSprite": 			"vas-3d/util/haze-sprite",
			};
		}

		Scene.getMaps = function(Cfg,Def){ 
			return {
				'particles': {
					src: 'static/img/sprites.png',
					sprites: [4,4]
				},
				'fluxes': {
					src: 'static/img/particle-skins.png',
					sprites: [2,2]
				},
				'fluc-glow': {
					src: "static/img/star-blue-purple-glow.png"
				},
				'fluc-particle': {
					src: "static/img/particle-03.png"
				},
				'backflux': {
					src: "static/img/yellow_glow.png"
				},
				'fluxskin01': {
					src: "static/img/skin01.png"
				},
				'fluxskin02': {
					src: "static/img/skin02.png"
				},
				'partHazeNoise': {
					src: "static/img/particle-noise.jpg"
				},
				'partHazeMask': {
					src: "static/img/particle-mask.jpg"
				},
				'partHazeDiffuse': {
					src: "static/img/particle-03.png"
				}
			}
		};

		Scene.getMaterials = function(Cfg,Def,Map){ 
			return {
				'partA0': new Def.THREE.SpriteMaterial({
					map: Map.get('particles', 0, 3),
					color: 0xffffff,
					fog: true,
					transparent: true
				}),
				'partB0': new Def.THREE.SpriteMaterial({
					map: Map.get('particles', 2, 3),
					color: 0xffffff,
					fog: true,
					transparent: true
				}),
				'partB1': new Def.THREE.SpriteMaterial({
					map: Map.get('particles', 2, 2),
					color: 0xffffff,
					fog: true,
					transparent: true
				}),
				'partC0': new Def.THREE.SpriteMaterial({
					map: Map.get('particles', 1, 2),
					color: 0xffffff,
					fog: true,
					transparent: true
				}),
				'partC1': new Def.THREE.SpriteMaterial({
					map: Map.get('particles', 0, 3),
					color: 0xffffff,
					fog: true,
					transparent: true
				}),
				'backflux0': new Def.THREE.MeshBasicMaterial({
					map: Map.get('fluxes', 0, 1),
					color: 0xffffff,
					fog: true,
					transparent: true,
				})
			}
		};

		Scene.getGeometries = function(Cfg,Def){ 
			return {
			}
		};

		Scene.getObjects = function(Cfg,Def,Map,Mat,Geom){ 
			return {
				'grid': {
					create: function() {
						var grid = new Def.THREE.GridHelper( 10000, 250 );
						grid.position.y = -400;
						return grid;
					}
				},
				'feyman0': {
					create: function() {
						var fd = new Def.FeymanDiagram();
						fd.position.z = -10;

						// Prepare kinks
						fd.k0 =    fd.addKink( Cfg.p1[0],  Cfg.p1[1]  ),
						fd.k1 = fd.k0.addKink( Cfg.p2[0],  Cfg.p2[1]  ),
						fd.k2 = fd.k1.addKink( Cfg.p6[0],  Cfg.p6[1]  ),
						fd.k3 = fd.k1.addKink( Cfg.p5[0],  Cfg.p5[1]  ),
						fd.k4 = fd.k2.addKink( Cfg.p9[0],  Cfg.p9[1]  ),
						fd.k5 = fd.k2.addKink( Cfg.p10[0], Cfg.p10[1] );

						return fd;
					},
					bind: {
						'feyman0.a': function(e,v) { e.material.opacity = v; },
					},
					update: function(e, delta) {
						e.update();
					}
				},
				'feyman1': {
					create: function() {
						var fd = new Def.FeymanDiagram();
						fd.position.z = -10;

						// Prepare kinks
						fd.k0 =    fd.addKink( Cfg.p25[0],  Cfg.p25[1]  ),
						fd.k1 = fd.k0.addKink( Cfg.p23[0],  Cfg.p23[1]  ),
						fd.k2 = fd.k1.addKink( Cfg.p24[0],  Cfg.p24[1]  ),
						fd.k3 = fd.k1.addKink( Cfg.p21[0],  Cfg.p21[1]  ),
						fd.k4 = fd.k2.addKink( Cfg.p22[0],  Cfg.p22[1]  ),
						fd.k5 = fd.k2.addKink( Cfg.p20[0], Cfg.p20[1] );

						return fd;
					},
					bind: {
						'feyman1.a': function(e,v) { e.material.opacity = v; },
					},
					update: function(e, delta) {
						e.update();
					}
				},
				/*
				'backflux0': {
					create: function() {
						var p = new Def.THREE.Mesh(
							new Def.THREE.PlaneGeometry(1,1),
							Mat.get('backflux0')
						);

						// Get the two point vectors
						p.p1 = new THREE.Vector3(0,0,-100);
						p.p2 = new THREE.Vector3(0,0,-100);

						// Rescale
						p.rescale = function() {
							var horiz = this.p2.clone().sub(this.p1),
								center = this.p2.clone().add(this.p1).divideScalar(2),
								diameter = horiz.length();

							this.position.copy(center);
							this.scale.set(
									diameter, diameter, diameter
								);
						}

						return p;

					},
					bind: {
						'backflux0.p1.x': function(e,v) { e.p1.setX(v-20); e.rescale(); },
						'backflux0.p1.y': function(e,v) { e.p1.setY(v); e.rescale(); },
						'backflux0.p2.x': function(e,v) { e.p2.setX(v+100); e.rescale(); },
						'backflux0.p2.y': function(e,v) { e.p2.setY(v); e.rescale(); },
						'backflux0.a': function(e,v) { e.material.opacity = v; }
					}
				},
				*/
				'backflux0': {
					create: function() {
						var p = new Def.HazeSprite({
							mapDiffuse: Map.get("partHazeDiffuse"),
							mapNoise: Map.get("partHazeNoise"),
							mapMask: Map.get("partHazeMask")
						});

						// Get the two point vectors
						p.p1 = new THREE.Vector3(0,0,-100);
						p.p2 = new THREE.Vector3(0,0,-100);

						// Rescale
						p.rescale = function() {
							var horiz = this.p2.clone().sub(this.p1),
								center = this.p2.clone().add(this.p1).divideScalar(2),
								diameter = horiz.length();

							this.position.copy(center);
							this.scale.set(
									diameter, diameter, diameter
								);
						}

						p.t=0;
						return p;

					},
					update: function(p, delta) {
						p.setPhase( p.t += delta/10000 );
					},
					bind: {
						'backflux0.p1.x': function(e,v) { e.p1.setX(v-20); e.rescale(); },
						'backflux0.p1.y': function(e,v) { e.p1.setY(v); e.rescale(); },
						'backflux0.p2.x': function(e,v) { e.p2.setX(v+100); e.rescale(); },
						'backflux0.p2.y': function(e,v) { e.p2.setY(v); e.rescale(); },
						'backflux0.a': function(e,v) { e.setOpacity(v); }
					}
				},
				'backflux1': {
					create: function() {
						var p = new Def.HazeSprite({
							mapDiffuse: Map.get("partHazeDiffuse"),
							mapNoise: Map.get("partHazeNoise"),
							mapMask: Map.get("partHazeMask")
						});

						// Get the two point vectors
						p.p1 = new THREE.Vector3(0,0,-100);
						p.p2 = new THREE.Vector3(0,0,-100);

						// Rescale
						p.rescale = function() {
							var horiz = this.p2.clone().sub(this.p1),
								center = this.p2.clone().add(this.p1).divideScalar(2),
								diameter = horiz.length();

							this.position.copy(center);
							this.scale.set(
									diameter, diameter, diameter
								);
						}

						p.t=0;
						return p;

					},
					update: function(p, delta) {
						p.setPhase( p.t += delta/10000 );
					},
					bind: {
						'backflux1.p1.x': function(e,v) { e.p1.setX(v-20); e.rescale(); },
						'backflux1.p1.y': function(e,v) { e.p1.setY(v); e.rescale(); },
						'backflux1.p2.x': function(e,v) { e.p2.setX(v+100); e.rescale(); },
						'backflux1.p2.y': function(e,v) { e.p2.setY(v); e.rescale(); },
						'backflux1.a': function(e,v) { e.setOpacity(v); }
					}
				},				
				'flucA0': {
					create: function() {
						var p = new Def.FluctuationSprite({
							radius: Cfg.rA, mapSkin: Map.get('fluxskin01')
						});
						p.position.z = -5;
						p.setParticleAR( 1, Math.PI/4, 0.25 );
						p.setParticleAR( 2, -Math.PI/4, 0.25 );
						return p;						
					},
					bind: {
						'flucA0.x': function(e,v) { e.position.setX(v); },
						'flucA0.y': function(e,v) { e.position.setY(v); },
						'flucA0.a': function(e,v) { e.uniforms['fOpacity'].value = v; },
						'flucA0.p': function(e,v) { e.setPhase(v); },
						'flucA0.s': function(e,v) { e.uniforms['scale'].value.set(v,v); },
					}
				},
				'flucB1': {
					create: function() {
						var p = new Def.FluctuationSprite({
							radius: Cfg.rB, mapSkin: Map.get('fluxskin02')
						});
						p.position.z = -5;
						p.setParticleAR( 1, 0, 0.25 );
						p.setParticleAR( 2, -Math.PI/2, 0.25 );
						return p;						
					},
					bind: {
						'flucB1.x': function(e,v) { e.position.setX(v); },
						'flucB1.y': function(e,v) { e.position.setY(v); },
						'flucB1.a': function(e,v) { e.uniforms['fOpacity'].value = v; },
						'flucB1.p': function(e,v) { e.setPhase(v); },
						'flucB1.s': function(e,v) { e.uniforms['scale'].value.set(v,v); },
					}
				},
				'partA0': {
					create: function() {
						var p = new Def.THREE.Sprite( Mat.get('partA0') );
						p.scale.set(Cfg.rA,Cfg.rA,Cfg.rA);
						return p;
					},
					bind: {
						'partA0.x': function(e,v) { e.position.setX(v); },
						'partA0.y': function(e,v) { e.position.setY(v); },
						'partA0.a': function(e,v) { e.material.opacity = v; }
					}
				},
				'partB0': {
					create: function() {
						var p = new Def.THREE.Sprite( Mat.get('partB0') );
						p.scale.set(Cfg.rB,Cfg.rB,Cfg.rB);
						return p;
					},
					bind: {
						'partB0.x': function(e,v) { e.position.setX(v); },
						'partB0.y': function(e,v) { e.position.setY(v); },
						'partB0.a': function(e,v) { e.material.opacity = v; }
					}
				},
				'partB1': {
					create: function() {
						var p = new Def.THREE.Sprite( Mat.get('partB1') );
						p.scale.set(Cfg.rB,Cfg.rB,Cfg.rB);
						return p;
					},
					bind: {
						'partB1.x': function(e,v) { e.position.setX(v); },
						'partB1.y': function(e,v) { e.position.setY(v); },
						'partB1.a': function(e,v) { e.material.opacity = v; }
					}
				},
				'partC0': {
					create: function() {
						var p = new Def.THREE.Sprite( Mat.get('partC0') );
						p.scale.set(Cfg.rC,Cfg.rC,Cfg.rC);
						return p;
					},
					bind: {
						'partC0.x': function(e,v) { e.position.setX(v); },
						'partC0.y': function(e,v) { e.position.setY(v); },
						'partC0.a': function(e,v) { e.material.opacity = v; }
					}
				},				
				'partC1': {
					create: function() {
						var p = new Def.THREE.Sprite( Mat.get('partC1') );
						p.scale.set(Cfg.rC,Cfg.rC,Cfg.rC);
						return p;
					},
					bind: {
						'partC1.x': function(e,v) { e.position.setX(v); },
						'partC1.y': function(e,v) { e.position.setY(v); },
						'partC1.a': function(e,v) { e.material.opacity = v; }
					}
				}
			}
		};

		Scene.getTimeline = function(C) {
			return {

				// Defaults for all objects
				'defaults': {
					'backflux0.a': 0,
					'backflux0.p1.x': C.p1[0],
					'backflux0.p1.y': C.p1[1],
					'backflux0.p2.x': C.p2[0],
					'backflux0.p2.y': C.p2[1],
					'backflux1.a': 0,
					'backflux1.p1.x': C.p20[0],
					'backflux1.p1.y': C.p20[1],
					'backflux1.p2.x': C.p25[0],
					'backflux1.p2.y': C.p25[1],
					'partA0.a': 0,
					'partB0.a': 0,
					'partB1.a': 0,
					'partC0.a': 0,
					'partC1.a': 0,
					'flucA0.a': 1,
					'flucA0.s': 1,
					'flucB1.a': 0,
					'flucB1.s': 1,
					'feyman0.a': 0,
					'feyman1.a': 0,
					'cam.x': 0,
					'cam.y': 0,
					'cam.z': 1800,
				},

				'tags': {

					'start': 	0.0,
					'split1': 	1.0,
					'split2': 	2.0,
					'final': 	3.0,
					'end': 		4.0

				},

				'keyframes': [

					// Backflux expansion
					[
						{
							p: 0.0,
							v: {
								'backflux0.p2.x': C.p1[0],
								'backflux0.p2.y': C.p1[1],
							}
						},
						{
							p: 3.0,
							v: {
								'backflux0.p2.x': C.p10[0],
								'backflux0.p2.y': C.p10[1],
							}
						}
					],

					// Camera flyout
					[
						{
							p: 0.0,
							v: {
								'camera.x': C.p1[0],
								'camera.y': C.p1[1],
								'camera.target.x': C.p1[0],
								'camera.target.y': C.p1[1],
								'camera.z': 1800,
								'camera.target.z': 0,
							},
							e: {
							}
						},
						{
							p: 1.0,
							v: {
								'camera.x': C.p2[0],
								'camera.y': C.p2[1],
								'camera.target.x': C.p2[0],
								'camera.target.y': C.p2[1],
								'camera.z': 200,
								'camera.target.z': 0,
							},
							e: {
							}
						},
						{
							p: 2.0,
							v: {
								'camera.x': C.p6[0],
								'camera.y': C.p6[1],
								'camera.target.x': C.p6[0],
								'camera.target.y': C.p6[1],
								'camera.z': 100,
								'camera.target.z': 0,
							},
							e: {
							}
						},
						{
							p: 3.0,
							v: {
								'camera.x': C.p10[0],
								'camera.y': C.p10[1],
								'camera.target.x': C.p10[0],
								'camera.target.y': C.p10[1],
								'camera.z': 50,
								'camera.target.z': 0,
							},
							e: {
								'camera.z': 'easeOutExpo'
							}
						},
						{
							p: 4.0,
							v: {
								'camera.x': C.p10[0],
								'camera.y': C.p10[1],
								'camera.target.x': C.p10[0],
								'camera.target.y': C.p10[1],
								'camera.z': 1800,
								'camera.target.z': 0,
							}
						},
					],

					// Crossfade of particle groups
					[
						{
							p: 0.0,
							v: {
								'partA0.a': 1,
								'flucA0.a': 0,
								'flucA0.p': 50,
							}
						},
						{
							p: 0.5,
							v: {
								'partA0.a': 0,
								'flucA0.a': 1,
								'flucA0.p': 25,
							}
						},
						{
							p: 1.0,
							v: {
								'backflux0.a': 0,
								'backflux1.a': 0,
								// ------------
								'flucA0.p': 0,
								'flucA0.a': 1,
								'flucA0.s': 1,
							}
						},
						{
							p: 1.1,
							v: {
								'backflux0.a': 0.2,
								'backflux1.a': 0.2,
								// ------------
								'flucA0.p': -1,
								'flucA0.a': 0,
								'flucA0.s': 1,
								// ------------
								'flucB1.a': 0,
								'flucB1.s': 1,
								'flucB1.p': 50,
							}
						},
						{
							p: 1.5,
							v: {
								'backflux0.a': 1,
								'backflux1.a': 1,
								// ------------
								'flucA0.a': 0, // Fix
								'flucA0.s': 1, // Fix

								'flucB1.a': 1,
								'flucB1.s': 1,
								'flucB1.p': 25,
							}
						},
						{
							p: 2.0,
							v: {
								'flucB1.p': 0,
								'flucB1.s': 1,
								'flucB1.a': 1,
							}
						},
						{
							p: 2.1,
							v: {
								'flucB1.s': 1,
								'flucB1.a': 0,
								'flucB1.p': -1,
							}
						},
						{
							p: 3.0,
							v: {
								'flucB1.s': 1, // Fix
								'flucB1.a': 0, // Fix

								'feyman0.a': 0,
								'feyman1.a': 0,
							}
						},
						{
							p: 4.0,
							v: {
								'feyman0.a': 1,
								'feyman1.a': 1,
							}
						}
					],

					// Rapid animations
					[
						{
							p: 0.0,
							v: {
								'partB0.a': 0,
								'partB1.a': 0,
							}
						}, 
						{
							p: 0.8,
							v: {
								'partB0.a': 0,
								'partB1.a': 0,
							}
						}, 
						{
							p: 1.0,
							v: {
								'partB0.a': 1,
								'partB1.a': 1,
							}
						},
						{
							p: 1.8,
							v: {
								'partB0.a': 1,
								'partC0.a': 0,
								'partC1.a': 0,
							}
						}, {
							p: 2.0,
							v: {
								'partC0.a': 1,
								'partC1.a': 1,
							}
						}
					],

					// Position management
					[

						// [P0] Particle in the left-post position
						{
							p: 0.0,
							v: {

								'partA0.x': C.p1[0],
								'partA0.y': C.p1[1],

								'flucA0.x': C.p1[0],
								'flucA0.y': C.p1[1],

							}

						},

						// [P1] Particle fades out, fluctuation appears
						{
							p: 1.0,
							v: {

								'partA0.x': C.p2[0],
								'partA0.y': C.p2[1],

								'flucA0.x': C.p2[0],
								'flucA0.y': C.p2[1],

								'partB0.x': C.p3[0],
								'partB0.y': C.p3[1],

								'partB1.x': C.p4[0],
								'partB1.y': C.p4[1],

								'flucB1.x': C.p4[0],
								'flucB1.y': C.p4[1],

							}
						},

						// [P6] Particles split
						{
							p: 2.0,
							v: {

								'partB0.x': C.p5[0],
								'partB0.y': C.p5[1],

								'partB1.x': C.p6[0],
								'partB1.y': C.p6[1],

								'flucB1.x': C.p6[0],
								'flucB1.y': C.p6[1],

								'partC0.x': C.p7[0],
								'partC0.y': C.p7[1],

								'partC1.x': C.p8[0],
								'partC1.y': C.p8[1],

							}
						},

						// [P9] Second fluctiation goes aways
						{
							p: 3.0,
							v: {

								'partC0.x': C.p10[0],
								'partC0.y': C.p10[1],

								'partC1.x': C.p9[0],
								'partC1.y': C.p9[1],

							}
						},

					]

				]
			};

		}

		return Scene;

	}

);