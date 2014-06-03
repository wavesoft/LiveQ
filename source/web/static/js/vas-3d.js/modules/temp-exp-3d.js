
define(

	[ "three", "three-postprocessing", 
	  "core/util/animator", "core/registry", "core/components",
	  "vas-3d/util/fluctuation", "vas-3d/util/feyman",
	  "vas-3d/scenes/fractal-test"
	], 

	function(THREE, THREEpp, Animator, R, C, Fluctuation, FeymanDiagram, FractalScene ) {

		var Engine = { };


		Engine.Scene = function() {
			this.mainScene = new THREE.Object3D();
			this.glowScene = new THREE.Object3D();

			this.cameraFocus = new THREE.Vector3();

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
			var part0 = new THREE.Mesh( geom0, mat0 ),
				part1 = new THREE.Mesh( geom1, mat1 ),
				part2 = new THREE.Mesh( geom2, mat2 ),
				part3 = new THREE.Mesh( geom2, mat3 ),
				fluc0 = new Fluctuation({ radius: 80, blobs: 4, detail: 10 }),
				fluc1 = new Fluctuation({ radius: 20, blobs: 4, detail: 10 });

			// Initialize animation
			var anim0 = new Animator({
				duration: 10000,
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
			f0k0.set(-600,    0, 0);
			f0k1.set(-400,    0, 0);
			f0k2.set(-200, -100, 0);
			f0k3.set(-200,  100, 0);
			f0k4.set(-100, -200, 0);
			f0k5.set(   0,  0, 0);

			// Put everything on scene
			fluc0.renderDepth = 0.5;
			this.mainScene.add(fluc0);
			this.glowScene.add(fluc0);
			fluc1.renderDepth = 0.5;
			this.mainScene.add(fluc1);
			this.glowScene.add(fluc1);
			part0.renderDepth = 0.0;
			this.mainScene.add(part0);
			part1.renderDepth = 0.1;
			this.mainScene.add(part1);
			part2.renderDepth = 0;
			this.mainScene.add(part2);
			part3.renderDepth = 0;
			this.mainScene.add(part3);
			feyman0.renderDepth = 1;
			this.mainScene.add(feyman0);

			// Bind properties to animator
			anim0.bind( 'part0.x', part0.position, 'x' );
			anim0.bind( 'part0.y', part0.position, 'y' );
			anim0.bind( 'part0.a', mat0, 'opacity' );
			anim0.bind( 'part0.s', function(v,v){ part0.scale.set(v,v,v); });

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
			anim0.bind( 'fluc0.a', fluc0.material, 'opacity' );
			anim0.bind( 'fluc0.s', function(v,c){ fluc0.scale.set(v,v,v); });

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
				fluc0.setPhase(p);
				fluc1.setPhase(p);
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


			this.renderGlow.clear = true;
			this.renderMain.clear = false;
			//this.renderMain.needsSwap = true;
			//this.renderMain.needsSwap = true;
			this.effectCopy.renderToScreen = true;
			this.effectVBlur.renderToScreen = true;

			this.composer.addPass( this.renderGlow );
			this.composer.addPass( this.effectHBlur );
			this.composer.addPass( this.effectVBlur );

			this.composer.addPass( this.renderMain );
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

			this.activeScene = new Engine.Scene();
			this.mainScene.add(this.activeScene.mainScene);
			this.glowScene.add(this.activeScene.glowScene)

			// ============================
			//  Bind mouse movement
			// ============================

			$(this.container).mousemove((function(e) {
				this.mouse.x = ( e.offsetX - this.half.x );
				this.mouse.y = ( e.offsetY - this.half.y );
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
			this.camera.position.x += ( this.mouse.x - this.camera.position.x ) * 0.05;
			this.camera.position.y += ( - this.mouse.y - this.camera.position.y ) * 0.05;
			this.camera.lookAt(
					new THREE.Vector3(
							this.activeScene.cameraFocus.x,
							this.activeScene.cameraFocus.y,
							0
						)
				);

			// Update scene
			var lastFrameTime = Date.now(),
				delta = lastFrameTime - this.lastFrameTime;
			this.lastFrameTime = lastFrameTime;
			this.activeScene.update(delta);
			this.camera.position.z = this.activeScene.cameraFocus.z;

			// Render
			this.renderer.clear();
			this.composer.render();
			/*
			this.renderer.render( 
				this.mainScene, 
				this.camera 
			);
			*/

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