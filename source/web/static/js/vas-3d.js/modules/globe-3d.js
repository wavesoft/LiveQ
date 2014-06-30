
define(

	[ "three", "three-extras", "core/registry", "core/base/component" ], 

	function(THREE, THREEx, R, Component ) {

		/**
		 * Prepare the globe component
		 */
		var Globe3D = function(hostDOM) {
			Component.call(this, hostDOM);

			this.animating = true;
			this.half = {x:0, y:0};
			window.d = this;

			// ============================
			//  Initialize 3D System
			// ============================

			// Camera
			this.camera = new THREE.PerspectiveCamera( 20, 640/480, 1, 10000 );
			this.camera.position.z = 375;

			// Scene
			this.scene = new THREE.Scene();

			// Initialize renderer
			this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
			this.hostDOM.append(this.renderer.domElement);

			// ============================
			//  Prepare lighting
			// ============================

			this.light = new THREE.AmbientLight( 0xffffff );
			this.light.position.set( 500, 500, 500 );
			this.scene.add( this.light );

			// ============================
			//  Prepare globe
			// ============================

			// Prepare globe host
			this.globeRadius = 50;
			this.globeHost = new THREE.Object3D();
			this.scene.add( this.globeHost );

			// Prepare geometry
			var globeGeom = new THREE.SphereGeometry( this.globeRadius, 30, 20 ),
				globeMat = new THREE.MeshBasicMaterial({
					color: 0xffffff,
					wireframe: false,
					transparent: true,
					side: THREE.DoubleSide,
					map: THREE.ImageUtils.loadTexture('static/img/earth.png')
				});

			this.sphere = new THREE.Mesh( globeGeom, globeMat );
			this.sphere.position.set( 0,0,0 );

			// Store globeHost
			this.globeHost.add(this.sphere);

			// ============================
			//  Prepare pins
			// ============================

			this.pinGeometry = new THREE.SphereGeometry( 2 );
			this.pinMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
			this.pinLineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
			this.pins = [];

			this.addPin( 40.547200, 23.049316 );
			this.addPin( 43.197167, 12.128906 );
			this.addPin( -26.588527, -70.664063 );
			for (var i=0; i<10; i++) {
				this.addPin( Math.random() * 180 - 90, Math.random() * 180 );
			}

		};

		Globe3D.prototype = Object.create( Component.prototype );

		/**
		 * Add a pin
		 */
		Globe3D.prototype.addPin = function( lat, lng, height ) {

			// Calculate height
			var h  = height || 6;

			// Calibration for the texture problems
			lng -= 5;

			// Prepare point
			var mesh = new THREE.Mesh( this.pinGeometry, this.pinMaterial );
			mesh.rotateZ( lat * Math.PI / 180 );
			mesh.rotateY( lng * Math.PI / 180 );
			mesh.translateX( this.globeRadius + h );
			
			// Prepare unit line
			var lineGeom = new THREE.Geometry();
		    lineGeom.vertices.push(new THREE.Vector3(0, 0, 0));
		    lineGeom.vertices.push(new THREE.Vector3(h, 0, 0));
		    var line = new THREE.Line( lineGeom, this.pinLineMaterial );
			line.rotateZ( lat * Math.PI / 180 );
			line.rotateY( lng * Math.PI / 180 );
			line.translateX( this.globeRadius );

			this.globeHost.add( mesh );
			this.globeHost.add( line );
			this.pins.push( mesh );
		}

		/**
		 * Animation loop
		 */
		Globe3D.prototype.animate = function() {

			// Stop animation if we are not animating
			if (!this.animating)
				return;

			// Request animation
			requestAnimationFrame( this.animate.bind(this) );

			// Render
			this.render();

		};

		/**
		 * 
		 */
		Globe3D.prototype.render = function() {

			this.globeHost.rotateY(0.01);

			this.renderer.render( 
				this.scene, 
				this.camera 
			);

		};

		/**
		 * Reisze canvas & engine dimentions to fit host
		 */
		Globe3D.prototype.onResize = function(w,h) {

			// Change camera aspect
			this.camera.aspect = w / h;
			this.camera.updateProjectionMatrix();

			// Get window half-dimentions
			this.half.x = w/2;
			this.half.y = h/2;

			// Resize renderer
			this.renderer.setSize( w, h );

		};

		/**
		 * This function is called when the component is hidden
		 */
		Globe3D.prototype.onHidden = function() {
			this.animating = false;
		};

		/**
		 * This function is called when the component is about to be shown
		 */
		Globe3D.prototype.onWillShow = function(cb) {
			this.animating = true;
			this.animate();
			cb();
		};

		R.registerComponent( 'widget.globe3d', Globe3D, 1 );

	}

);
