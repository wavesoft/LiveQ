
define(["three", "core/registry", "core/components", "vas-3d/util/fluctuation"], 

	function(THREE, R, C, Fluctuation) {

		var Engine = { };

		Engine.Scene = function() {
			this.scene = new THREE.Object3D();
			this.update = function(delta) { };
		};

		Engine.BasicScene = function() {
			this.scene = new THREE.Object3D();

			var flucRadius = 10;

			// Create cluctuation mesh
			var fluc = new Fluctuation( flucRadius, 4, 4.0, 10 );
			this.scene.add(fluc);


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
			//this.scene.add(this.m1);
			//this.scene.add(this.m2);
			//this.scene.add(this.m3);

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

				fluc.update(delta);


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
			this.camera.position.z = 50;

			// Scene
			this.scene = new THREE.Scene();

			// Initialize renderer
			this.renderer = new THREE.WebGLRenderer( { antialias: true } );
			this.renderer.setClearColor( 0xffffff );

			this.container.append(this.renderer.domElement);

			// Lighting
			light = new THREE.DirectionalLight( 0xffffff );
			light.position.set( 0, 0, 1 );
			this.scene.add( light );

			// ============================
			//  Put some graphics 
			// ============================

			this.activeScene = new Engine.BasicScene();
			this.scene.add(this.activeScene.scene);
			console.log("Scene:",this.activeScene);

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
			this.camera.lookAt( this.scene.position );

			// Update scene
			var lastFrameTime = Date.now(),
				delta = lastFrameTime - this.lastFrameTime;
			this.lastFrameTime = lastFrameTime;
			this.activeScene.update(delta);

			// Render
			this.renderer.render( 
				this.scene, 
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


		R.registerComponent('explain_screen', Exp3DScreen);

	}

);