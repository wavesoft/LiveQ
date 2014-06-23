
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
			this.bindTimeUpdates = function( animator ) {
				for (var k in definition) {
					var v = definition[k];

					// If material contains 'fSceneTime' uniform, register an update callback
					if ((v.uniforms !== undefined) && (v.uniforms['fSceneTime'] !== undefined) && (v.uniforms['fSceneTime'].type == 'f')) {
						console.log("Will: ",v);
						animator.onUpdate(function(cTime) {
							v.uniforms['fSceneTime'].value = cTime;
						});
					}

				}
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

					// Bind automatic 'fSceneTime' uniform updates on the materials
					Mat.bindTimeUpdates(animatorRef);

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
			this.renderer.autoClear = true;
			this.renderer.sortObjects = true;


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
			this.mainScene.fog = new THREE.FogExp2( 0xffffff, 0.00025 );

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
		 * Focus on a particular process
		 */
		Exp3DScreen.prototype.focusProcess = function(procName) {
			anim0.start();
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
			camV.normalize().multiplyScalar( this.mouse.y * rockLength / 20 );
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


		R.registerComponent('explain.physics', Exp3DScreen);

	}

);