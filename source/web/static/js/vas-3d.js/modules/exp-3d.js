
define(["three", "core/registry", "core/components"], function(THREE, R, C) {

	var Engine = { };

	Engine.Scene = function() {
		this.scene = new THREE.Object3D();
		this.update = function(delta) { };
	};

	Engine.BasicScene = function() {
		this.scene = new THREE.Object3D();

		// Place the two balls
		var geom1 = new THREE.SphereGeometry(50, 10, 10),
			mat1 = new THREE.MeshPhongMaterial({
				color: 0xff0000,
				transparent: true,
				opacity: 1
			}),
			mat2 = new THREE.MeshPhongMaterial({
				color: 0xffff00,
				transparent: true,
				opacity: 1
			});

		// Setup scene
		this.m1 = new THREE.Mesh(geom1, mat1);
		this.m2 = new THREE.Mesh(geom1, mat2);
		this.scene.add(this.m1);
		this.scene.add(this.m2);

		var dist = 200;
		this.m1.position.x = -dist;
		this.m2.position.x = dist;

		// Update
		this.update = (function() {
			dist -= dist/50.0;
			if (dist <= 50.0) {
				var alpha = dist / 50.0;
				console.log(alpha);
				mat1.opacity = alpha*0.9+0.1;
				mat1.needsUpdate = true;
				mat2.opacity = alpha*0.9+0.1;
				mat2.needsUpdate = true;

			}
			this.m1.position.x = -dist-50;
			this.m2.position.x = dist+50;

		}).bind(this);

	}


	Engine.Particles = function(container) {

		// Setup variables
		this.container = $(container);
		this.mouse = new THREE.Vector2();
		this.half = new THREE.Vector2();

		// ============================
		//  Initialize 3D System
		// ============================

		// Camera
		this.camera = new THREE.PerspectiveCamera( 20, 640/480, 1, 10000 );
		this.camera.position.z = 1800;

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

		// Initial resize of the map
		this.resize();

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

		$(window).resize((function() {
			this.resize();
		}).bind(this));


		// ============================
		// Start animation loop
		// ============================

		this.animating = true;
		this.animate();
	}

	/**
	 * Reisze canvas & engine dimentions to fit host
	 */
	Engine.Particles.prototype.resize = function() {

		// Dimentions
		var w = $(this.container).width(),
			h = $(this.container).height();

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
	Engine.Particles.prototype.animate = function() {

		// Request animation
		requestAnimationFrame( this.animate.bind(this) );

		// Render
		this.render();

	}

	/**
	 * Render the scene
	 */
	Engine.Particles.prototype.render = function() {

		// Initialize camera
		this.camera.position.x += ( this.mouse.x - this.camera.position.x ) * 0.05;
		this.camera.position.y += ( - this.mouse.y - this.camera.position.y ) * 0.05;
		this.camera.lookAt( this.scene.position );

		// Update scene
		this.activeScene.update();

		// Render
		this.renderer.render( 
			this.scene, 
			this.camera 
		);

	}


	var Exp3DScreen = function() {
		C.ExplainationScreen.call(this);
		this.engine = new Engine.Particles();
	}
	Exp3DScreen.prototype = Object.create( C.ExplainationScreen );
	Exp3DScreen.prototype.getDOMElement = function() {
		return this.engine.
	};

	R.registerComponent('exp_screen', Exp3DScreen);

})