
define(

	[ "three", "three-extras", 
	  "core/util/animator", "core/registry", "core/components",
	  "vas-3d/util/fluctuation", "vas-3d/util/fluctuation-sprite", "vas-3d/util/feyman",
	  "vas-3d/scenes/fractal-test"
	], 

	function(THREE, THREEx, Animator, R, C, Fluctuation, FluctuationSprite, FeymanDiagram, FractalScene ) {


		var BLANK_IMAGE = "data:image/gif;base64,R0lGODlhQABAAIAAAP8A/////yH5BAEAAAEALAAAAABAAEAAAAJFhI+py+0Po5y02ouz3rz7D4biSJbmiabqyrbuC8fyTNf2jef6zvf+DwwKh8Si8YhMKpfMpvMJjUqn1Kr1is1qt9yuF1AAADs=";

		/**
		 * Map wrapper for obtaining image instances
		 */
		var MapWrapper = function(definition) {
			this.get = function( map, x, y ) {

				// If nothing is found, return error map
				if (definition[map] == undefined) {
					console.warn("Scene: Could not find map '"+map+"'");
					return THREE.ImageUtils.loadTexture(BLANK_IMAGE);
				}

				// Get info entry
				var e = definition[map],
					inst = THREE.ImageUtils.loadTexture( e.src );

				// Check for sliced map
				if (e.sprites !== undefined) {

					// Get scale
					var sx = 1/e.sprites[0], sy = 1/e.sprites[1];
					inst.repeat.set( sx, sy );

					// Apply offset
					var cx = x || 0, cy = y || 0;
					inst.offset.set( sx*cx, sy*cy );

				}

				return inst;

			}
		}

		/**
		 * Material wrapper for obtaining material instances
		 */
		var MatWrapper = function(definition) {
			this.get = function( mat ) {

				// If nothing is found, return error element
				if (definition[mat] == undefined) {
					console.warn("Scene: Could not find material '"+mat+"'");
					return new THREE.MeshBasicMaterial({ color: 0xff00ff, side: THREE.DoubleSide });
				}

				// Return info entry
				return definition[mat];

			}
		}

		/**
		 * Geometry wrapper for obtaining geometry instances
		 */
		var GeomWrapper = function(definition) {
			this.get = function( geom ) {

				// If nothing is found, return error geometry
				if (definition[geom] == undefined) {
					console.warn("Scene: Could not find geometry '"+geom+"'");
					return new THREE.SphereGeometry( 1.0 );
				}

				// Return info entry
				return definition[geom];

			}
		}

		var Engine = { };

		Engine.AutoScene = function( parent, sceneConfig ) {
			var self = this;
			this.mainScene = new THREE.Object3D();
			this.glowScene = new THREE.Object3D();

			this.camera = new THREE.Vector3(0,0,1800);
			this.cameraTarget = new THREE.Vector3(0,0,0);

			// Placeholder function until we have the objects ready
			this.update = function(delta) { };

			// Fetch global config
			var Cfg = sceneConfig.config || {};

			// Process definitions
			var defMap = sceneConfig.getDefinitions(Cfg),
				defArray = [], defNames = [];
			for (k in defMap) {
				defNames.push(k);
				defArray.push(defMap[k]);
			}

			// Don't do anything until we get the required objects
			requirejs( defArray,
				function() {

					// Bind definitions back to their names
					var Def = { },
						defRef = Array.prototype.slice.call(arguments);
					for (var i=0; i<defRef.length; i++) {
						Def[defNames[i]] = defRef[i];
					}

					// Prepare maps
					var Map = new MapWrapper( sceneConfig.getMaps(Cfg, Def) );

					// Prepare materials
					var Mat = new MatWrapper( sceneConfig.getMaterials(Cfg, Def, Map) );

					// Prepare geometries
					var Geom = new GeomWrapper( sceneConfig.getGeometries(Cfg, Def) );

					// Create animator
					var animatorRef = new Animator({
						duration: 10000,
						timeline: sceneConfig.getTimeline(Cfg)
					});

					// Bind camera to animator
					animatorRef.bind('camera.x', self.camera, 'x' );
					animatorRef.bind('camera.y', self.camera, 'y' );
					animatorRef.bind('camera.z', self.camera, 'z' );
					animatorRef.bind('camera.target.x', self.cameraTarget, 'x' );
					animatorRef.bind('camera.target.y', self.cameraTarget, 'y' );
					animatorRef.bind('camera.target.z', self.cameraTarget, 'z' );

					window.anim0 = animatorRef;

					// Prepare objects
					var Objects = sceneConfig.getObjects(Cfg, Def, Map, Mat, Geom),
						updateFunctions = [];
					for (k in Objects) {
						var o = Objects[k];
						if (typeof(o) == 'object') {

							// Create instance
							var obj = o.create();

							// Place on scene
							self.mainScene.add(obj);

							// Bind object properties to animator
							if (o['bind'] != undefined) {
								for (p in o.bind) {
									animatorRef.bind(
											p,
											(function(o,fn) {
												return function(v,c) {
													return fn(o,v,c);
												};
											})(obj,o.bind[p])
										);
								}
							}

							// Check if we should register
							// an update loop function
							if (o['update'] != undefined) {
								updateFunctions.push(
									(function(o,fn) {
										return function(delta) {
											return fn(o, delta)
										}
									})(obj,o.update)
								);
							}

						}

						// Replace the update function
						self.update = function(delta) {
							for (var i=0; i<updateFunctions.length; i++) { updateFunctions[i]( delta ); }
							animatorRef.update(delta);
						}

					}

				}
			);

		}


		Engine.Scene = function( parent ) {
			this.mainScene = new THREE.Object3D();
			this.glowScene = new THREE.Object3D();
			this.cameraFocus = new THREE.Vector3();

			// Prepare sprites
			var mat0 = new THREE.SpriteMaterial( { map: THREE.ImageUtils.loadTexture( "static/img/sprites.png" ), color: 0xffffff, fog: true, transparent: true } ),
				mat0 = new THREE.SpriteMaterial( { map: THREE.ImageUtils.loadTexture( "static/img/sprites.png" ), color: 0xffffff, fog: true, transparent: true } ),
				mat1 = new THREE.SpriteMaterial( { map: THREE.ImageUtils.loadTexture( "static/img/sprites.png" ), color: 0xffffff, fog: true, transparent: true } ),
				mat2 = new THREE.SpriteMaterial( { map: THREE.ImageUtils.loadTexture( "static/img/sprites.png" ), color: 0xffffff, fog: true, transparent: true } ),
				mat3 = new THREE.SpriteMaterial( { map: THREE.ImageUtils.loadTexture( "static/img/sprites.png" ), color: 0xffffff, fog: true, transparent: true } );
				mat4 = new THREE.SpriteMaterial( { map: THREE.ImageUtils.loadTexture( "static/img/sprites.png" ), color: 0xffffff, fog: true, transparent: true } );

			mat0.map.offset.set( 0, 0.75 );
			mat0.map.repeat.set( 0.25, 0.25 );
			mat1.map.offset.set( 0, 0.50 );
			mat1.map.repeat.set( 0.25, 0.25 );
			mat2.map.offset.set( 0.25, 0.75 );
			mat2.map.repeat.set( 0.25, 0.25 );
			mat3.map.offset.set( 0.25, 0.50 );
			mat3.map.repeat.set( 0.25, 0.25 );
			mat4.map.offset.set( 0, 0.75 );
			mat4.map.repeat.set( 0.25, 0.25 );

			var part0 = new THREE.Sprite( mat0 ),
				part1 = new THREE.Sprite( mat1 ),
				part4 = new THREE.Sprite( mat4 ),
				part2 = new THREE.Sprite( mat2 ),
				part3 = new THREE.Sprite( mat3 );

			part0.scale.set(80,80,80);
			part1.scale.set(50,50,50);
			part4.scale.set(50,50,50);
			part2.scale.set(30,30,30);
			part3.scale.set(30,30,30);

			window.part0 = part0;
			window.part1 = part1;
			window.part2 = part2;
			window.part3 = part3;
	
			/*
			// Prepare geometries
			var geom0 = new THREE.SphereGeometry(80, 10, 10),
				geom1 = new THREE.SphereGeometry(30, 10, 10),
				geom2 = new THREE.SphereGeometry(10, 10, 10),
				mat0 = new THREE.MeshPhongMaterial({
					color: 0xff0000,
					transparent: true,
					opacity: 1,
				}),
				mat1 = new THREE.MeshPhongMaterial({
					color: 0xffff00,
					transparent: true,
					opacity: 1,
				}),
				mat2 = new THREE.MeshPhongMaterial({
					color: 0xff00ff,
					transparent: true,
					opacity: 1,
				}),
				mat3 = new THREE.MeshPhongMaterial({
					color: 0x0000ff,
					transparent: true,
					opacity: 1,
				});

			// Build scene components
			var //part0 = new THREE.Mesh( geom0, mat0 ),
				part1 = new THREE.Mesh( geom1, mat1 ),
				part2 = new THREE.Mesh( geom2, mat2 ),
				part3 = new THREE.Mesh( geom2, mat3 );
				*/

			var //fluc0 = new Fluctuation({ radius: 80, blobs: 4, detail: 10 }),
				//fluc1 = new Fluctuation({ radius: 20, blobs: 4, detail: 10 });
				fluc0 = new FluctuationSprite({ radius: 50, lookat: parent.camera }), 
				fluc1 = new FluctuationSprite({ radius: 20, lookat: parent.camera });

			fluc0.position.z = -1;
			fluc0.setParticleAR( 1, Math.PI/4, 0.25 );
			fluc0.setParticleAR( 2, -Math.PI/4, 0.25 );

			fluc1.position.z = -1;
			fluc1.setParticleAR( 1, Math.PI/4, 0.25 );
			fluc1.setParticleAR( 2, -Math.PI/4, 0.25 );

			// Initialize animation
			var anim0 = new Animator({
				duration: 3000,
				timeline: FractalScene.timeline
			});

			// Create feyman diagram and build the kinks
			var feyman0 = new FeymanDiagram(),
				f0k0 = feyman0.addKink(),
				f0k1 = f0k0.addKink(),
				f0k2 = f0k1.addKink(),
				f0k3 = f0k1.addKink(),
				f0k4 = f0k2.addKink(),
				f0k5 = f0k2.addKink();

			// Addd
			var s = 400, h = 200;
			f0k0.set(-s*3,    0, 0);
			f0k1.set(-s*2,    0, 0);
			f0k2.set(-s,   -h/2, 0);
			f0k3.set(-s,    h/2, 0);
			f0k4.set(-s/2,   -h, 0);
			f0k5.set(   0,    0, 0);

			// Put everything on scene
			this.mainScene.add(fluc0);
			this.mainScene.add(fluc1);
			this.mainScene.add(part0);
			this.mainScene.add(part1);
			this.mainScene.add(part2);
			this.mainScene.add(part3);
			this.mainScene.add(part4);
			this.mainScene.add(feyman0);


			// Put a grid
			var grid = new THREE.GridHelper( 10000, 500 );
			grid.position.y = -400;
			this.mainScene.add(grid);

			// Bind properties to animator
			anim0.bind( 'part0.x', part0.position, 'x' );
			anim0.bind( 'part0.y', part0.position, 'y' );
			anim0.bind( 'part0.a', mat0, 'opacity' );
			//anim0.bind( 'part0.s', function(v,v){ part0.scale.set(v,v,v); });

			anim0.bind( 'part1.x', part1.position, 'x' );
			anim0.bind( 'part1.y', part1.position, 'y' );
			anim0.bind( 'part1.a', mat1, 'opacity' );
			anim0.bind( 'part1.s', function(v,v){ part1.scale.set(v,v,v); });

			anim0.bind( 'part2.x', part2.position, 'x' );
			anim0.bind( 'part2.y', part2.position, 'y' );
			anim0.bind( 'part2.a', mat2, 'opacity' );
			anim0.bind( 'part2.s', function(v,v){ part2.scale.set(v,v,v); });

			anim0.bind( 'part3.x', part3.position, 'x' );
			anim0.bind( 'part3.y', part3.position, 'y' );
			anim0.bind( 'part3.a', mat3, 'opacity' );
			anim0.bind( 'part3.s', function(v,v){ part3.scale.set(v,v,v); });

			anim0.bind( 'fluc0.x', fluc0.position, 'x' );
			anim0.bind( 'fluc0.y', fluc0.position, 'y' );
			//anim0.bind( 'fluc0.a', fluc0.material, 'opacity' );
			//anim0.bind( 'fluc0.s', function(v,c){ fluc0.scale.set(v,v,v); });
			anim0.bind( 'fluc0.a', fluc0.uniforms['fOpacity'], 'value' );
			anim0.bind( 'fluc0.p', function(v,c) { fluc0.setPhase(v); } );

			anim0.bind( 'fluc1.x', fluc1.position, 'x' );
			anim0.bind( 'fluc1.y', fluc1.position, 'y' );
			anim0.bind( 'fluc1.a', fluc1.material, 'opacity' );
			anim0.bind( 'fluc1.s', function(v,c){ fluc1.scale.set(v,v,v); });

			anim0.bind( 'cam.z',   this.cameraFocus, 'z');
			anim0.bind( 'cam.x',   this.cameraFocus, 'x');
			anim0.bind( 'cam.y',   this.cameraFocus, 'y');

			window.anim0 = anim0;
			anim0.setAnimationPos(0.0);

			var p = 0;
			this.update = function(delta) {
				anim0.update(delta);
				feyman0.update();
				//fluc0.setPhase(p);
				//fluc1.setPhase(p);
				p += 0.1;
			};

		};

		Engine.BasicScene = function() {
			this.mainScene = new THREE.Object3D();

			var flucRadius = 50;

			// Create cluctuation mesh
			var fluc = new Fluctuation( flucRadius, 4, 10 );
			this.mainScene.add(fluc);

			// Place the two balls
			var geom1 = new THREE.SphereGeometry(50, 10, 10),
				geom2 = new THREE.SphereGeometry(flucRadius, 10, 10),
				mat1 = new THREE.MeshPhongMaterial({
					color: 0xff0000,
					transparent: true,
					opacity: 1
				}),
				mat2 = new THREE.MeshPhongMaterial({
					color: 0xffff00,
					transparent: true,
					opacity: 1
				}),
				mat0 = new THREE.MeshPhongMaterial({
					color: 0xffff00,
					transparent: true,
					opacity: 0.2
				});

			// Setup scene
			this.m1 = new THREE.Mesh(geom1, mat1);
			this.m2 = new THREE.Mesh(geom1, mat2);
			this.m3 = new THREE.Mesh(geom2, mat0);
			this.mainScene.add(this.m1);
			this.mainScene.add(this.m2);
			//this.mainScene.add(this.m3);

			var dist = 200;
			this.m1.position.x = -dist;
			this.m2.position.x = dist;

			// Prepare some partons
			var geom2 = new THREE.SphereGeometry(10, 10, 10),
				mat3 = new THREE.MeshPhongMaterial({
					color: 0x00ff00,
				});


			// Update
			this.update = (function(delta) {

				/*
				dist -= dist/50.0;
				if (dist <= 50.0) {
					var alpha = dist / 50.0;
					mat1.opacity = alpha*0.9+0.1;
					mat1.needsUpdate = true;
					mat2.opacity = alpha*0.9+0.1;
					mat2.needsUpdate = true;

				}
				this.m1.position.x = -dist-50;
				this.m2.position.x = dist+50;
				*/

				//fluc.update(delta);
				fluc.regenerate();


			}).bind(this);

		}






		var Exp3DScreen = function( container ) {
			C.ExplainScreen.call(this, container);

			// Setup variables
			this.container = container;
			this.mouse = new THREE.Vector2();
			this.half = new THREE.Vector2();

			// ============================
			//  Initialize 3D System
			// ============================

			// Camera
			this.camera = new THREE.PerspectiveCamera( 20, 640/480, 1, 10000 );
			this.camera.position.z = 1800;

			// Scene
			this.mainScene = new THREE.Scene();
			this.glowScene = new THREE.Scene();

			// Initialize renderer
			this.renderer = new THREE.WebGLRenderer( { antialias: true } );
			this.renderer.setClearColor( 0xffffff );
			this.container.append(this.renderer.domElement);

			// Prepare composer
			this.renderer.autoClear = false;

			this.composer = new THREE.EffectComposer( this.renderer );

			this.renderGlow = new THREE.RenderPass( this.glowScene, this.camera );
			this.renderMain = new THREE.RenderPass( this.mainScene, this.camera );
			this.effectBloom = new THREE.BloomPass( 1.3 );

			this.effectFXAA = new THREE.ShaderPass( THREE.FXAAShader );
			this.effectCopyBlur = new THREE.ShaderPass( THREE.CopyShader );
			this.effectCopy = new THREE.ShaderPass( THREE.CopyShader );
			this.effectHBlur = new THREE.ShaderPass( THREE.HorizontalBlurShader );
			this.effectVBlur = new THREE.ShaderPass( THREE.VerticalBlurShader );
			this.effectBlend = new THREE.ShaderPass( THREE.BlendShader );


			this.renderGlow.clear = true;
			this.renderMain.clear = true;

			this.effectVBlur.needsSwap = false;
			this.effectCopy.renderToScreen = true;

			this.composer.addPass( this.renderGlow );
			this.composer.addPass( this.effectHBlur );
			this.composer.addPass( this.effectVBlur );

			this.composer.addPass( this.renderMain );
			this.composer.addPass( this.effectBlend );

			this.composer.addPass( this.effectFXAA );
			//this.composer.addPass( this.effectBloom );
			this.composer.addPass( this.effectCopy );

			// Lighting
			light = new THREE.DirectionalLight( 0xffffff );
			light.position.set( 0, 0, 1 );
			this.mainScene.add( light );

			// ============================
			//  Put some graphics 
			// ============================

			this.activeScene = new Engine.AutoScene( this, FractalScene ) //new Engine.Scene( this );
			this.mainScene.fog = new THREE.Fog( 0xffffff, 2000, 10000 );

			this.mainScene.add(this.activeScene.mainScene);
			this.glowScene.add(this.activeScene.glowScene)

			// ============================
			//  Bind mouse movement
			// ============================

			$(this.container).mousemove((function(e) {
				this.mouse.x = ( e.offsetX - this.half.x ) / this.half.x;
				this.mouse.y = ( e.offsetY - this.half.y ) / this.half.y;
			}).bind(this));


			// ============================
			// Setup animation parameters
			// ============================

			this.animating = false;
			this.lastFrameTime = Date.now();

		}
		Exp3DScreen.prototype = Object.create( C.ExplainScreen.prototype );

		/**
		 * Reisze canvas & engine dimentions to fit host
		 */
		Exp3DScreen.prototype.onResize = function(w,h) {

			// Change camera aspect
			this.camera.aspect = w / h;
			this.camera.updateProjectionMatrix();

			// Get window half-dimentions
			this.half.x = w/2;
			this.half.y = h/2;

			// Resize renderer
			this.renderer.setSize( w, h );

			// Update shader uniforms
			var bluriness = 4;			 
			this.effectFXAA.uniforms[ 'resolution' ].value.set( 1 / w, 1 / h );
			this.effectHBlur.uniforms[ 'h' ].value = bluriness / w;
			this.effectVBlur.uniforms[ 'v' ].value = bluriness / h;

			// Reset composer
			this.composer.reset();

		}

		/**
		 * Animation function
		 */
		Exp3DScreen.prototype.animate = function() {

			// Stop animation if we are not animating
			if (!this.animating)
				return;

			// Request animation
			requestAnimationFrame( this.animate.bind(this) );

			// Render
			this.render();

		}

		/**
		 * Render the scene
		 */
		Exp3DScreen.prototype.render = function() {

			// Initialize camera
			/*
			this.camera.position.x += ( this.mouse.x - this.camera.position.x ) * 0.05;
			this.camera.position.y += ( - this.mouse.y - this.camera.position.y ) * 0.05;
			this.camera.lookAt(
					new THREE.Vector3(
							this.activeScene.cameraFocus.x,
							this.activeScene.cameraFocus.y,
							0
						)
				);
			*/

			// Calculate time delta
			var lastFrameTime = Date.now(),
				delta = lastFrameTime - this.lastFrameTime;
				this.lastFrameTime = lastFrameTime;

			// Update scene
			this.activeScene.update(delta);

			// Get suggested camera position
			var camPos = this.activeScene.camera.clone(),
				camTarget = this.activeScene.cameraTarget.clone();

			// Calculate horizontal and vertical camera vectors
			var camZ = camTarget.clone().sub( camPos ),
				camV = new THREE.Vector3( 0, 1, 0),
				camH = camZ.clone(),
				matrix = new THREE.Matrix4().makeRotationAxis( camV, Math.PI / 2 );
				camH.applyMatrix4( matrix );

			// Rock camera along the H/V axes
			var rockDivider = 5,
				rockLength = camZ.length()/rockDivider;
			camV.normalize().multiplyScalar( this.mouse.y * rockLength );
			camH.normalize().multiplyScalar( this.mouse.x * rockLength );

			// 
			camPos.add(camH).add(camV);

			// Update camera
			this.camera.position.set( camPos.x, camPos.y, camPos.z );
			this.camera.lookAt( camTarget );

			// Render
			this.renderer.clear();
			//this.composer.render();
			this.renderer.render( 
				this.mainScene, 
				this.camera 
			);

		}

		/**
		 * Start animation when it's about to be shown
		 */
		Exp3DScreen.prototype.onWillShow = function(cb_ready) {
			this.animating = true;
			this.animate();
			cb_ready();
		}

		/**
		 * Stop animation when hidden
		 */
		Exp3DScreen.prototype.onHidden = function() {
			this.animating = false;
		}


		R.registerComponent('screen_explain', Exp3DScreen);

	}

);